-- Camilla Studio 3.0.9 — Etapa 08: Financeiro pessoal e profissional/CNPJ
begin;

-- 0. Pré-condições seguras
DO $$
DECLARE version_ok boolean := false;
BEGIN
  IF to_regclass('public.system_versions') IS NULL THEN
    RAISE EXCEPTION 'A tabela public.system_versions não foi encontrada. Aplique as etapas anteriores no projeto Camilla correto.';
  END IF;
  EXECUTE 'select exists(select 1 from public.system_versions where version = ''3.0.8'')' INTO version_ok;
  IF NOT version_ok THEN
    RAISE EXCEPTION 'A Etapa 07 (versão 3.0.8) deve ser aplicada antes da Etapa 08.';
  END IF;
  IF to_regclass('public.financial_entries') IS NULL OR to_regclass('public.profiles') IS NULL OR to_regclass('public.permission_catalog') IS NULL THEN
    RAISE EXCEPTION 'Estruturas financeiras ou de permissões obrigatórias não foram encontradas.';
  END IF;
END $$;

create or replace function public.safe_date(value text) returns date language plpgsql immutable as $$
begin
  if nullif(trim(coalesce(value,'')),'') is null then return null; end if;
  return value::date;
exception when others then return null;
end $$;

-- 1. Permissões adicionais
insert into public.permission_catalog(module,action,module_label,action_label,supports_scope,position) values
('finance_professional','view_consolidated','Financeiro profissional','Visualizar consolidado',false,108),
('finance_professional','manage_accounts','Financeiro profissional','Gerenciar contas',false,109),
('finance_professional','manage_cards','Financeiro profissional','Gerenciar cartões',false,110),
('finance_professional','manage_categories','Financeiro profissional','Gerenciar categorias',false,111),
('finance_professional','manage_templates','Financeiro profissional','Gerenciar modelos',false,112),
('finance_professional','manage_suppliers','Financeiro profissional','Gerenciar fornecedores',false,113),
('finance_professional','manage_cost_centers','Financeiro profissional','Gerenciar centros de custo',false,114),
('finance_professional','manage_recurrence','Financeiro profissional','Gerenciar recorrências',false,115),
('finance_professional','manage_installments','Financeiro profissional','Gerenciar parcelamentos',false,116),
('finance_professional','manage_transfers','Financeiro profissional','Gerenciar transferências',false,117),
('finance_professional','approve_finance','Financeiro profissional','Aprovar operações financeiras',false,118),
('finance_professional','change_environment','Financeiro profissional','Alterar ambiente',false,119),
('finance_professional','view_audit','Financeiro profissional','Visualizar auditoria financeira',false,120),
('finance_professional','export_values','Financeiro profissional','Exportar valores',false,121),
('finance_personal','view_consolidated','Financeiro pessoal','Visualizar consolidado',false,122),
('finance_personal','manage_accounts','Financeiro pessoal','Gerenciar contas',false,123),
('finance_personal','manage_cards','Financeiro pessoal','Gerenciar cartões',false,124),
('finance_personal','manage_categories','Financeiro pessoal','Gerenciar categorias',false,125),
('finance_personal','manage_templates','Financeiro pessoal','Gerenciar modelos',false,126),
('finance_personal','manage_suppliers','Financeiro pessoal','Gerenciar fornecedores',false,127),
('finance_personal','manage_cost_centers','Financeiro pessoal','Gerenciar centros de custo',false,128),
('finance_personal','manage_recurrence','Financeiro pessoal','Gerenciar recorrências',false,129),
('finance_personal','manage_installments','Financeiro pessoal','Gerenciar parcelamentos',false,130),
('finance_personal','manage_transfers','Financeiro pessoal','Gerenciar transferências',false,131),
('finance_personal','approve_finance','Financeiro pessoal','Aprovar operações financeiras',false,132),
('finance_personal','change_environment','Financeiro pessoal','Alterar ambiente',false,133),
('finance_personal','view_audit','Financeiro pessoal','Visualizar auditoria financeira',false,134),
('finance_personal','export_values','Financeiro pessoal','Exportar valores',false,135)
on conflict(module,action) do update set module_label=excluded.module_label,action_label=excluded.action_label,supports_scope=excluded.supports_scope,position=excluded.position;

-- Proprietária recebe as ações novas dos dois ambientes. Administrador e Financeiro recebem somente o profissional.
insert into public.profile_permissions(profile_id,permission_profile_id,module,action,allowed,scope)
select p.id,p.id,c.module,c.action,true,'all'
from public.permission_profiles p join public.permission_catalog c on c.module in('finance_personal','finance_professional')
where p.code='owner' and c.action in('view_consolidated','manage_accounts','manage_cards','manage_categories','manage_templates','manage_suppliers','manage_cost_centers','manage_recurrence','manage_installments','manage_transfers','approve_finance','change_environment','view_audit','export_values')
on conflict(profile_id,module,action) do update set allowed=true,scope='all',updated_at=now();
insert into public.profile_permissions(profile_id,permission_profile_id,module,action,allowed,scope)
select p.id,p.id,'finance_professional',c.action,true,'all'
from public.permission_profiles p join public.permission_catalog c on c.module='finance_professional'
where p.code in('administrator','finance') and c.action in('view_consolidated','manage_accounts','manage_cards','manage_categories','manage_templates','manage_suppliers','manage_cost_centers','manage_recurrence','manage_installments','manage_transfers','approve_finance','change_environment','view_audit','export_values')
on conflict(profile_id,module,action) do update set allowed=true,scope='all',updated_at=now();

-- 2. Acesso explícito aos ambientes
create table if not exists public.financial_environment_access(
  id uuid primary key default gen_random_uuid(),
  environment text not null check(environment in('personal','professional')),
  owner_user_id uuid references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  access_role text not null default 'viewer' check(access_role in('viewer','editor','finance','approver','owner')),
  can_view_values boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_settle boolean not null default false,
  can_approve boolean not null default false,
  can_export boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique(environment,owner_user_id,user_id)
);
create index if not exists financial_environment_access_user_idx on public.financial_environment_access(user_id,environment) where archived_at is null;
create unique index if not exists financial_environment_access_active_unique on public.financial_environment_access(environment,coalesce(owner_user_id,'00000000-0000-0000-0000-000000000000'::uuid),user_id) where archived_at is null;

-- 3. Cadastros financeiros por ambiente
create table if not exists public.financial_accounts(
  id uuid primary key default gen_random_uuid(), environment text not null check(environment in('personal','professional')),
  owner_user_id uuid references auth.users(id) on delete cascade, name text not null, type text not null default 'bank', institution text,
  branch text, account_number_masked text, opening_balance numeric(18,2) not null default 0, opening_balance_date date not null default current_date,
  active boolean not null default true, created_by uuid references auth.users(id) on delete set null default auth.uid(), updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz, archived_by uuid references auth.users(id) on delete set null
);
create unique index if not exists financial_accounts_name_unique on public.financial_accounts(environment,coalesce(owner_user_id,'00000000-0000-0000-0000-000000000000'::uuid),lower(name)) where archived_at is null;

create table if not exists public.financial_categories(
  id uuid primary key default gen_random_uuid(), environment text not null check(environment in('personal','professional')), owner_user_id uuid references auth.users(id) on delete cascade,
  entry_type text not null check(entry_type in('income','expense')), parent_id uuid references public.financial_categories(id) on delete restrict,
  name text not null, code text, color text, purpose text, type text, active boolean not null default true, position integer not null default 0,
  created_by uuid references auth.users(id) on delete set null default auth.uid(), updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz, archived_by uuid references auth.users(id) on delete set null
);
create unique index if not exists financial_categories_name_unique on public.financial_categories(environment,coalesce(owner_user_id,'00000000-0000-0000-0000-000000000000'::uuid),entry_type,coalesce(parent_id,'00000000-0000-0000-0000-000000000000'::uuid),lower(name)) where archived_at is null;

create table if not exists public.financial_payment_methods(
  id uuid primary key default gen_random_uuid(), environment text not null check(environment in('personal','professional')), owner_user_id uuid references auth.users(id) on delete cascade,
  name text not null, type text, active boolean not null default true, position integer not null default 0,
  created_by uuid references auth.users(id) on delete set null default auth.uid(), updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz, archived_by uuid references auth.users(id) on delete set null
);
create unique index if not exists financial_payment_methods_name_unique on public.financial_payment_methods(environment,coalesce(owner_user_id,'00000000-0000-0000-0000-000000000000'::uuid),lower(name)) where archived_at is null;

create table if not exists public.financial_cost_centers(
  id uuid primary key default gen_random_uuid(), environment text not null check(environment in('personal','professional')), owner_user_id uuid references auth.users(id) on delete cascade,
  name text not null, code text, type text, active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(), updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz, archived_by uuid references auth.users(id) on delete set null
);
create unique index if not exists financial_cost_centers_name_unique on public.financial_cost_centers(environment,coalesce(owner_user_id,'00000000-0000-0000-0000-000000000000'::uuid),lower(name)) where archived_at is null;

create table if not exists public.financial_suppliers(
  id uuid primary key default gen_random_uuid(), environment text not null check(environment in('personal','professional')), owner_user_id uuid references auth.users(id) on delete cascade,
  name text not null, document text, phone text, email text, notes text, type text, active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(), updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz, archived_by uuid references auth.users(id) on delete set null
);
create index if not exists financial_suppliers_search_idx on public.financial_suppliers(environment,lower(name)) where archived_at is null;

create table if not exists public.financial_installment_groups(
  id uuid primary key default gen_random_uuid(), environment text not null check(environment in('personal','professional')), owner_user_id uuid references auth.users(id) on delete cascade,
  description text not null, total_amount numeric(18,2) not null check(total_amount>=0), installment_count integer not null check(installment_count between 2 and 360),
  first_due_date date not null, interval_type text not null default 'monthly', created_by uuid references auth.users(id) on delete set null default auth.uid(), created_at timestamptz not null default now()
);

create table if not exists public.financial_templates(
  id uuid primary key default gen_random_uuid(), environment text not null check(environment in('personal','professional')), owner_user_id uuid references auth.users(id) on delete cascade,
  name text not null, type text, entry_type text not null default 'expense' check(entry_type in('income','expense')), description text,
  category_id uuid references public.financial_categories(id) on delete set null, subcategory_id uuid references public.financial_categories(id) on delete set null,
  suggested_amount numeric(18,2), frequency text, account_id uuid references public.financial_accounts(id) on delete set null, card_id uuid,
  cost_center_id uuid references public.financial_cost_centers(id) on delete set null, payment_method_id uuid references public.financial_payment_methods(id) on delete set null,
  due_day integer check(due_day between 1 and 31), active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(), updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz, archived_by uuid references auth.users(id) on delete set null
);

