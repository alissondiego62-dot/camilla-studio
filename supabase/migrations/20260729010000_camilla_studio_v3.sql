-- Camilla Studio 3.0 — complementos funcionais e segurança.
-- Migration aditiva e idempotente. Aplicar após backup e após 20260728010000.
begin;

create extension if not exists pgcrypto;

-- Cadastros auxiliares financeiros
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  environment text not null default 'professional' check (environment in ('personal','professional')),
  name text not null,
  document text,
  phone text,
  email text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_cards (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('personal','professional')),
  name text not null,
  brand text,
  closing_day smallint check (closing_day between 1 and 31),
  due_day smallint check (due_day between 1 and 31),
  limit_amount numeric(14,2),
  account_id uuid references public.financial_accounts(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_templates (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('personal','professional')),
  entry_type text not null check (entry_type in ('income','expense')),
  name text not null,
  description text,
  category_id uuid references public.financial_categories(id) on delete set null,
  suggested_amount numeric(14,2),
  recurrence text,
  account_id uuid references public.financial_accounts(id) on delete set null,
  card_id uuid references public.financial_cards(id) on delete set null,
  cost_center text,
  payment_method text,
  due_day smallint check (due_day between 1 and 31),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.financial_entries
  add column if not exists card_id uuid references public.financial_cards(id) on delete set null,
  add column if not exists supplier_id_v3 uuid references public.suppliers(id) on delete set null,
  add column if not exists recurrence_group_id uuid,
  add column if not exists approval_status text not null default 'approved',
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz;

-- Comentários e anexos de atividades
create table if not exists public.activity_comments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.project_activities(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  comment text not null,
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table if not exists public.activity_files (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.project_activities(id) on delete cascade,
  name text not null,
  drive_url text not null,
  drive_file_id text,
  mime_type text,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- Observações de leitura de comentários e arquivos
create table if not exists public.record_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  record_id text not null,
  viewed_at timestamptz not null default now(),
  unique(user_id,module,record_id)
);

-- Preferências e versões do sistema
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  notification_type text not null,
  enabled boolean not null default true,
  advance_minutes integer,
  unique(user_id,module,notification_type)
);

create table if not exists public.system_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  released_at timestamptz not null default now(),
  notes text not null,
  environment text not null default 'production',
  created_by uuid references auth.users(id) on delete set null
);
insert into public.system_versions(version,notes)
values ('3.0.0','Identidade Camilla Studio, páginas modulares, Kanban, atividades, agenda, clientes, financeiro, arquivos, relatórios, usuários e configurações.')
on conflict (version) do update set notes=excluded.notes;

-- Índices
create index if not exists activity_comments_activity_idx on public.activity_comments(activity_id,created_at desc);
create index if not exists activity_files_activity_idx on public.activity_files(activity_id,created_at desc);
create index if not exists financial_entries_environment_type_date_idx on public.financial_entries(environment,entry_type,competence_date desc);
create index if not exists suppliers_environment_name_idx on public.suppliers(environment,name);

-- RLS
alter table public.suppliers enable row level security;
alter table public.financial_cards enable row level security;
alter table public.financial_templates enable row level security;
alter table public.activity_comments enable row level security;
alter table public.activity_files enable row level security;
alter table public.record_views enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.system_versions enable row level security;

-- Helper conservador: considera funções existentes, quando presentes.
create or replace function public.camilla_can_view_finance(target_environment text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.active=true and (
      p.camilla_role in ('admin','owner') or
      (target_environment='professional' and p.camilla_role in ('project_manager','finance'))
    )
  );
$$;
revoke all on function public.camilla_can_view_finance(text) from public;
grant execute on function public.camilla_can_view_finance(text) to authenticated;

-- Políticas idempotentes
DO $$ BEGIN
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='activity_comments' and policyname='activity_comments_project_access') then
    create policy activity_comments_project_access on public.activity_comments for all to authenticated
    using (exists(select 1 from public.project_activities a where a.id=activity_id and public.can_access_project(a.project_id)))
    with check (exists(select 1 from public.project_activities a where a.id=activity_id and public.can_access_project(a.project_id)));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='activity_files' and policyname='activity_files_project_access') then
    create policy activity_files_project_access on public.activity_files for all to authenticated
    using (exists(select 1 from public.project_activities a where a.id=activity_id and public.can_access_project(a.project_id)))
    with check (exists(select 1 from public.project_activities a where a.id=activity_id and public.can_access_project(a.project_id)));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='record_views' and policyname='record_views_own') then
    create policy record_views_own on public.record_views for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='notification_preferences' and policyname='notification_preferences_own') then
    create policy notification_preferences_own on public.notification_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='system_versions' and policyname='system_versions_read') then
    create policy system_versions_read on public.system_versions for select to authenticated using(true);
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='suppliers' and policyname='suppliers_finance_access') then
    create policy suppliers_finance_access on public.suppliers for all to authenticated using(public.camilla_can_view_finance(environment)) with check(public.camilla_can_view_finance(environment));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='financial_cards' and policyname='financial_cards_finance_access') then
    create policy financial_cards_finance_access on public.financial_cards for all to authenticated using(public.camilla_can_view_finance(environment)) with check(public.camilla_can_view_finance(environment));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='financial_templates' and policyname='financial_templates_finance_access') then
    create policy financial_templates_finance_access on public.financial_templates for all to authenticated using(public.camilla_can_view_finance(environment)) with check(public.camilla_can_view_finance(environment));
  end if;
END $$;

commit;
