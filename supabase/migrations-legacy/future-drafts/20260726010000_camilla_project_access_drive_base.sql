-- Camilla Studio — Fase 18
-- Usuários por projeto, isolamento financeiro e base para Google Drive.
-- Migration cumulativa e idempotente. Não apaga projetos existentes.

begin;

create extension if not exists pgcrypto;

-- Perfis específicos do escritório.
do $$ begin
  create type public.camilla_app_role as enum ('admin','project_manager','collaborator','viewer');
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists camilla_role public.camilla_app_role not null default 'collaborator',
  add column if not exists active boolean not null default true,
  add column if not exists last_seen_at timestamptz;

-- Converte administradores existentes sem alterar os demais perfis.
update public.profiles
set camilla_role = case
  when role::text = 'admin' then 'admin'::public.camilla_app_role
  when role::text = 'manager' then 'project_manager'::public.camilla_app_role
  when role::text = 'viewer' then 'viewer'::public.camilla_app_role
  else coalesce(camilla_role, 'collaborator'::public.camilla_app_role)
end
where role is not null;

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'collaborator' check (member_role in ('lead','architect','collaborator','viewer')),
  is_primary boolean not null default false,
  can_edit_project boolean not null default true,
  can_manage_agenda boolean not null default true,
  can_manage_checklist boolean not null default true,
  can_manage_files boolean not null default true,
  can_comment boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(project_id,user_id)
);

create index if not exists project_members_user_idx on public.project_members(user_id);
create index if not exists project_members_project_idx on public.project_members(project_id);

-- Atribuição direta dos eventos. Eventos vinculados a um projeto continuam protegidos
-- pelas regras do projeto; eventos pessoais usam assigned_user_id.
alter table public.calendar_events
  add column if not exists assigned_user_id uuid references public.profiles(id),
  add column if not exists created_by uuid references public.profiles(id) default auth.uid(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists calendar_events_assigned_user_idx on public.calendar_events(assigned_user_id);

-- Metadados de arquitetura e sincronização do Drive.
alter table public.project_files
  add column if not exists uploaded_by uuid references public.profiles(id) default auth.uid(),
  add column if not exists updated_by uuid references public.profiles(id),
  add column if not exists drive_folder_id text,
  add column if not exists drive_parent_folder_id text,
  add column if not exists file_size bigint,
  add column if not exists revision_code text,
  add column if not exists approval_status text not null default 'development'
    check (approval_status in ('development','sent_for_review','waiting_client','approved','revision_requested','superseded')),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id),
  add column if not exists drive_modified_at timestamptz,
  add column if not exists sync_status text not null default 'linked'
    check (sync_status in ('linked','uploading','synced','missing','error')),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists project_files_drive_file_unique
  on public.project_files(drive_file_id)
  where drive_file_id is not null;
create index if not exists project_files_project_category_idx on public.project_files(project_id,category);

create table if not exists public.project_drive_folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null,
  drive_folder_id text not null,
  drive_parent_folder_id text,
  drive_url text,
  folder_name text not null,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,category),
  unique(drive_folder_id)
);