create table if not exists public.financial_recurring_rules(
  id uuid primary key default gen_random_uuid(), environment text not null check(environment in('personal','professional')), owner_user_id uuid references auth.users(id) on delete cascade,
  name text not null, entry_type text not null check(entry_type in('income','expense')), description text not null,
  category_id uuid references public.financial_categories(id) on delete set null, amount numeric(18,2) not null check(amount>=0), frequency text not null check(frequency in('daily','weekly','monthly','quarterly','yearly')),
  interval_value integer not null default 1 check(interval_value between 1 and 120), starts_on date not null, ends_on date, next_generation_date date not null,
  account_id uuid references public.financial_accounts(id) on delete set null, card_id uuid, client_id uuid references public.clients(id) on delete restrict,
  supplier_id uuid references public.financial_suppliers(id) on delete set null, project_id uuid references public.projects(id) on delete restrict,
  cost_center_id uuid references public.financial_cost_centers(id) on delete set null, active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(), updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz, archived_by uuid references auth.users(id) on delete set null
);
create table if not exists public.financial_recurring_occurrences(
  id uuid primary key default gen_random_uuid(), rule_id uuid not null references public.financial_recurring_rules(id) on delete restrict,
  occurrence_date date not null, financial_entry_id uuid, created_at timestamptz not null default now(), unique(rule_id,occurrence_date)
);

create table if not exists public.financial_cards(
  id uuid primary key default gen_random_uuid(), environment text not null check(environment in('personal','professional')), owner_user_id uuid references auth.users(id) on delete cascade,
  name text not null, type text, brand text, last_four_digits text check(last_four_digits is null or last_four_digits ~ '^[0-9]{4}$'), closing_day integer check(closing_day between 1 and 31), due_day integer check(due_day between 1 and 31),
  limit_amount numeric(18,2), account_id uuid references public.financial_accounts(id) on delete set null, active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(), updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz, archived_by uuid references auth.users(id) on delete set null
);
alter table public.financial_templates drop constraint if exists financial_templates_card_id_fkey;
alter table public.financial_templates add constraint financial_templates_card_id_fkey foreign key(card_id) references public.financial_cards(id) on delete set null;
alter table public.financial_recurring_rules drop constraint if exists financial_recurring_rules_card_id_fkey;
alter table public.financial_recurring_rules add constraint financial_recurring_rules_card_id_fkey foreign key(card_id) references public.financial_cards(id) on delete set null;

-- 4. Evolução aditiva do livro central
alter table public.financial_entries alter column amount type numeric(18,2) using round(amount::numeric,2);
alter table public.financial_entries
  add column if not exists owner_user_id uuid references auth.users(id) on delete restrict,
  add column if not exists category_id uuid references public.financial_categories(id) on delete set null,
  add column if not exists subcategory_id uuid references public.financial_categories(id) on delete set null,
  add column if not exists account_id uuid references public.financial_accounts(id) on delete set null,
  add column if not exists card_id uuid references public.financial_cards(id) on delete set null,
  add column if not exists supplier_id uuid references public.financial_suppliers(id) on delete set null,
  add column if not exists cost_center_id uuid references public.financial_cost_centers(id) on delete set null,
  add column if not exists payment_method_id uuid references public.financial_payment_methods(id) on delete set null,
  add column if not exists installment_group_id uuid references public.financial_installment_groups(id) on delete set null,
  add column if not exists installment_number integer,
  add column if not exists installment_count integer,
  add column if not exists recurring_rule_id uuid references public.financial_recurring_rules(id) on delete set null,
  add column if not exists template_id uuid references public.financial_templates(id) on delete set null,
  add column if not exists document_number text,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null,
  add column if not exists cancelled_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null,
  add column if not exists transfer_id uuid,
  add column if not exists transfer_side text;
update public.financial_entries set owner_user_id=created_by where environment='personal' and owner_user_id is null;
create index if not exists financial_entries_environment_due_idx on public.financial_entries(environment,due_date,status) where archived_at is null;
create index if not exists financial_entries_owner_idx on public.financial_entries(owner_user_id,competence_date desc) where environment='personal' and archived_at is null;
create index if not exists financial_entries_relations_idx on public.financial_entries(client_id,project_id,supplier_id) where archived_at is null;

DO $$ BEGIN
  IF NOT EXISTS(select 1 from pg_constraint where conname='financial_entries_environment_check' and conrelid='public.financial_entries'::regclass) THEN
    alter table public.financial_entries add constraint financial_entries_environment_check check(environment in('personal','professional')) not valid;
    alter table public.financial_entries validate constraint financial_entries_environment_check;
  END IF;
  IF NOT EXISTS(select 1 from pg_constraint where conname='financial_entries_entry_type_check' and conrelid='public.financial_entries'::regclass) THEN
    alter table public.financial_entries add constraint financial_entries_entry_type_check check(entry_type in('income','expense')) not valid;
    alter table public.financial_entries validate constraint financial_entries_entry_type_check;
  END IF;
  IF NOT EXISTS(select 1 from pg_constraint where conname='financial_entries_status_stage08_check' and conrelid='public.financial_entries'::regclass) THEN
    alter table public.financial_entries add constraint financial_entries_status_stage08_check check(status in('forecast','pending','paid','received','partially_paid','partially_received','overdue','cancelled','under_review','awaiting_approval')) not valid;
    alter table public.financial_entries validate constraint financial_entries_status_stage08_check;
  END IF;
END $$;

-- 5. Baixas, ajustes, cartões, transferências e aprovações
alter table public.financial_entry_payments alter column amount type numeric(18,2) using round(amount::numeric,2);
alter table public.financial_entry_payments
  add column if not exists environment text,
  add column if not exists account_id uuid references public.financial_accounts(id) on delete set null,
  add column if not exists payment_method_id uuid references public.financial_payment_methods(id) on delete set null,
  add column if not exists discount_amount numeric(18,2) not null default 0,
  add column if not exists interest_amount numeric(18,2) not null default 0,
  add column if not exists fine_amount numeric(18,2) not null default 0,
  add column if not exists net_amount numeric(18,2),
  add column if not exists document_number text,
  add column if not exists updated_at timestamptz not null default now();
update public.financial_entry_payments p set environment=f.environment,net_amount=coalesce(p.net_amount,p.amount+p.interest_amount+p.fine_amount-p.discount_amount) from public.financial_entries f where f.id=p.financial_entry_id;
alter table public.financial_entry_payments alter column environment set not null;
alter table public.financial_entry_payments alter column net_amount set not null;

create table if not exists public.financial_entry_adjustments(
  id uuid primary key default gen_random_uuid(), financial_entry_id uuid not null references public.financial_entries(id) on delete restrict,
  adjustment_type text not null check(adjustment_type in('discount','interest','fine','correction','write_off')), amount numeric(18,2) not null check(amount>=0), reason text not null,
  approved_by uuid references auth.users(id) on delete set null, approved_at timestamptz, created_by uuid references auth.users(id) on delete set null default auth.uid(), created_at timestamptz not null default now(), archived_at timestamptz, archived_by uuid references auth.users(id) on delete set null
);
create index if not exists financial_adjustments_entry_idx on public.financial_entry_adjustments(financial_entry_id,created_at) where archived_at is null;

