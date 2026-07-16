-- Camilla Studio: núcleo integrado, seguro e compatível com dados existentes.
-- Migration aditiva. Não exclui tabelas nem colunas de produção.
begin;

-- 1. Perfis e permissões granulares
alter table if exists public.profiles
  add column if not exists team_name text,
  add column if not exists blocked_at timestamptz,
  add column if not exists last_access_at timestamptz,
  add column if not exists session_revoked_at timestamptz;

alter table if exists public.profiles drop constraint if exists profiles_camilla_role_check;
alter table if exists public.profiles add constraint profiles_camilla_role_check
  check (camilla_role in ('admin','owner','project_manager','finance','architect','collaborator','assistant','viewer'));

create table if not exists public.permission_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_system boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_permissions (
  id uuid primary key default gen_random_uuid(),
  permission_profile_id uuid not null references public.permission_profiles(id) on delete cascade,
  module text not null,
  action text not null,
  allowed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(permission_profile_id,module,action)
);

alter table if exists public.profiles add column if not exists permission_profile_id uuid references public.permission_profiles(id) on delete set null;

-- 2. Clientes completos
alter table if exists public.clients
  add column if not exists legal_name text,
  add column if not exists trade_name text,
  add column if not exists person_type text not null default 'individual',
  add column if not exists cpf text,
  add column if not exists cnpj text,
  add column if not exists state_registration text,
  add column if not exists municipal_registration text,
  add column if not exists whatsapp text,
  add column if not exists additional_phones text[] not null default '{}',
  add column if not exists additional_emails text[] not null default '{}',
  add column if not exists website text,
  add column if not exists postal_code text,
  add column if not exists address text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists neighborhood text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists primary_contact text,
  add column if not exists contact_role text,
  add column if not exists internal_responsible_id uuid references auth.users(id) on delete set null,
  add column if not exists source text,
  add column if not exists segment text,
  add column if not exists relationship_status text not null default 'active',
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists clients_cpf_unique on public.clients(cpf) where cpf is not null and cpf <> '';
create unique index if not exists clients_cnpj_unique on public.clients(cnpj) where cnpj is not null and cnpj <> '';
create index if not exists clients_relationship_status_idx on public.clients(relationship_status, archived_at);

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  note_type text not null default 'general',
  content text not null,
  important boolean not null default false,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Projetos, prazos e miniatura
alter table if exists public.projects
  add column if not exists thumbnail_url text,
  add column if not exists thumbnail_file_id uuid,
  add column if not exists archived_at timestamptz;

update public.projects set stage = 'revision' where stage = 'construction';
update public.projects set stage = 'briefing_preliminary' where stage is null;

create table if not exists public.project_deadlines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  deadline_type text not null,
  title text not null,
  description text,
  starts_at timestamptz,
  due_at timestamptz not null,
  is_main boolean not null default false,
  completed_at timestamptz,
  activity_id uuid,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_deadlines_project_due_idx on public.project_deadlines(project_id,due_at);
create unique index if not exists project_deadlines_one_main_idx on public.project_deadlines(project_id) where is_main;

-- 4. Checklists imutáveis por projeto
create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stage text not null,
  project_type text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates(id) on delete cascade,
  section text,
  title text not null,
  required boolean not null default false,
  position integer not null default 0,
  active boolean not null default true
);
alter table if exists public.project_checklist_items
  add column if not exists source_template_id uuid references public.checklist_templates(id) on delete set null,
  add column if not exists required boolean not null default false,
  add column if not exists responsible_user_id uuid references auth.users(id) on delete set null,
  add column if not exists started_at timestamptz;

-- 5. Atividades Notion-like e integração de agenda
alter table if exists public.project_activities
  add column if not exists status text not null default 'not_started',
  add column if not exists notes jsonb not null default '[]'::jsonb,
  add column if not exists participants uuid[] not null default '{}',
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists all_day boolean not null default false,
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists stage text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists progress smallint not null default 0 check (progress between 0 and 100),
  add column if not exists archived_at timestamptz,
  add column if not exists last_edited_by uuid references auth.users(id) on delete set null;
create index if not exists project_activities_project_status_idx on public.project_activities(project_id,status,archived_at);
create index if not exists project_activities_responsible_due_idx on public.project_activities(responsible_user_id,due_date);

alter table if exists public.calendar_events
  add column if not exists activity_id uuid references public.project_activities(id) on delete cascade,
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists responsible_user_id uuid references auth.users(id) on delete set null,
  add column if not exists all_day boolean not null default false,
  add column if not exists status text not null default 'scheduled';
create unique index if not exists calendar_events_activity_unique on public.calendar_events(activity_id) where activity_id is not null;

-- 6. Notificações e histórico central
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  module text not null,
  record_id text,
  title text not null,
  message text,
  link text,
  read_at timestamptz,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists user_notifications_unread_idx on public.user_notifications(recipient_user_id,created_at desc) where read_at is null;