create table if not exists public.google_drive_settings (
  id boolean primary key default true check (id),
  connected boolean not null default false,
  google_account_email text,
  root_folder_id text,
  root_folder_name text not null default 'CAMILLA STUDIO',
  connected_by uuid references public.profiles(id),
  connected_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.google_drive_settings(id) values (true) on conflict (id) do nothing;

-- Tokens devem ser acessados somente por rotas de servidor com service role.
create table if not exists public.google_drive_tokens (
  id boolean primary key default true check (id),
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_type text,
  scope text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.google_drive_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  mime_type text,
  file_size bigint,
  category text not null,
  revision_code text,
  drive_folder_id text,
  resumable_url_encrypted text,
  bytes_uploaded bigint not null default 0,
  status text not null default 'created' check (status in ('created','uploading','completed','failed','cancelled')),
  error_message text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id),
  action_type text not null,
  target_type text not null,
  target_id text,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Funções auxiliares de segurança.
create or replace function public.current_camilla_role()
returns public.camilla_app_role
language sql stable security definer set search_path = public
as $$
  select coalesce((select camilla_role from public.profiles where id = auth.uid() and active), 'viewer'::public.camilla_app_role)
$$;

create or replace function public.is_camilla_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.current_camilla_role() = 'admin'::public.camilla_app_role $$;

create or replace function public.can_access_project(target_project_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.current_camilla_role() in ('admin','project_manager')
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = target_project_id and pm.user_id = auth.uid()
    )
$$;

create or replace function public.can_edit_project(target_project_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.current_camilla_role() in ('admin','project_manager')
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = target_project_id and pm.user_id = auth.uid() and pm.can_edit_project
    )
$$;

revoke all on function public.current_camilla_role() from public;
revoke all on function public.is_camilla_admin() from public;
revoke all on function public.can_access_project(uuid) from public;
revoke all on function public.can_edit_project(uuid) from public;
grant execute on function public.current_camilla_role() to authenticated;
grant execute on function public.is_camilla_admin() to authenticated;
grant execute on function public.can_access_project(uuid) to authenticated;
grant execute on function public.can_edit_project(uuid) to authenticated;

-- RLS: projetos e dados técnicos seguem a atribuição por projeto.
alter table public.project_members enable row level security;
alter table public.project_drive_folders enable row level security;
alter table public.google_drive_settings enable row level security;
alter table public.google_drive_tokens enable row level security;
alter table public.google_drive_upload_sessions enable row level security;
alter table public.admin_audit_log enable row level security;

-- Remove políticas desta migration em reaplicações.
drop policy if exists project_members_select_access on public.project_members;
drop policy if exists project_members_manage_admin on public.project_members;
create policy project_members_select_access on public.project_members for select to authenticated
using (public.is_camilla_admin() or public.current_camilla_role()='project_manager' or user_id=auth.uid());
create policy project_members_manage_admin on public.project_members for all to authenticated
using (public.is_camilla_admin() or public.current_camilla_role()='project_manager')
with check (public.is_camilla_admin() or public.current_camilla_role()='project_manager');

drop policy if exists project_drive_folders_access on public.project_drive_folders;
create policy project_drive_folders_access on public.project_drive_folders for select to authenticated
using (public.can_access_project(project_id));
drop policy if exists project_drive_folders_manage on public.project_drive_folders;
create policy project_drive_folders_manage on public.project_drive_folders for all to authenticated
using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

drop policy if exists drive_settings_admin_read on public.google_drive_settings;
create policy drive_settings_admin_read on public.google_drive_settings for select to authenticated
using (public.current_camilla_role() in ('admin','project_manager'));
drop policy if exists drive_settings_admin_manage on public.google_drive_settings;
create policy drive_settings_admin_manage on public.google_drive_settings for all to authenticated
using (public.is_camilla_admin()) with check (public.is_camilla_admin());

-- Nenhuma política para google_drive_tokens: somente service role ignora RLS.

drop policy if exists drive_upload_sessions_owner on public.google_drive_upload_sessions;
create policy drive_upload_sessions_owner on public.google_drive_upload_sessions for select to authenticated
using (user_id=auth.uid() and public.can_access_project(project_id));
drop policy if exists drive_upload_sessions_create on public.google_drive_upload_sessions;
create policy drive_upload_sessions_create on public.google_drive_upload_sessions for insert to authenticated
with check (user_id=auth.uid() and public.can_edit_project(project_id));
drop policy if exists drive_upload_sessions_update on public.google_drive_upload_sessions;
create policy drive_upload_sessions_update on public.google_drive_upload_sessions for update to authenticated
using (user_id=auth.uid() and public.can_edit_project(project_id))
with check (user_id=auth.uid() and public.can_edit_project(project_id));

drop policy if exists audit_admin_read on public.admin_audit_log;
create policy audit_admin_read on public.admin_audit_log for select to authenticated using (public.is_camilla_admin());

-- Políticas das tabelas existentes. As antigas são removidas para impedir que uma
-- política permissiva permita acesso global aos colaboradores.
alter table public.projects enable row level security;
drop policy if exists projects_read_authenticated on public.projects;
drop policy if exists projects_select_access on public.projects;
create policy projects_select_access on public.projects for select to authenticated
using (public.can_access_project(id));
drop policy if exists projects_insert_leadership on public.projects;
create policy projects_insert_leadership on public.projects for insert to authenticated
with check (public.current_camilla_role() in ('admin','project_manager'));
drop policy if exists projects_update_access on public.projects;
create policy projects_update_access on public.projects for update to authenticated
using (public.can_edit_project(id)) with check (public.can_edit_project(id));
drop policy if exists projects_delete_admin on public.projects;
create policy projects_delete_admin on public.projects for delete to authenticated using (public.is_camilla_admin());

-- Tabelas filhas protegidas por project_id.
do $$
declare t text;
begin
  foreach t in array array['project_files','project_comments','project_history','project_checklist_items','project_revisions'] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security',t);
      execute format('drop policy if exists %I on public.%I',t||'_select_access',t);
      execute format('create policy %I on public.%I for select to authenticated using (public.can_access_project(project_id))',t||'_select_access',t);
      if t <> 'project_history' then
        execute format('drop policy if exists %I on public.%I',t||'_write_access',t);
        execute format('create policy %I on public.%I for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id))',t||'_write_access',t);
      end if;
    end if;
  end loop;
end $$;

-- Agenda: gestores veem tudo; colaborador vê eventos atribuídos ou de projetos atribuídos.
alter table public.calendar_events enable row level security;
drop policy if exists calendar_events_select_access on public.calendar_events;
create policy calendar_events_select_access on public.calendar_events for select to authenticated
using (
  public.current_camilla_role() in ('admin','project_manager')
  or assigned_user_id=auth.uid()
  or (project_id is not null and public.can_access_project(project_id))
);
drop policy if exists calendar_events_write_access on public.calendar_events;
create policy calendar_events_write_access on public.calendar_events for all to authenticated
using (
  public.current_camilla_role() in ('admin','project_manager')
  or assigned_user_id=auth.uid()
  or (project_id is not null and public.can_edit_project(project_id))
)
with check (
  public.current_camilla_role() in ('admin','project_manager')
  or assigned_user_id=auth.uid()
  or (project_id is not null and public.can_edit_project(project_id))
);

-- Financeiro: somente administradores e gerentes. Colaboradores não recebem linhas.
do $$
begin
  if to_regclass('public.project_financial_entries') is not null then
    alter table public.project_financial_entries enable row level security;
    drop policy if exists finance_select_leadership on public.project_financial_entries;
    create policy finance_select_leadership on public.project_financial_entries for select to authenticated
    using (public.current_camilla_role() in ('admin','project_manager'));
    drop policy if exists finance_write_leadership on public.project_financial_entries;
    create policy finance_write_leadership on public.project_financial_entries for all to authenticated
    using (public.current_camilla_role() in ('admin','project_manager'))
    with check (public.current_camilla_role() in ('admin','project_manager'));
  end if;
end $$;

commit;