create table if not exists public.financial_transfers(
  id uuid primary key default gen_random_uuid(), transfer_type text not null, source_environment text not null check(source_environment in('personal','professional')), destination_environment text not null check(destination_environment in('personal','professional')),
  source_account_id uuid not null references public.financial_accounts(id) on delete restrict, destination_account_id uuid not null references public.financial_accounts(id) on delete restrict,
  amount numeric(18,2) not null check(amount>0), transfer_date date not null, description text not null, notes text,
  source_entry_id uuid references public.financial_entries(id) on delete restrict, destination_entry_id uuid references public.financial_entries(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null default auth.uid(), created_at timestamptz not null default now(), cancelled_at timestamptz, cancelled_by uuid references auth.users(id) on delete set null
);
alter table public.financial_entries drop constraint if exists financial_entries_transfer_id_fkey;
alter table public.financial_entries add constraint financial_entries_transfer_id_fkey foreign key(transfer_id) references public.financial_transfers(id) on delete restrict;

create table if not exists public.financial_approvals(
  id uuid primary key default gen_random_uuid(), environment text not null check(environment in('personal','professional')), owner_user_id uuid references auth.users(id) on delete cascade,
  record_type text not null, record_id uuid not null, requested_by uuid references auth.users(id) on delete set null default auth.uid(), requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz, decision text not null default 'pending' check(decision in('pending','approved','rejected','cancelled')), reason text
);
create index if not exists financial_approvals_pending_idx on public.financial_approvals(environment,requested_at) where decision='pending';

create table if not exists public.financial_card_statements(
  id uuid primary key default gen_random_uuid(), card_id uuid not null references public.financial_cards(id) on delete restrict, reference_month date not null,
  closing_date date not null, due_date date not null, status text not null default 'open', amount numeric(18,2) not null default 0, paid_amount numeric(18,2) not null default 0,
  financial_entry_id uuid references public.financial_entries(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(card_id,reference_month)
);
alter table public.financial_recurring_occurrences drop constraint if exists financial_recurring_occurrences_financial_entry_id_fkey;
alter table public.financial_recurring_occurrences add constraint financial_recurring_occurrences_financial_entry_id_fkey foreign key(financial_entry_id) references public.financial_entries(id) on delete restrict;

-- 6. Funções de autorização
create or replace function public.finance_permission_action(p_action text) returns text language sql immutable as $$
 select case p_action when 'view_values' then 'view_values' when 'settle' then 'settle_finance' when 'approve' then 'approve_finance' else p_action end
$$;

create or replace function public.can_access_finance_environment(p_environment text,p_owner_user_id uuid,p_action text default 'view')
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare module_name text; action_name text; permission_ok boolean; delegated boolean:=false;
begin
  if auth.uid() is null or p_environment not in('personal','professional') then return false; end if;
  module_name:=case when p_environment='personal' then 'finance_personal' else 'finance_professional' end;
  action_name:=public.finance_permission_action(p_action);
  permission_ok:=public.has_permission(module_name,action_name,'own');
  if p_environment='personal' then
    select exists(select 1 from public.financial_environment_access a where a.environment='personal' and a.owner_user_id=p_owner_user_id and a.user_id=auth.uid() and a.archived_at is null and
      case action_name when 'view' then true when 'view_values' then a.can_view_values when 'create' then a.can_create when 'edit' then a.can_edit when 'settle_finance' then a.can_settle when 'approve_finance' then a.can_approve when 'export' then a.can_export when 'export_values' then a.can_export and a.can_view_values else a.access_role in('owner','finance') end) into delegated;
    return permission_ok and (p_owner_user_id=auth.uid() or delegated);
  end if;
  select exists(select 1 from public.financial_environment_access a where a.environment='professional' and a.user_id=auth.uid() and a.archived_at is null and
    case action_name when 'view' then true when 'view_values' then a.can_view_values when 'create' then a.can_create when 'edit' then a.can_edit when 'settle_finance' then a.can_settle when 'approve_finance' then a.can_approve when 'export' then a.can_export when 'export_values' then a.can_export and a.can_view_values else a.access_role in('owner','finance') end) into delegated;
  return permission_ok or delegated;
end $$;

create or replace function public.can_view_finance(target_environment text) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select case when target_environment='personal' then public.can_access_finance_environment('personal',auth.uid(),'view') when target_environment='professional' then public.can_access_finance_environment('professional',null,'view') else false end
$$;
create or replace function public.can_view_finance_values(target_environment text,p_owner uuid default null) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select public.can_access_finance_environment(target_environment,case when target_environment='personal' then coalesce(p_owner,auth.uid()) else null end,'view_values')
$$;
create or replace function public.can_access_financial_entry(p_entry_id uuid,p_action text default 'view') returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.financial_entries f where f.id=p_entry_id and public.can_access_finance_environment(f.environment,f.owner_user_id,p_action))
$$;

-- 7. Normalização de proprietário, ambiente e auditoria
create or replace function public.prepare_financial_record() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.environment='personal' then
    if new.owner_user_id is null then new.owner_user_id:=auth.uid(); end if;
    if tg_op='UPDATE' and old.owner_user_id is distinct from new.owner_user_id and current_setting('app.finance_owner_change',true)<>'allowed' then raise exception 'O proprietário do registro pessoal não pode ser alterado diretamente.'; end if;
  else new.owner_user_id:=null; end if;
  if tg_op='UPDATE' and old.environment is distinct from new.environment and current_setting('app.finance_environment_change',true)<>'allowed' then raise exception 'Use a função de mudança de ambiente com confirmação e permissão.'; end if;
  new.updated_by:=auth.uid(); new.updated_at:=now();
  return new;
end $$;
drop trigger if exists financial_entries_prepare on public.financial_entries;
create trigger financial_entries_prepare before insert or update on public.financial_entries for each row execute function public.prepare_financial_record();

create or replace function public.prepare_finance_catalog_record() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.environment='personal' then if new.owner_user_id is null then new.owner_user_id:=auth.uid(); end if; else new.owner_user_id:=null; end if;
  if to_jsonb(new)?'updated_by' then new.updated_by:=auth.uid(); end if;
  if to_jsonb(new)?'updated_at' then new.updated_at:=now(); end if;
  return new;
end $$;
DO $$ declare t text; begin foreach t in array array['financial_accounts','financial_categories','financial_payment_methods','financial_cost_centers','financial_suppliers','financial_templates','financial_recurring_rules','financial_cards'] loop execute format('drop trigger if exists %I_prepare on public.%I',t,t);execute format('create trigger %I_prepare before insert or update on public.%I for each row execute function public.prepare_finance_catalog_record()',t,t);end loop;end $$;

-- 8. Views de saldo e relatório
create or replace view public.financial_entry_balance_view with(security_invoker=true) as
select f.*,
  coalesce((select sum(case when a.adjustment_type in('interest','fine','correction') then a.amount else -a.amount end) from public.financial_entry_adjustments a where a.financial_entry_id=f.id and a.archived_at is null),0)::numeric(18,2) as adjustment_amount,
  case when f.status in('paid','received') and not exists(select 1 from public.financial_entry_payments p where p.financial_entry_id=f.id and p.archived_at is null) then f.amount else coalesce((select sum(p.net_amount) from public.financial_entry_payments p where p.financial_entry_id=f.id and p.archived_at is null),0) end::numeric(18,2) as paid_amount,
  greatest(f.amount + coalesce((select sum(case when a.adjustment_type in('interest','fine','correction') then a.amount else -a.amount end) from public.financial_entry_adjustments a where a.financial_entry_id=f.id and a.archived_at is null),0) - case when f.status in('paid','received') and not exists(select 1 from public.financial_entry_payments p where p.financial_entry_id=f.id and p.archived_at is null) then f.amount else coalesce((select sum(p.net_amount) from public.financial_entry_payments p where p.financial_entry_id=f.id and p.archived_at is null),0) end,0)::numeric(18,2) as open_amount,
  case when f.status='cancelled' then 'cancelled' when f.archived_at is not null then f.status when greatest(f.amount + coalesce((select sum(case when a.adjustment_type in('interest','fine','correction') then a.amount else -a.amount end) from public.financial_entry_adjustments a where a.financial_entry_id=f.id and a.archived_at is null),0) - case when f.status in('paid','received') and not exists(select 1 from public.financial_entry_payments p where p.financial_entry_id=f.id and p.archived_at is null) then f.amount else coalesce((select sum(p.net_amount) from public.financial_entry_payments p where p.financial_entry_id=f.id and p.archived_at is null),0) end,0)=0 then case when f.entry_type='income' then 'received' else 'paid' end when coalesce((select sum(p.net_amount) from public.financial_entry_payments p where p.financial_entry_id=f.id and p.archived_at is null),0)>0 then case when f.entry_type='income' then 'partially_received' else 'partially_paid' end when f.due_date<current_date and f.status not in('forecast','under_review','awaiting_approval') then 'overdue' else f.status end as effective_status
from public.financial_entries f;

create or replace view public.financial_account_balance_view with(security_invoker=true) as
select a.*, (a.opening_balance + coalesce(sum(case when e.entry_type='income' then p.net_amount else -p.net_amount end),0))::numeric(18,2) as current_balance
from public.financial_accounts a left join public.financial_entry_payments p on p.account_id=a.id and p.archived_at is null left join public.financial_entries e on e.id=p.financial_entry_id
group by a.id;

create or replace view public.financial_cash_flow_view with(security_invoker=true) as
select e.id,e.environment,e.owner_user_id,e.entry_type,e.description,e.account_id,e.client_id,e.project_id,e.supplier_id,e.cost_center_id,
 coalesce(p.paid_at,(e.due_date::text||' 12:00:00-04')::timestamptz) as movement_at,
 case when p.id is null then e.open_amount else p.net_amount end::numeric(18,2) as amount,
 (p.id is not null or e.open_amount=0) as realized,e.effective_status
from public.financial_entry_balance_view e left join public.financial_entry_payments p on p.financial_entry_id=e.id and p.archived_at is null
where e.archived_at is null and e.status<>'cancelled';

create or replace view public.financial_receivables_view with(security_invoker=true) as select * from public.financial_entry_balance_view where entry_type='income' and open_amount>0 and archived_at is null and status<>'cancelled';
create or replace view public.financial_payables_view with(security_invoker=true) as select * from public.financial_entry_balance_view where entry_type='expense' and open_amount>0 and archived_at is null and status<>'cancelled';
create or replace view public.financial_report_base_view with(security_invoker=true) as
select e.*,c.name category_name,sc.name subcategory_name,a.name account_name,ca.name card_name,cl.name client_name,s.name supplier_name,p.name project_name,cc.name cost_center_name,pm.name payment_method_name
from public.financial_entry_balance_view e left join public.financial_categories c on c.id=e.category_id left join public.financial_categories sc on sc.id=e.subcategory_id left join public.financial_accounts a on a.id=e.account_id left join public.financial_cards ca on ca.id=e.card_id left join public.clients cl on cl.id=e.client_id left join public.financial_suppliers s on s.id=e.supplier_id left join public.projects p on p.id=e.project_id left join public.financial_cost_centers cc on cc.id=e.cost_center_id left join public.financial_payment_methods pm on pm.id=e.payment_method_id;

-- 9. RLS
DO $$ declare t text; begin foreach t in array array['financial_environment_access','financial_installment_groups','financial_accounts','financial_categories','financial_payment_methods','financial_cost_centers','financial_suppliers','financial_templates','financial_recurring_rules','financial_recurring_occurrences','financial_cards','financial_card_statements','financial_entry_adjustments','financial_transfers','financial_approvals'] loop execute format('alter table public.%I enable row level security',t);end loop;alter table public.financial_entries enable row level security;alter table public.financial_entry_payments enable row level security;end $$;

-- Ambiente explícito
create or replace function public.can_manage_finance_access(p_environment text,p_owner uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and ((p_environment='personal' and p_owner=auth.uid() and public.has_permission('finance_personal','view','own')) or (p_environment='professional' and public.has_permission('finance_professional','approve_finance','own')))
$$;
drop policy if exists financial_environment_access_select on public.financial_environment_access;
create policy financial_environment_access_select on public.financial_environment_access for select to authenticated using(user_id=auth.uid() or owner_user_id=auth.uid() or public.can_manage_finance_access(environment,owner_user_id));
drop policy if exists financial_environment_access_manage on public.financial_environment_access;
create policy financial_environment_access_manage on public.financial_environment_access for all to authenticated using(public.can_manage_finance_access(environment,owner_user_id)) with check(public.can_manage_finance_access(environment,owner_user_id));

-- Livro central: acesso somente por RPC; RLS continua como defesa em profundidade.
drop policy if exists financial_entries_select_scope on public.financial_entries;drop policy if exists financial_entries_insert_scope on public.financial_entries;drop policy if exists financial_entries_update_scope on public.financial_entries;drop policy if exists financial_entries_delete_scope on public.financial_entries;
create policy financial_entries_select_scope on public.financial_entries for select to authenticated using(public.can_access_finance_environment(environment,owner_user_id,'view'));
create policy financial_entries_insert_scope on public.financial_entries for insert to authenticated with check(public.can_access_finance_environment(environment,coalesce(owner_user_id,auth.uid()),'create'));
create policy financial_entries_update_scope on public.financial_entries for update to authenticated using(public.can_access_finance_environment(environment,owner_user_id,'edit')) with check(public.can_access_finance_environment(environment,owner_user_id,'edit'));
create policy financial_entries_delete_scope on public.financial_entries for delete to authenticated using(false);

-- Policies dos cadastros
DO $$ declare r record; begin
 for r in select * from (values
 ('financial_accounts','manage_accounts'),('financial_categories','manage_categories'),('financial_payment_methods','manage_categories'),('financial_cost_centers','manage_cost_centers'),('financial_suppliers','manage_suppliers'),('financial_templates','manage_templates'),('financial_recurring_rules','manage_recurrence'),('financial_cards','manage_cards')) v(table_name,action_name)
 loop
  execute format('drop policy if exists %I_select on public.%I',r.table_name,r.table_name);
  execute format('drop policy if exists %I_insert on public.%I',r.table_name,r.table_name);
  execute format('drop policy if exists %I_update on public.%I',r.table_name,r.table_name);
  execute format('drop policy if exists %I_delete on public.%I',r.table_name,r.table_name);
  execute format('create policy %I_select on public.%I for select to authenticated using(public.can_access_finance_environment(environment,owner_user_id,''view''))',r.table_name,r.table_name);
  execute format('create policy %I_insert on public.%I for insert to authenticated with check(public.can_access_finance_environment(environment,coalesce(owner_user_id,auth.uid()),%L))',r.table_name,r.table_name,r.action_name);
  execute format('create policy %I_update on public.%I for update to authenticated using(public.can_access_finance_environment(environment,owner_user_id,%L)) with check(public.can_access_finance_environment(environment,owner_user_id,%L))',r.table_name,r.table_name,r.action_name,r.action_name);
  execute format('create policy %I_delete on public.%I for delete to authenticated using(false)',r.table_name,r.table_name);
 end loop;
end $$;

-- Filhos sensíveis
DO $$ begin
 drop policy if exists financial_entry_payments_select_scope on public.financial_entry_payments;drop policy if exists financial_entry_payments_insert_scope on public.financial_entry_payments;drop policy if exists financial_entry_payments_update_scope on public.financial_entry_payments;drop policy if exists financial_entry_payments_delete_scope on public.financial_entry_payments;
 create policy financial_entry_payments_select_scope on public.financial_entry_payments for select to authenticated using(public.can_access_financial_entry(financial_entry_id,'view'));
 create policy financial_entry_payments_insert_scope on public.financial_entry_payments for insert to authenticated with check(public.can_access_financial_entry(financial_entry_id,'settle'));
 create policy financial_entry_payments_update_scope on public.financial_entry_payments for update to authenticated using(false) with check(false);
 create policy financial_entry_payments_delete_scope on public.financial_entry_payments for delete to authenticated using(false);
end $$;
drop policy if exists financial_adjustments_select on public.financial_entry_adjustments;create policy financial_adjustments_select on public.financial_entry_adjustments for select to authenticated using(public.can_access_financial_entry(financial_entry_id,'view'));
drop policy if exists financial_adjustments_write on public.financial_entry_adjustments;create policy financial_adjustments_write on public.financial_entry_adjustments for all to authenticated using(false) with check(false);
drop policy if exists financial_transfers_select on public.financial_transfers;create policy financial_transfers_select on public.financial_transfers for select to authenticated using(public.can_access_finance_environment(source_environment,(select owner_user_id from public.financial_entries where id=source_entry_id),'view') and public.can_access_finance_environment(destination_environment,(select owner_user_id from public.financial_entries where id=destination_entry_id),'view'));
drop policy if exists financial_transfers_write on public.financial_transfers;create policy financial_transfers_write on public.financial_transfers for all to authenticated using(false) with check(false);
drop policy if exists financial_approvals_select on public.financial_approvals;create policy financial_approvals_select on public.financial_approvals for select to authenticated using(public.can_access_finance_environment(environment,owner_user_id,'approve') or requested_by=auth.uid());
drop policy if exists financial_approvals_write on public.financial_approvals;create policy financial_approvals_write on public.financial_approvals for all to authenticated using(false) with check(false);
drop policy if exists financial_installments_select on public.financial_installment_groups;create policy financial_installments_select on public.financial_installment_groups for select to authenticated using(public.can_access_finance_environment(environment,owner_user_id,'view'));
drop policy if exists financial_installments_write on public.financial_installment_groups;create policy financial_installments_write on public.financial_installment_groups for all to authenticated using(false) with check(false);
drop policy if exists financial_recurring_occurrences_select on public.financial_recurring_occurrences;create policy financial_recurring_occurrences_select on public.financial_recurring_occurrences for select to authenticated using(exists(select 1 from public.financial_recurring_rules r where r.id=rule_id and public.can_access_finance_environment(r.environment,r.owner_user_id,'view')));
drop policy if exists financial_recurring_occurrences_write on public.financial_recurring_occurrences;create policy financial_recurring_occurrences_write on public.financial_recurring_occurrences for all to authenticated using(false) with check(false);
drop policy if exists financial_card_statements_select on public.financial_card_statements;create policy financial_card_statements_select on public.financial_card_statements for select to authenticated using(exists(select 1 from public.financial_cards c where c.id=card_id and public.can_access_finance_environment(c.environment,c.owner_user_id,'view')));
drop policy if exists financial_card_statements_write on public.financial_card_statements;create policy financial_card_statements_write on public.financial_card_statements for all to authenticated using(false) with check(false);

-- 10. Funções de consulta e mutação
create or replace function public.finance_entry_json(p_entry_id uuid,p_include_values boolean default true) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select to_jsonb(x) from (
  select e.id,e.environment,e.owner_user_id,e.entry_type,e.description,
   case when p_include_values then e.amount::text else null end amount,
   case when p_include_values then e.paid_amount::text else null end paid_amount,
   case when p_include_values then e.adjustment_amount::text else null end adjustment_amount,
   case when p_include_values then e.open_amount::text else null end open_amount,
   e.competence_date,e.due_date,e.settled_at,e.status,e.effective_status,e.category_id,c.name category_name,e.subcategory_id,sc.name subcategory_name,e.account_id,a.name account_name,e.card_id,ca.name card_name,e.client_id,cl.name client_name,e.supplier_id,s.name supplier_name,e.project_id,p.name project_name,e.cost_center_id,cc.name cost_center_name,e.payment_method_id,pm.name payment_method_name,e.installment_group_id,e.installment_number,e.installment_count,e.recurring_rule_id,e.template_id,e.document_number,e.notes,e.created_by,cr.name created_by_name,e.settled_by,sr.name settled_by_name,e.approved_by,e.approved_at,e.cancelled_at,e.archived_at,e.created_at,e.updated_at
  from public.financial_entry_balance_view e left join public.financial_categories c on c.id=e.category_id left join public.financial_categories sc on sc.id=e.subcategory_id left join public.financial_accounts a on a.id=e.account_id left join public.financial_cards ca on ca.id=e.card_id left join public.clients cl on cl.id=e.client_id left join public.financial_suppliers s on s.id=e.supplier_id left join public.projects p on p.id=e.project_id left join public.financial_cost_centers cc on cc.id=e.cost_center_id left join public.financial_payment_methods pm on pm.id=e.payment_method_id left join public.profiles cr on cr.id=e.created_by left join public.profiles sr on sr.id=e.settled_by where e.id=p_entry_id
 ) x
$$;

create or replace function public.get_financial_entry(p_entry_id uuid) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare f public.financial_entries%rowtype; include_values boolean;begin select * into f from public.financial_entries where id=p_entry_id;if not found or not public.can_access_finance_environment(f.environment,f.owner_user_id,'view') then raise exception 'Lançamento não encontrado ou sem permissão.';end if;include_values:=public.can_access_finance_environment(f.environment,f.owner_user_id,'view_values');return public.finance_entry_json(p_entry_id,include_values);end $$;

create or replace function public.get_finance_workspace(p_environment text,p_section text default 'overview',p_filters jsonb default '{}'::jsonb,p_limit integer default 50,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare include_values boolean:=false; entries_json jsonb:='[]'; metrics_json jsonb:='{}'; timeline_json jsonb:='[]'; category_json jsonb:='[]'; status_json jsonb:='[]'; options_json jsonb:='{}'; approvals_json jsonb:='[]'; access_json jsonb:='[]'; total_count integer:=0; personal_ok boolean; professional_ok boolean;
begin
 personal_ok:=public.can_access_finance_environment('personal',auth.uid(),'view');professional_ok:=public.can_access_finance_environment('professional',null,'view');
 if p_environment='personal' then if not personal_ok then raise exception 'Sem acesso ao Financeiro Pessoal.';end if;include_values:=public.can_access_finance_environment('personal',auth.uid(),'view_values');
 elsif p_environment='professional' then if not professional_ok then raise exception 'Sem acesso ao Financeiro Profissional.';end if;include_values:=public.can_access_finance_environment('professional',null,'view_values');
 elsif p_environment='consolidated' then if not(personal_ok and professional_ok and public.has_permission('finance_professional','view_consolidated','own')) then raise exception 'Sem permissão para a visão consolidada.';end if;include_values:=public.can_access_finance_environment('personal',auth.uid(),'view_values') and public.can_access_finance_environment('professional',null,'view_values');
 else raise exception 'Ambiente financeiro inválido.';end if;

 with filtered as (
  select e.* from public.financial_report_base_view e where public.can_access_finance_environment(e.environment,e.owner_user_id,'view')
   and (p_environment='consolidated' or e.environment=p_environment)
   and (coalesce((p_filters->>'include_archived')::boolean,false) or e.archived_at is null)
   and (nullif(p_filters->>'start_date','') is null or e.competence_date>=(p_filters->>'start_date')::date)
   and (nullif(p_filters->>'end_date','') is null or e.competence_date<=(p_filters->>'end_date')::date)
   and (nullif(p_filters->>'status','') is null or e.effective_status=p_filters->>'status')
   and (public.safe_uuid(p_filters->>'category_id') is null or e.category_id=public.safe_uuid(p_filters->>'category_id'))
   and (public.safe_uuid(p_filters->>'account_id') is null or e.account_id=public.safe_uuid(p_filters->>'account_id'))
   and (public.safe_uuid(p_filters->>'card_id') is null or e.card_id=public.safe_uuid(p_filters->>'card_id'))
   and (public.safe_uuid(p_filters->>'client_id') is null or e.client_id=public.safe_uuid(p_filters->>'client_id'))
   and (public.safe_uuid(p_filters->>'project_id') is null or e.project_id=public.safe_uuid(p_filters->>'project_id'))
   and (public.safe_uuid(p_filters->>'supplier_id') is null or e.supplier_id=public.safe_uuid(p_filters->>'supplier_id'))
   and (public.safe_uuid(p_filters->>'cost_center_id') is null or e.cost_center_id=public.safe_uuid(p_filters->>'cost_center_id'))
   and (nullif(trim(coalesce(p_filters->>'search','')),'') is null or lower(concat_ws(' ',e.description,e.document_number,e.client_name,e.project_name,e.supplier_name)) like '%'||lower(trim(p_filters->>'search'))||'%')
 ), paged as (select * from filtered order by competence_date desc,created_at desc limit least(greatest(coalesce(p_limit,50),1),200) offset greatest(coalesce(p_offset,0),0))
 select coalesce(jsonb_agg(public.finance_entry_json(id,include_values)),'[]'::jsonb),(select count(*) from filtered) into entries_json,total_count from paged;

 with filtered as (select e.* from public.financial_entry_balance_view e where public.can_access_finance_environment(e.environment,e.owner_user_id,'view') and (p_environment='consolidated' or e.environment=p_environment) and e.archived_at is null and e.status<>'cancelled' and (nullif(p_filters->>'start_date','') is null or e.competence_date>=(p_filters->>'start_date')::date) and (nullif(p_filters->>'end_date','') is null or e.competence_date<=(p_filters->>'end_date')::date))
 select jsonb_build_object('current_balance',case when include_values then coalesce(sum(case when effective_status in('paid','received') then case when entry_type='income' then amount else -amount end else 0 end),0)::text else null end,'expected_income',case when include_values then coalesce(sum(amount) filter(where entry_type='income'),0)::text else null end,'realized_income',case when include_values then coalesce(sum(paid_amount) filter(where entry_type='income'),0)::text else null end,'expected_expense',case when include_values then coalesce(sum(amount) filter(where entry_type='expense'),0)::text else null end,'realized_expense',case when include_values then coalesce(sum(paid_amount) filter(where entry_type='expense'),0)::text else null end,'net_result',case when include_values then (coalesce(sum(paid_amount) filter(where entry_type='income'),0)-coalesce(sum(paid_amount) filter(where entry_type='expense'),0))::text else null end,'receivable',case when include_values then coalesce(sum(open_amount) filter(where entry_type='income'),0)::text else null end,'payable',case when include_values then coalesce(sum(open_amount) filter(where entry_type='expense'),0)::text else null end,'overdue',case when include_values then coalesce(sum(open_amount) filter(where effective_status='overdue'),0)::text else null end,'projected_balance',case when include_values then (coalesce(sum(amount) filter(where entry_type='income'),0)-coalesce(sum(amount) filter(where entry_type='expense'),0))::text else null end,'previous_period_result','0.00','result_change_percent',null) into metrics_json from filtered;

 with grouped as (select to_char(date_trunc('month',competence_date),'MM/YYYY') label,date_trunc('month',competence_date) month_key,coalesce(sum(amount) filter(where entry_type='income'),0) income,coalesce(sum(amount) filter(where entry_type='expense'),0) expense,coalesce(sum(paid_amount),0) realized,coalesce(sum(amount),0) forecast from public.financial_entry_balance_view e where public.can_access_finance_environment(e.environment,e.owner_user_id,'view') and (p_environment='consolidated' or e.environment=p_environment) and e.archived_at is null and e.status<>'cancelled' group by date_trunc('month',competence_date) order by month_key)
 select coalesce(jsonb_agg(jsonb_build_object('label',label,'income',case when include_values then income::text else null end,'expense',case when include_values then expense::text else null end,'result',case when include_values then (income-expense)::text else null end,'forecast',case when include_values then forecast::text else null end,'realized',case when include_values then realized::text else null end)),'[]'::jsonb) into timeline_json from grouped;

 with grouped as (select coalesce(c.name,'Sem categoria') label,sum(e.amount) amount from public.financial_entry_balance_view e left join public.financial_categories c on c.id=e.category_id where public.can_access_finance_environment(e.environment,e.owner_user_id,'view') and (p_environment='consolidated' or e.environment=p_environment) and e.entry_type='expense' and e.archived_at is null and e.status<>'cancelled' group by c.name), totals as(select coalesce(sum(amount),0) total from grouped)
 select coalesce(jsonb_agg(jsonb_build_object('label',label,'amount',case when include_values then amount::text else null end,'percentage',case when total=0 then '0' else round(amount*100/total,2)::text end) order by amount desc),'[]'::jsonb) into category_json from grouped cross join totals;

 with grouped as (select effective_status label,count(*) count,sum(amount) amount from public.financial_entry_balance_view e where public.can_access_finance_environment(e.environment,e.owner_user_id,'view') and (p_environment='consolidated' or e.environment=p_environment) and e.archived_at is null group by effective_status)
 select coalesce(jsonb_agg(jsonb_build_object('label',label,'count',count,'amount',case when include_values then amount::text else null end)),'[]'::jsonb) into status_json from grouped;

 if p_environment<>'consolidated' then
  select jsonb_build_object(
   'categories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'environment',environment,'active',active,'entry_type',entry_type,'parent_id',parent_id,'color',color,'type',type) order by position,name) from public.financial_categories where environment=p_environment and public.can_access_finance_environment(environment,owner_user_id,'view') and archived_at is null and parent_id is null),'[]'::jsonb),
   'subcategories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'environment',environment,'active',active,'entry_type',entry_type,'parent_id',parent_id,'color',color,'type',type) order by position,name) from public.financial_categories where environment=p_environment and public.can_access_finance_environment(environment,owner_user_id,'view') and archived_at is null and parent_id is not null),'[]'::jsonb),
   'accounts',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'environment',environment,'active',active,'type',type,'current_balance',case when include_values then current_balance::text else null end,'institution',institution,'branch',branch,'account_number_masked',account_number_masked,'opening_balance',case when include_values then opening_balance::text else null end,'opening_balance_date',opening_balance_date) order by name) from public.financial_account_balance_view where environment=p_environment and public.can_access_finance_environment(environment,owner_user_id,'view') and archived_at is null),'[]'::jsonb),
   'cards',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'environment',environment,'active',active,'type',type,'limit_amount',case when include_values then limit_amount::text else null end,'last_four_digits',last_four_digits,'brand',brand,'closing_day',closing_day,'due_day',due_day,'account_id',account_id) order by name) from public.financial_cards where environment=p_environment and public.can_access_finance_environment(environment,owner_user_id,'view') and archived_at is null),'[]'::jsonb),
   'suppliers',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'environment',environment,'active',active,'type',type,'document',document,'phone',phone,'email',email) order by name) from public.financial_suppliers where environment=p_environment and public.can_access_finance_environment(environment,owner_user_id,'view') and archived_at is null),'[]'::jsonb),
   'cost_centers',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'environment',environment,'active',active,'type',type,'code',code) order by name) from public.financial_cost_centers where environment=p_environment and public.can_access_finance_environment(environment,owner_user_id,'view') and archived_at is null),'[]'::jsonb),
   'payment_methods',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'environment',environment,'active',active,'type',type) order by position,name) from public.financial_payment_methods where environment=p_environment and public.can_access_finance_environment(environment,owner_user_id,'view') and archived_at is null),'[]'::jsonb),
   'clients',case when p_environment='professional' then coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'environment','professional') order by name) from public.clients where archived_at is null and public.can_access_client(id)),'[]'::jsonb) else '[]'::jsonb end,
   'projects',case when p_environment='professional' then coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'environment','professional') order by name) from public.projects where archived_at is null and public.can_access_project(id)),'[]'::jsonb) else '[]'::jsonb end,
   'templates',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'environment',environment,'active',active,'entry_type',entry_type,'type',type,'description',description,'suggested_amount',case when include_values then suggested_amount::text else null end,'due_day',due_day,'frequency',frequency) order by name) from public.financial_templates where environment=p_environment and public.can_access_finance_environment(environment,owner_user_id,'view') and archived_at is null),'[]'::jsonb),
   'recurring_rules',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'environment',environment,'active',active,'entry_type',entry_type,'description',description,'amount',case when include_values then amount::text else null end,'frequency',frequency,'interval_value',interval_value,'starts_on',starts_on,'ends_on',ends_on,'next_generation_date',next_generation_date,'category_id',category_id,'account_id',account_id,'card_id',card_id,'client_id',client_id,'supplier_id',supplier_id,'project_id',project_id,'cost_center_id',cost_center_id) order by name) from public.financial_recurring_rules where environment=p_environment and public.can_access_finance_environment(environment,owner_user_id,'view') and archived_at is null),'[]'::jsonb)
  ) into options_json;
 else options_json:=jsonb_build_object('categories','[]'::jsonb,'subcategories','[]'::jsonb,'accounts','[]'::jsonb,'cards','[]'::jsonb,'suppliers','[]'::jsonb,'cost_centers','[]'::jsonb,'payment_methods','[]'::jsonb,'clients','[]'::jsonb,'projects','[]'::jsonb,'templates','[]'::jsonb,'recurring_rules','[]'::jsonb); end if;

 select jsonb_build_array(
  jsonb_build_object('environment','personal','can_view',personal_ok,'can_view_values',public.can_access_finance_environment('personal',auth.uid(),'view_values'),'can_create',public.can_access_finance_environment('personal',auth.uid(),'create'),'can_edit',public.can_access_finance_environment('personal',auth.uid(),'edit'),'can_settle',public.can_access_finance_environment('personal',auth.uid(),'settle'),'can_approve',public.can_access_finance_environment('personal',auth.uid(),'approve'),'can_export',public.can_access_finance_environment('personal',auth.uid(),'export'),'can_manage_accounts',public.can_access_finance_environment('personal',auth.uid(),'manage_accounts'),'can_manage_cards',public.can_access_finance_environment('personal',auth.uid(),'manage_cards'),'can_manage_categories',public.can_access_finance_environment('personal',auth.uid(),'manage_categories'),'can_manage_templates',public.can_access_finance_environment('personal',auth.uid(),'manage_templates'),'can_manage_suppliers',public.can_access_finance_environment('personal',auth.uid(),'manage_suppliers'),'can_manage_cost_centers',public.can_access_finance_environment('personal',auth.uid(),'manage_cost_centers'),'can_manage_recurrence',public.can_access_finance_environment('personal',auth.uid(),'manage_recurrence'),'can_manage_installments',public.can_access_finance_environment('personal',auth.uid(),'manage_installments'),'can_manage_transfers',public.can_access_finance_environment('personal',auth.uid(),'manage_transfers'),'can_change_environment',public.can_access_finance_environment('personal',auth.uid(),'change_environment')),
  jsonb_build_object('environment','professional','can_view',professional_ok,'can_view_values',public.can_access_finance_environment('professional',null,'view_values'),'can_create',public.can_access_finance_environment('professional',null,'create'),'can_edit',public.can_access_finance_environment('professional',null,'edit'),'can_settle',public.can_access_finance_environment('professional',null,'settle'),'can_approve',public.can_access_finance_environment('professional',null,'approve'),'can_export',public.can_access_finance_environment('professional',null,'export'),'can_manage_accounts',public.can_access_finance_environment('professional',null,'manage_accounts'),'can_manage_cards',public.can_access_finance_environment('professional',null,'manage_cards'),'can_manage_categories',public.can_access_finance_environment('professional',null,'manage_categories'),'can_manage_templates',public.can_access_finance_environment('professional',null,'manage_templates'),'can_manage_suppliers',public.can_access_finance_environment('professional',null,'manage_suppliers'),'can_manage_cost_centers',public.can_access_finance_environment('professional',null,'manage_cost_centers'),'can_manage_recurrence',public.can_access_finance_environment('professional',null,'manage_recurrence'),'can_manage_installments',public.can_access_finance_environment('professional',null,'manage_installments'),'can_manage_transfers',public.can_access_finance_environment('professional',null,'manage_transfers'),'can_change_environment',public.can_access_finance_environment('professional',null,'change_environment'))
 ) into access_json;

 select coalesce(jsonb_agg(to_jsonb(a) order by a.requested_at desc),'[]'::jsonb) into approvals_json from public.financial_approvals a where a.decision='pending' and (p_environment='consolidated' or a.environment=p_environment) and (a.requested_by=auth.uid() or public.can_access_finance_environment(a.environment,a.owner_user_id,'approve'));
 return jsonb_build_object('entries',entries_json,'total',total_count,'metrics',metrics_json,'timeline',timeline_json,'categories_chart',category_json,'statuses_chart',status_json,'options',options_json,'approvals',approvals_json,'access',access_json);