create table if not exists public.audit_history (
  id bigint generated by default as identity primary key,
  author_id uuid references auth.users(id) on delete set null,
  module text not null,
  action_type text not null,
  record_type text not null,
  record_id text,
  description text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_history_record_idx on public.audit_history(record_type,record_id,created_at desc);

-- 7. Financeiro pessoal e profissional com precisão monetária
create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('personal','professional')),
  name text not null,
  account_type text not null default 'bank',
  institution text,
  opening_balance numeric(14,2) not null default 0,
  active boolean not null default true,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.financial_categories (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('personal','professional')),
  entry_type text not null check (entry_type in ('income','expense')),
  name text not null,
  parent_id uuid references public.financial_categories(id) on delete set null,
  active boolean not null default true,
  unique(environment,entry_type,name,parent_id)
);
create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('personal','professional')),
  entry_type text not null check (entry_type in ('income','expense','transfer','contribution','withdrawal','pro_labore','profit_distribution')),
  description text not null,
  category_id uuid references public.financial_categories(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  competence_date date not null,
  due_date date,
  settled_at timestamptz,
  status text not null default 'pending',
  payment_method text,
  account_id uuid references public.financial_accounts(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  supplier_id uuid,
  project_id uuid references public.projects(id) on delete set null,
  cost_center text,
  installment_number integer,
  installment_total integer,
  document_number text,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  settled_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists financial_entries_environment_due_idx on public.financial_entries(environment,due_date,status);
create index if not exists financial_entries_project_idx on public.financial_entries(project_id,competence_date);

create table if not exists public.financial_settlements (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.financial_entries(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  settled_at timestamptz not null,
  account_id uuid references public.financial_accounts(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- 8. RLS básica e segura para novas estruturas
alter table public.permission_profiles enable row level security;
alter table public.profile_permissions enable row level security;
alter table public.client_notes enable row level security;
alter table public.project_deadlines enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_template_items enable row level security;
alter table public.user_notifications enable row level security;
alter table public.audit_history enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.financial_categories enable row level security;
alter table public.financial_entries enable row level security;
alter table public.financial_settlements enable row level security;

create or replace function public.current_camilla_role()
returns text language sql stable security definer set search_path=public
as $$ select coalesce((select camilla_role from public.profiles where id=auth.uid() and active=true),'viewer') $$;

create or replace function public.can_view_finance(finance_environment text)
returns boolean language sql stable security definer set search_path=public
as $$
  select case
    when public.current_camilla_role() in ('admin','owner') then true
    when finance_environment='professional' and public.current_camilla_role() in ('project_manager','finance') then true
    else false
  end
$$;

create policy permission_profiles_admin on public.permission_profiles for all to authenticated
using (public.current_camilla_role() in ('admin','owner')) with check (public.current_camilla_role() in ('admin','owner'));
create policy profile_permissions_admin on public.profile_permissions for all to authenticated
using (public.current_camilla_role() in ('admin','owner')) with check (public.current_camilla_role() in ('admin','owner'));

create policy notifications_own_select on public.user_notifications for select to authenticated using (recipient_user_id=auth.uid());
create policy notifications_own_update on public.user_notifications for update to authenticated using (recipient_user_id=auth.uid()) with check (recipient_user_id=auth.uid());

create policy audit_history_access on public.audit_history for select to authenticated
using (public.current_camilla_role() in ('admin','owner','project_manager'));

create policy finance_accounts_access on public.financial_accounts for all to authenticated
using (public.can_view_finance(environment)) with check (public.can_view_finance(environment));
create policy finance_categories_access on public.financial_categories for all to authenticated
using (public.can_view_finance(environment)) with check (public.can_view_finance(environment));
create policy finance_entries_access on public.financial_entries for all to authenticated
using (public.can_view_finance(environment)) with check (public.can_view_finance(environment));
create policy finance_settlements_access on public.financial_settlements for all to authenticated
using (exists(select 1 from public.financial_entries e where e.id=entry_id and public.can_view_finance(e.environment)))
with check (exists(select 1 from public.financial_entries e where e.id=entry_id and public.can_view_finance(e.environment)));

create policy client_notes_project_access on public.client_notes for all to authenticated
using (public.current_camilla_role() in ('admin','owner','project_manager','architect','assistant') or author_id=auth.uid())
with check (public.current_camilla_role() in ('admin','owner','project_manager','architect','assistant') or author_id=auth.uid());

create policy project_deadlines_access on public.project_deadlines for all to authenticated
using (public.can_access_project(project_id)) with check (public.can_edit_project(project_id));

create policy checklist_templates_read on public.checklist_templates for select to authenticated using (true);
create policy checklist_templates_admin on public.checklist_templates for all to authenticated
using (public.current_camilla_role() in ('admin','owner','project_manager')) with check (public.current_camilla_role() in ('admin','owner','project_manager'));
create policy checklist_template_items_read on public.checklist_template_items for select to authenticated using (true);
create policy checklist_template_items_admin on public.checklist_template_items for all to authenticated
using (public.current_camilla_role() in ('admin','owner','project_manager')) with check (public.current_camilla_role() in ('admin','owner','project_manager'));

commit;
