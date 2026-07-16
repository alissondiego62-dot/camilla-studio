begin;

create table if not exists public.project_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  parent_id uuid references public.project_activities(id) on delete cascade,
  title text not null,
  description text,
  group_name text not null default 'Projetos',
  responsible_user_id uuid references auth.users(id) on delete set null,
  responsible_name text,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  due_date date,
  completed_at timestamptz,
  position integer not null default 0,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_activities enable row level security;

drop policy if exists project_activities_select_access on public.project_activities;
create policy project_activities_select_access on public.project_activities
for select to authenticated using (
  project_id is null
  or exists (select 1 from public.project_members pm where pm.project_id = project_activities.project_id and pm.user_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.camilla_role in ('admin','project_manager'))
);

drop policy if exists project_activities_write_access on public.project_activities;
create policy project_activities_write_access on public.project_activities
for all to authenticated using (
  project_id is null
  or exists (select 1 from public.project_members pm where pm.project_id = project_activities.project_id and pm.user_id = auth.uid() and pm.can_edit_project)
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.camilla_role in ('admin','project_manager'))
) with check (
  project_id is null
  or exists (select 1 from public.project_members pm where pm.project_id = project_activities.project_id and pm.user_id = auth.uid() and pm.can_edit_project)
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.camilla_role in ('admin','project_manager'))
);

alter table if exists public.project_files
  add column if not exists thumbnail_url text,
  add column if not exists thumbnail_drive_file_id text,
  add column if not exists preview_status text not null default 'pending',
  add column if not exists drive_folder_path text,
  add column if not exists sync_status text not null default 'pending',
  add column if not exists synced_at timestamptz;

alter table if exists public.projects
  add column if not exists drive_folder_id text,
  add column if not exists drive_folder_url text,
  add column if not exists drive_sync_enabled boolean not null default true,
  add column if not exists drive_last_synced_at timestamptz;

create table if not exists public.google_drive_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  google_account_email text,
  encrypted_refresh_token text,
  root_folder_id text,
  root_folder_name text not null default 'Camilla Studio — Projetos',
  sync_mode text not null default 'manual' check (sync_mode in ('manual','on_open','scheduled')),
  thumbnails_enabled boolean not null default true,
  active boolean not null default true,
  connected_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.google_drive_connections enable row level security;
drop policy if exists drive_connections_own on public.google_drive_connections;
create policy drive_connections_own on public.google_drive_connections for all to authenticated
using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.camilla_role = 'admin'))
with check (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.camilla_role = 'admin'));

commit;