end $$;

create or replace function public.save_financial_entry(p_entry_id uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare env text:=p_payload->>'environment'; owner_id uuid; result_id uuid; status_value text;begin
 if env not in('personal','professional') then raise exception 'Ambiente inválido.';end if;owner_id:=case when env='personal' then auth.uid() else null end;
 if p_entry_id is null then
  if not public.can_access_finance_environment(env,owner_id,'create') then raise exception 'Sem permissão para criar lançamento.';end if;
  status_value:=coalesce(nullif(p_payload->>'status',''),'pending');
  if coalesce((select (value#>>'{}')::boolean from public.system_settings where key='finance_require_approval'),false) then status_value:='awaiting_approval';end if;
  insert into public.financial_entries(environment,owner_user_id,entry_type,description,amount,competence_date,due_date,status,category_id,subcategory_id,account_id,card_id,client_id,supplier_id,project_id,cost_center_id,payment_method_id,document_number,notes,created_by,updated_by)
  values(env,owner_id,p_payload->>'entry_type',trim(p_payload->>'description'),round((p_payload->>'amount')::numeric,2),(p_payload->>'competence_date')::date,public.safe_date(p_payload->>'due_date'),status_value,public.safe_uuid(p_payload->>'category_id'),public.safe_uuid(p_payload->>'subcategory_id'),public.safe_uuid(p_payload->>'account_id'),public.safe_uuid(p_payload->>'card_id'),public.safe_uuid(p_payload->>'client_id'),public.safe_uuid(p_payload->>'supplier_id'),public.safe_uuid(p_payload->>'project_id'),public.safe_uuid(p_payload->>'cost_center_id'),public.safe_uuid(p_payload->>'payment_method_id'),nullif(trim(p_payload->>'document_number'),''),nullif(trim(p_payload->>'notes'),''),auth.uid(),auth.uid()) returning id into result_id;
 else
  select owner_user_id,environment into owner_id,env from public.financial_entries where id=p_entry_id;
  if not found or not public.can_access_finance_environment(env,owner_id,'edit') then raise exception 'Sem permissão para editar lançamento.';end if;
  update public.financial_entries set entry_type=coalesce(nullif(p_payload->>'entry_type',''),entry_type),description=coalesce(nullif(trim(p_payload->>'description'),''),description),amount=coalesce((p_payload->>'amount')::numeric,amount),competence_date=coalesce(public.safe_date(p_payload->>'competence_date'),competence_date),due_date=public.safe_date(p_payload->>'due_date'),status=coalesce(nullif(p_payload->>'status',''),status),category_id=public.safe_uuid(p_payload->>'category_id'),subcategory_id=public.safe_uuid(p_payload->>'subcategory_id'),account_id=public.safe_uuid(p_payload->>'account_id'),card_id=public.safe_uuid(p_payload->>'card_id'),client_id=public.safe_uuid(p_payload->>'client_id'),supplier_id=public.safe_uuid(p_payload->>'supplier_id'),project_id=public.safe_uuid(p_payload->>'project_id'),cost_center_id=public.safe_uuid(p_payload->>'cost_center_id'),payment_method_id=public.safe_uuid(p_payload->>'payment_method_id'),document_number=nullif(trim(p_payload->>'document_number'),''),notes=nullif(trim(p_payload->>'notes'),'') where id=p_entry_id returning id into result_id;
 end if;
 return public.finance_entry_json(result_id,public.can_access_finance_environment(env,owner_id,'view_values'));
end $$;

create or replace function public.duplicate_financial_entry(p_entry_id uuid) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare f public.financial_entries%rowtype;new_id uuid;begin select * into f from public.financial_entries where id=p_entry_id;if not found or not public.can_access_finance_environment(f.environment,f.owner_user_id,'create') then raise exception 'Sem permissão para duplicar.';end if;insert into public.financial_entries(environment,owner_user_id,entry_type,description,amount,competence_date,due_date,status,category_id,subcategory_id,account_id,card_id,client_id,supplier_id,project_id,cost_center_id,payment_method_id,document_number,notes,created_by,updated_by) values(f.environment,f.owner_user_id,f.entry_type,f.description||' — cópia',f.amount,current_date,f.due_date,'pending',f.category_id,f.subcategory_id,f.account_id,f.card_id,f.client_id,f.supplier_id,f.project_id,f.cost_center_id,f.payment_method_id,f.document_number,f.notes,auth.uid(),auth.uid()) returning id into new_id;return new_id;end $$;
create or replace function public.archive_financial_entry(p_entry_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$ begin if not public.can_access_financial_entry(p_entry_id,'archive') then raise exception 'Sem permissão para arquivar.';end if;update public.financial_entries set archived_at=now(),archived_by=auth.uid() where id=p_entry_id;end $$;
create or replace function public.reactivate_financial_entry(p_entry_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$ begin if not public.can_access_financial_entry(p_entry_id,'archive') then raise exception 'Sem permissão para reativar.';end if;update public.financial_entries set archived_at=null,archived_by=null where id=p_entry_id;end $$;
create or replace function public.cancel_financial_entry(p_entry_id uuid,p_reason text) returns void language plpgsql security definer set search_path=public,pg_temp as $$ begin if not public.can_access_financial_entry(p_entry_id,'cancel_entry') then raise exception 'Sem permissão para cancelar.';end if;if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Informe o motivo do cancelamento.';end if;update public.financial_entries set status='cancelled',cancelled_at=now(),cancelled_by=auth.uid(),notes=concat_ws(E'\n',notes,'Cancelamento: '||trim(p_reason)) where id=p_entry_id;end $$;

create or replace function public.refresh_financial_entry_status(p_entry_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare e public.financial_entries%rowtype; paid numeric; adjusted numeric; open_value numeric;begin select * into e from public.financial_entries where id=p_entry_id;if not found or e.status='cancelled' then return;end if;select coalesce(sum(net_amount),0) into paid from public.financial_entry_payments where financial_entry_id=p_entry_id and archived_at is null;select coalesce(sum(case when adjustment_type in('interest','fine','correction') then amount else -amount end),0) into adjusted from public.financial_entry_adjustments where financial_entry_id=p_entry_id and archived_at is null;open_value:=greatest(e.amount+adjusted-paid,0);update public.financial_entries set status=case when open_value=0 then case when e.entry_type='income' then 'received' else 'paid' end when paid>0 then case when e.entry_type='income' then 'partially_received' else 'partially_paid' end when e.due_date<current_date and e.status not in('forecast','under_review','awaiting_approval') then 'overdue' else e.status end,settled_at=case when open_value=0 then coalesce(e.settled_at,now()) else null end,settled_by=case when open_value=0 then coalesce(e.settled_by,auth.uid()) else null end where id=p_entry_id;end $$;

create or replace function public.settle_financial_entry(p_entry_id uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare e public.financial_entries%rowtype; amount_value numeric;discount_value numeric;interest_value numeric;fine_value numeric;open_value numeric;begin select * into e from public.financial_entries where id=p_entry_id;if not found or not public.can_access_finance_environment(e.environment,e.owner_user_id,'settle') then raise exception 'Sem permissão para realizar baixa.';end if;select open_amount into open_value from public.financial_entry_balance_view where id=p_entry_id;amount_value:=round((p_payload->>'amount')::numeric,2);discount_value:=coalesce((p_payload->>'discount_amount')::numeric,0);interest_value:=coalesce((p_payload->>'interest_amount')::numeric,0);fine_value:=coalesce((p_payload->>'fine_amount')::numeric,0);if amount_value<=0 then raise exception 'O valor da baixa deve ser positivo.';end if;if amount_value-discount_value>open_value+interest_value+fine_value and not public.can_access_finance_environment(e.environment,e.owner_user_id,'approve') then raise exception 'A baixa excede o saldo do lançamento.';end if;if discount_value>0 then insert into public.financial_entry_adjustments(financial_entry_id,adjustment_type,amount,reason,created_by) values(p_entry_id,'discount',discount_value,'Desconto registrado na baixa',auth.uid());end if;if interest_value>0 then insert into public.financial_entry_adjustments(financial_entry_id,adjustment_type,amount,reason,created_by) values(p_entry_id,'interest',interest_value,'Juros registrados na baixa',auth.uid());end if;if fine_value>0 then insert into public.financial_entry_adjustments(financial_entry_id,adjustment_type,amount,reason,created_by) values(p_entry_id,'fine',fine_value,'Multa registrada na baixa',auth.uid());end if;insert into public.financial_entry_payments(financial_entry_id,environment,account_id,payment_method_id,amount,discount_amount,interest_amount,fine_amount,net_amount,paid_at,document_number,notes,created_by) values(p_entry_id,e.environment,public.safe_uuid(p_payload->>'account_id'),public.safe_uuid(p_payload->>'payment_method_id'),amount_value,discount_value,interest_value,fine_value,amount_value,coalesce((p_payload->>'paid_at')::timestamptz,now()),nullif(trim(p_payload->>'document_number'),''),nullif(trim(p_payload->>'notes'),''),auth.uid());perform public.refresh_financial_entry_status(p_entry_id);return public.finance_entry_json(p_entry_id,public.can_access_finance_environment(e.environment,e.owner_user_id,'view_values'));end $$;

create or replace function public.change_financial_environment(p_entry_id uuid,p_target_environment text,p_reason text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare e public.financial_entries%rowtype;target_owner uuid;begin select * into e from public.financial_entries where id=p_entry_id;if not found then raise exception 'Lançamento não encontrado.';end if;if p_target_environment not in('personal','professional') or p_target_environment=e.environment then raise exception 'Ambiente de destino inválido.';end if;target_owner:=case when p_target_environment='personal' then auth.uid() else null end;if not(public.can_access_finance_environment(e.environment,e.owner_user_id,'change_environment') and public.can_access_finance_environment(p_target_environment,target_owner,'change_environment')) then raise exception 'Sem permissão para alterar o ambiente.';end if;if length(trim(coalesce(p_reason,'')))<5 then raise exception 'Informe uma justificativa.';end if;perform set_config('app.finance_environment_change','allowed',true);perform set_config('app.finance_owner_change','allowed',true);update public.financial_entries set environment=p_target_environment,owner_user_id=target_owner,client_id=case when p_target_environment='personal' then null else client_id end,project_id=case when p_target_environment='personal' then null else project_id end,supplier_id=case when p_target_environment='personal' then null else supplier_id end,notes=concat_ws(E'\n',notes,'Mudança de ambiente: '||trim(p_reason)) where id=p_entry_id;return public.finance_entry_json(p_entry_id,public.can_access_finance_environment(p_target_environment,target_owner,'view_values'));end $$;

create or replace function public.create_installment_entries(p_entry_id uuid,p_installment_count integer,p_first_due_date date) returns uuid[] language plpgsql security definer set search_path=public,pg_temp as $$
declare e public.financial_entries%rowtype;group_id uuid;ids uuid[]:='{}';total_cents bigint;base_cents bigint;remainder bigint;i integer;part numeric;new_id uuid;begin select * into e from public.financial_entries where id=p_entry_id;if not found or not public.can_access_finance_environment(e.environment,e.owner_user_id,'manage_installments') then raise exception 'Sem permissão para parcelar.';end if;if p_installment_count<2 or p_installment_count>360 then raise exception 'Quantidade de parcelas inválida.';end if;if exists(select 1 from public.financial_entry_payments where financial_entry_id=p_entry_id and archived_at is null) then raise exception 'Não é possível parcelar um lançamento com baixa.';end if;insert into public.financial_installment_groups(environment,owner_user_id,description,total_amount,installment_count,first_due_date,created_by) values(e.environment,e.owner_user_id,e.description,e.amount,p_installment_count,p_first_due_date,auth.uid()) returning id into group_id;total_cents:=round(e.amount*100);base_cents:=total_cents/p_installment_count;remainder:=total_cents%p_installment_count;for i in 1..p_installment_count loop part:=(base_cents+case when i<=remainder then 1 else 0 end)::numeric/100;if i=1 then update public.financial_entries set amount=part,due_date=p_first_due_date,installment_group_id=group_id,installment_number=1,installment_count=p_installment_count where id=e.id returning id into new_id;else insert into public.financial_entries(environment,owner_user_id,entry_type,description,amount,competence_date,due_date,status,category_id,subcategory_id,account_id,card_id,client_id,supplier_id,project_id,cost_center_id,payment_method_id,installment_group_id,installment_number,installment_count,notes,created_by,updated_by) values(e.environment,e.owner_user_id,e.entry_type,e.description||' ('||i||'/'||p_installment_count||')',part,e.competence_date,(p_first_due_date+(i-1)*interval '1 month')::date,e.status,e.category_id,e.subcategory_id,e.account_id,e.card_id,e.client_id,e.supplier_id,e.project_id,e.cost_center_id,e.payment_method_id,group_id,i,p_installment_count,e.notes,auth.uid(),auth.uid()) returning id into new_id;end if;ids:=array_append(ids,new_id);end loop;return ids;end $$;

create or replace function public.create_recurring_entries(p_as_of_date date default current_date) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare r record;new_id uuid;count_value integer:=0;next_date date;begin for r in select * from public.financial_recurring_rules where active and archived_at is null and next_generation_date<=p_as_of_date and (ends_on is null or next_generation_date<=ends_on) and public.can_access_finance_environment(environment,owner_user_id,'manage_recurrence') loop if not exists(select 1 from public.financial_recurring_occurrences where rule_id=r.id and occurrence_date=r.next_generation_date) then insert into public.financial_entries(environment,owner_user_id,entry_type,description,amount,competence_date,due_date,status,category_id,account_id,card_id,client_id,supplier_id,project_id,cost_center_id,recurring_rule_id,created_by,updated_by) values(r.environment,r.owner_user_id,r.entry_type,r.description,r.amount,r.next_generation_date,r.next_generation_date,'forecast',r.category_id,r.account_id,r.card_id,r.client_id,r.supplier_id,r.project_id,r.cost_center_id,r.id,auth.uid(),auth.uid()) returning id into new_id;insert into public.financial_recurring_occurrences(rule_id,occurrence_date,financial_entry_id) values(r.id,r.next_generation_date,new_id);count_value:=count_value+1;end if;next_date:=case r.frequency when 'daily' then r.next_generation_date+r.interval_value when 'weekly' then r.next_generation_date+(r.interval_value*7) when 'monthly' then (r.next_generation_date+(r.interval_value||' month')::interval)::date when 'quarterly' then (r.next_generation_date+(r.interval_value*3||' month')::interval)::date else (r.next_generation_date+(r.interval_value||' year')::interval)::date end;update public.financial_recurring_rules set next_generation_date=next_date where id=r.id;end loop;return count_value;end $$;

create or replace function public.create_financial_transfer(p_payload jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare source_account public.financial_accounts%rowtype;dest_account public.financial_accounts%rowtype;transfer_id uuid;source_entry uuid;dest_entry uuid;amount_value numeric;begin select * into source_account from public.financial_accounts where id=public.safe_uuid(p_payload->>'source_account_id');select * into dest_account from public.financial_accounts where id=public.safe_uuid(p_payload->>'destination_account_id');if source_account.id is null or dest_account.id is null or source_account.id=dest_account.id then raise exception 'Contas da transferência inválidas.';end if;if not(public.can_access_finance_environment(source_account.environment,source_account.owner_user_id,'manage_transfers') and public.can_access_finance_environment(dest_account.environment,dest_account.owner_user_id,'manage_transfers')) then raise exception 'Sem permissão para transferir entre as contas.';end if;amount_value:=round((p_payload->>'amount')::numeric,2);if amount_value<=0 then raise exception 'Valor inválido.';end if;insert into public.financial_transfers(transfer_type,source_environment,destination_environment,source_account_id,destination_account_id,amount,transfer_date,description,notes,created_by) values(coalesce(nullif(p_payload->>'transfer_type',''),'internal_transfer'),source_account.environment,dest_account.environment,source_account.id,dest_account.id,amount_value,(p_payload->>'transfer_date')::date,trim(p_payload->>'description'),nullif(trim(p_payload->>'notes'),''),auth.uid()) returning id into transfer_id;insert into public.financial_entries(environment,owner_user_id,entry_type,description,amount,competence_date,due_date,status,account_id,transfer_id,transfer_side,created_by,updated_by,settled_at,settled_by) values(source_account.environment,source_account.owner_user_id,'expense',trim(p_payload->>'description'),amount_value,(p_payload->>'transfer_date')::date,(p_payload->>'transfer_date')::date,'paid',source_account.id,transfer_id,'source',auth.uid(),auth.uid(),now(),auth.uid()) returning id into source_entry;insert into public.financial_entries(environment,owner_user_id,entry_type,description,amount,competence_date,due_date,status,account_id,transfer_id,transfer_side,created_by,updated_by,settled_at,settled_by) values(dest_account.environment,dest_account.owner_user_id,'income',trim(p_payload->>'description'),amount_value,(p_payload->>'transfer_date')::date,(p_payload->>'transfer_date')::date,'received',dest_account.id,transfer_id,'destination',auth.uid(),auth.uid(),now(),auth.uid()) returning id into dest_entry;insert into public.financial_entry_payments(financial_entry_id,environment,account_id,amount,net_amount,paid_at,notes,created_by) values(source_entry,source_account.environment,source_account.id,amount_value,amount_value,now(),'Saída de transferência',auth.uid()),(dest_entry,dest_account.environment,dest_account.id,amount_value,amount_value,now(),'Entrada de transferência',auth.uid());update public.financial_transfers set source_entry_id=source_entry,destination_entry_id=dest_entry where id=transfer_id;return transfer_id;end $$;

create or replace function public.get_financial_report(p_environment text,p_report_code text,p_filters jsonb default '{}'::jsonb) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare include_values boolean;result jsonb;begin if p_environment='consolidated' then if not(public.can_access_finance_environment('personal',auth.uid(),'view') and public.can_access_finance_environment('professional',null,'view') and public.has_permission('finance_professional','view_consolidated','own')) then raise exception 'Sem acesso ao consolidado.';end if;include_values:=public.can_access_finance_environment('personal',auth.uid(),'view_values') and public.can_access_finance_environment('professional',null,'view_values');else if not public.can_access_finance_environment(p_environment,case when p_environment='personal' then auth.uid() else null end,'view') then raise exception 'Sem acesso ao ambiente.';end if;include_values:=public.can_access_finance_environment(p_environment,case when p_environment='personal' then auth.uid() else null end,'view_values');end if;if not include_values then raise exception 'Sem permissão para visualizar valores do relatório.';end if;
 if p_report_code='by_client' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from(select coalesce(client_name,'Sem cliente') cliente,sum(amount) valor,count(*) quantidade from public.financial_report_base_view e where e.entry_type='income' and e.archived_at is null and (p_environment='consolidated' or e.environment=p_environment) and public.can_access_finance_environment(e.environment,e.owner_user_id,'view') group by client_name order by valor desc)x;
 elsif p_report_code='by_project' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from(select coalesce(project_name,'Sem projeto') projeto,sum(amount) valor,count(*) quantidade from public.financial_report_base_view e where e.entry_type='income' and e.archived_at is null and (p_environment='consolidated' or e.environment=p_environment) and public.can_access_finance_environment(e.environment,e.owner_user_id,'view') group by project_name order by valor desc)x;
 elsif p_report_code='by_supplier' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from(select coalesce(supplier_name,'Sem fornecedor') fornecedor,sum(amount) valor,count(*) quantidade from public.financial_report_base_view e where e.entry_type='expense' and e.archived_at is null and (p_environment='consolidated' or e.environment=p_environment) and public.can_access_finance_environment(e.environment,e.owner_user_id,'view') group by supplier_name order by valor desc)x;
 elsif p_report_code='by_category' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from(select coalesce(category_name,'Sem categoria') categoria,sum(amount) valor,count(*) quantidade from public.financial_report_base_view e where e.entry_type='expense' and e.archived_at is null and (p_environment='consolidated' or e.environment=p_environment) and public.can_access_finance_environment(e.environment,e.owner_user_id,'view') group by category_name order by valor desc)x;
 elsif p_report_code='transfers' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from(select transfer_type tipo,transfer_date data,description descricao,amount valor,source_environment origem,destination_environment destino from public.financial_transfers t where cancelled_at is null and public.can_access_finance_environment(source_environment,(select owner_user_id from public.financial_entries where id=source_entry_id),'view') order by transfer_date desc)x;
 else select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from(select competence_date competencia,description descricao,case when entry_type='income' then 'Receita' else 'Despesa' end tipo,effective_status status,amount valor,paid_amount realizado,open_amount em_aberto,category_name categoria,client_name cliente,project_name projeto,supplier_name fornecedor from public.financial_report_base_view e where e.archived_at is null and (p_environment='consolidated' or e.environment=p_environment) and public.can_access_finance_environment(e.environment,e.owner_user_id,'view') and (p_report_code not in('income','receivables') or e.entry_type='income') and (p_report_code not in('expenses','payables') or e.entry_type='expense') and (p_report_code not in('receivables','payables','delinquency') or e.open_amount>0) and (p_report_code<>'delinquency' or e.effective_status='overdue') order by competence_date desc)x;end if;return result;end $$;

create or replace function public.get_dashboard_summary(p_include_financial boolean default false) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;income_value numeric:=0;expense_value numeric:=0;begin if p_include_financial and public.can_access_finance_environment('professional',null,'view_values') then select coalesce(sum(paid_amount) filter(where entry_type='income'),0),coalesce(sum(paid_amount) filter(where entry_type='expense'),0) into income_value,expense_value from public.financial_entry_balance_view where environment='professional' and archived_at is null and public.can_access_finance_environment(environment,owner_user_id,'view');end if;select jsonb_build_object('projects',(select count(*) from public.projects p where p.stage<>'completed' and public.can_access_project(p.id)),'late',(select count(*) from public.projects p where p.main_deadline<current_date and p.stage<>'completed' and public.can_access_project(p.id)),'activities',(select count(*) from public.project_activities a where a.status<>'completed' and a.archived_at is null and public.can_access_activity(a.id)),'clients',(select count(*) from public.clients c where c.archived_at is null and public.can_access_client(c.id)),'income',income_value,'expense',expense_value) into result;return result;end $$;
create or replace function public.get_report_summary(p_include_financial boolean default false) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare receivable numeric:=0;payable numeric:=0;begin if p_include_financial and public.can_access_finance_environment('professional',null,'view_values') then select coalesce(sum(open_amount) filter(where entry_type='income'),0),coalesce(sum(open_amount) filter(where entry_type='expense'),0) into receivable,payable from public.financial_entry_balance_view where environment='professional' and archived_at is null and public.can_access_finance_environment(environment,owner_user_id,'view');end if;return jsonb_build_object('projects',(select count(*) from public.projects p where public.can_access_project(p.id)),'activities',(select count(*) from public.project_activities a where public.can_access_activity(a.id)),'overdue',(select count(*) from public.projects p where p.main_deadline<current_date and p.stage<>'completed' and public.can_access_project(p.id)),'receivable',receivable,'payable',payable,'net',receivable-payable);end $$;
create or replace function public.get_project_financial_entries(p_project_id uuid) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$ begin if not public.can_edit_project(p_project_id) and not public.can_access_project(p_project_id) then raise exception 'Sem acesso ao projeto.';end if;if not public.can_access_finance_environment('professional',null,'view_values') then raise exception 'Sem permissão para visualizar valores.';end if;return coalesce((select jsonb_agg(jsonb_build_object('id',id,'project_id',project_id,'entry_type',entry_type,'description',description,'amount',amount,'competence_date',competence_date,'due_date',due_date,'status',effective_status,'notes',notes,'created_at',created_at) order by competence_date desc) from public.financial_entry_balance_view where project_id=p_project_id and environment='professional' and archived_at is null),'[]'::jsonb);end $$;


-- Operações complementares: aprovação, estorno de baixa e cancelamento de transferência
create unique index if not exists financial_approvals_one_pending_per_record on public.financial_approvals(record_type,record_id) where decision='pending';

create or replace function public.ensure_financial_approval() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.status='awaiting_approval' and (tg_op='INSERT' or old.status is distinct from new.status) then
    insert into public.financial_approvals(environment,owner_user_id,record_type,record_id,requested_by)
    select new.environment,new.owner_user_id,'financial_entry',new.id,coalesce(auth.uid(),new.created_by)
    where not exists(select 1 from public.financial_approvals where record_type='financial_entry' and record_id=new.id and decision='pending');
  end if;
  return new;
end $$;
drop trigger if exists financial_entries_approval_request on public.financial_entries;
create trigger financial_entries_approval_request after insert or update of status on public.financial_entries for each row execute function public.ensure_financial_approval();

create or replace function public.review_financial_approval(p_approval_id uuid,p_decision text,p_reason text default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.financial_approvals%rowtype; result_value jsonb;
begin
  select * into a from public.financial_approvals where id=p_approval_id for update;
  if not found or a.decision<>'pending' then raise exception 'Solicitação não encontrada ou já analisada.'; end if;
  if p_decision not in('approved','rejected') then raise exception 'Decisão inválida.'; end if;
  if not public.can_access_finance_environment(a.environment,a.owner_user_id,'approve') then raise exception 'Sem permissão para aprovar.'; end if;
  update public.financial_approvals set decision=p_decision,reason=nullif(trim(coalesce(p_reason,'')),''),reviewed_by=auth.uid(),reviewed_at=now() where id=a.id;
  if a.record_type='financial_entry' then
    update public.financial_entries set status=case when p_decision='approved' then 'pending' else 'under_review' end,
      approved_by=case when p_decision='approved' then auth.uid() else approved_by end,
      approved_at=case when p_decision='approved' then now() else approved_at end,
      notes=concat_ws(E'\n',notes,case when p_decision='approved' then 'Aprovação financeira: ' else 'Devolvido para análise: ' end||coalesce(nullif(trim(coalesce(p_reason,'')),''),'Sem observação.'))
    where id=a.record_id;
    result_value:=public.finance_entry_json(a.record_id,public.can_access_finance_environment(a.environment,a.owner_user_id,'view_values'));
  else result_value:=to_jsonb(a); end if;
  return result_value;
end $$;

create or replace function public.reverse_financial_payment(p_payment_id uuid,p_reason text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.financial_entry_payments%rowtype; e public.financial_entries%rowtype;
begin
  select * into p from public.financial_entry_payments where id=p_payment_id and archived_at is null for update;
  if not found then raise exception 'Baixa não encontrada.'; end if;
  select * into e from public.financial_entries where id=p.financial_entry_id;
  if not public.can_access_finance_environment(e.environment,e.owner_user_id,'settle') then raise exception 'Sem permissão para estornar a baixa.'; end if;
  if length(trim(coalesce(p_reason,'')))<5 then raise exception 'Informe o motivo do estorno.'; end if;
  update public.financial_entry_payments set archived_at=now(),archived_by=auth.uid(),notes=concat_ws(E'\n',notes,'Estorno: '||trim(p_reason)),updated_at=now() where id=p.id;
  perform public.refresh_financial_entry_status(e.id);
  return public.finance_entry_json(e.id,public.can_access_finance_environment(e.environment,e.owner_user_id,'view_values'));
end $$;

create or replace function public.cancel_financial_transfer(p_transfer_id uuid,p_reason text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.financial_transfers%rowtype; source_owner uuid; destination_owner uuid;
begin
  select * into t from public.financial_transfers where id=p_transfer_id and cancelled_at is null for update;
  if not found then raise exception 'Transferência não encontrada ou já cancelada.'; end if;
  select owner_user_id into source_owner from public.financial_entries where id=t.source_entry_id;
  select owner_user_id into destination_owner from public.financial_entries where id=t.destination_entry_id;
  if not(public.can_access_finance_environment(t.source_environment,source_owner,'manage_transfers') and public.can_access_finance_environment(t.destination_environment,destination_owner,'manage_transfers')) then raise exception 'Sem permissão para cancelar a transferência.'; end if;
  if length(trim(coalesce(p_reason,'')))<5 then raise exception 'Informe o motivo do cancelamento.'; end if;
  update public.financial_transfers set cancelled_at=now(),cancelled_by=auth.uid(),notes=concat_ws(E'\n',notes,'Cancelamento: '||trim(p_reason)) where id=t.id;
  update public.financial_entries set status='cancelled',cancelled_at=now(),cancelled_by=auth.uid(),notes=concat_ws(E'\n',notes,'Transferência cancelada: '||trim(p_reason)) where id in(t.source_entry_id,t.destination_entry_id);
end $$;

-- 11. Ajuste das views do cliente para o novo saldo
create or replace view public.client_financial_entries_view with(security_invoker=true) as
select f.id,coalesce(f.client_id,p.client_id) client_id,f.description,f.entry_type,f.amount,f.due_date,f.settled_at,f.effective_status status,f.project_id,p.name project_name,f.paid_amount,f.open_amount
from public.financial_entry_balance_view f left join public.projects p on p.id=f.project_id where f.environment='professional' and f.archived_at is null and coalesce(f.client_id,p.client_id) is not null;
revoke all on public.client_financial_entries_view,public.client_financial_summary_view from public,anon,authenticated;

-- 12. Configurações, categorias e dados iniciais
insert into public.system_settings(key,value,description) values
('finance_currency','"BRL"'::jsonb,'Moeda do módulo financeiro'),
('finance_default_environment','"professional"'::jsonb,'Ambiente financeiro padrão'),
('finance_require_approval','false'::jsonb,'Exigir aprovação de lançamentos'),
('finance_require_environment_change_approval','true'::jsonb,'Exigir aprovação para mudança de ambiente'),
('finance_allow_negative_balance','false'::jsonb,'Permitir saldo negativo'),
('finance_negative_balance_warning','true'::jsonb,'Alertar projeção de saldo negativo'),
('finance_recurring_generation_days','7'::jsonb,'Antecedência da geração recorrente')
on conflict(key) do update set description=excluded.description,updated_at=now();

insert into public.financial_payment_methods(environment,owner_user_id,name,type,position) values
('professional',null,'PIX','pix',10),('professional',null,'Transferência','transfer',20),('professional',null,'Dinheiro','cash',30),('professional',null,'Boleto','boleto',40),('professional',null,'Cartão de débito','debit',50),('professional',null,'Cartão de crédito','credit',60)
on conflict do nothing;
insert into public.financial_categories(environment,owner_user_id,entry_type,name,code,color,position) values
('professional',null,'income','Receitas de projetos','project_income','#52705c',10),('professional',null,'expense','Despesas operacionais','operating_expense','#9b6352',10),('professional',null,'expense','Impostos e taxas','taxes','#8b6a3d',20)
on conflict do nothing;

-- 13. Grants e hardening
DO $$ declare t text;begin foreach t in array array['financial_environment_access','financial_installment_groups','financial_accounts','financial_categories','financial_payment_methods','financial_cost_centers','financial_suppliers','financial_templates','financial_recurring_rules','financial_recurring_occurrences','financial_cards','financial_card_statements','financial_entry_adjustments','financial_transfers','financial_approvals','financial_entry_payments'] loop execute format('revoke all on public.%I from anon',t);execute format('grant select,insert,update,delete on public.%I to authenticated',t);end loop;end $$;
revoke all on public.financial_entries from anon,authenticated;
revoke all on public.financial_entry_balance_view,public.financial_account_balance_view,public.financial_cash_flow_view,public.financial_receivables_view,public.financial_payables_view,public.financial_report_base_view from public,anon,authenticated;

DO $$ declare f record;begin for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('safe_date','finance_permission_action','can_access_finance_environment','can_view_finance','can_view_finance_values','can_access_financial_entry','can_manage_finance_access','get_financial_entry','get_finance_workspace','save_financial_entry','duplicate_financial_entry','archive_financial_entry','reactivate_financial_entry','cancel_financial_entry','settle_financial_entry','change_financial_environment','create_installment_entries','create_recurring_entries','create_financial_transfer','review_financial_approval','reverse_financial_payment','cancel_financial_transfer','get_financial_report','get_dashboard_summary','get_report_summary','get_project_financial_entries') loop execute format('revoke all on function %s from public,anon',f.sig);execute format('grant execute on function %s to authenticated',f.sig);end loop;end $$;
revoke all on function public.finance_entry_json(uuid,boolean),public.refresh_financial_entry_status(uuid) from public,anon,authenticated;

-- 14. Versão
insert into public.system_versions(version,notes,environment) values('3.0.9','Etapa 08: financeiro pessoal e profissional/CNPJ, contas, cartões, categorias, baixas, parcelamentos, recorrências, transferências, fluxo de caixa, relatórios e RLS por ambiente.','production')
on conflict(version) do update set notes=excluded.notes,environment=excluded.environment,released_at=now();

commit;
