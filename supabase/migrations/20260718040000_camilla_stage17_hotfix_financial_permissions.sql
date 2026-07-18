begin;

-- Hotfix da Etapa 17
-- Corrige o bloqueio da tabela projects causado por privilégios por coluna e
-- mantém os valores contratuais confidenciais em uma tabela protegida.

create table if not exists public.project_contract_financials (
  project_id uuid primary key references public.projects(id) on delete cascade,
  contract_value numeric(18,2) not null default 0 check (contract_value >= 0),
  legacy_amount_received numeric(18,2) not null default 0 check (legacy_amount_received >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.project_contract_financials enable row level security;

-- Preserva os valores que ainda estão nas colunas legadas de projects.
insert into public.project_contract_financials(
  project_id,
  contract_value,
  legacy_amount_received,
  updated_at,
  updated_by
)
select
  project.id,
  greatest(coalesce(project.contract_value,0),0)::numeric(18,2),
  greatest(coalesce(project.amount_received,0),0)::numeric(18,2),
  now(),
  auth.uid()
from public.projects project
on conflict(project_id) do update
set
  contract_value = case
    when excluded.contract_value > 0 then excluded.contract_value
    else project_contract_financials.contract_value
  end,
  legacy_amount_received = greatest(
    project_contract_financials.legacy_amount_received,
    excluded.legacy_amount_received
  ),
  updated_at = now(),
  updated_by = coalesce(auth.uid(),project_contract_financials.updated_by);

-- As colunas legadas permanecem apenas por compatibilidade estrutural. Os
-- valores reais ficam na tabela protegida acima. Isso permite restaurar o
-- SELECT normal em projects sem expor valores financeiros a outros perfis.
do $$
begin
  if exists(select 1 from pg_trigger where tgrelid='public.projects'::regclass and tgname='projects_history' and not tgisinternal) then
    execute 'alter table public.projects disable trigger projects_history';
  end if;
  if exists(select 1 from pg_trigger where tgrelid='public.projects'::regclass and tgname='projects_set_updated_at' and not tgisinternal) then
    execute 'alter table public.projects disable trigger projects_set_updated_at';
  end if;
end
$$;

update public.projects
set contract_value=0,
    amount_received=0
where coalesce(contract_value,0)<>0
   or coalesce(amount_received,0)<>0;

-- balance_due é uma coluna GENERATED ALWAYS calculada automaticamente como
-- greatest(contract_value - amount_received, 0). Ela não pode receber UPDATE
-- direto e será recalculada pelo PostgreSQL após a atualização acima.

do $$
begin
  if exists(select 1 from pg_trigger where tgrelid='public.projects'::regclass and tgname='projects_history' and not tgisinternal) then
    execute 'alter table public.projects enable trigger projects_history';
  end if;
  if exists(select 1 from pg_trigger where tgrelid='public.projects'::regclass and tgname='projects_set_updated_at' and not tgisinternal) then
    execute 'alter table public.projects enable trigger projects_set_updated_at';
  end if;
end
$$;

create or replace function public.protect_project_legacy_financial_columns()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  new.contract_value:=0;
  new.amount_received:=0;
  -- balance_due é GENERATED ALWAYS e será recalculado automaticamente.
  return new;
end
$$;

drop trigger if exists projects_protect_legacy_financial_columns on public.projects;
create trigger projects_protect_legacy_financial_columns
before insert or update of contract_value,amount_received on public.projects
for each row execute function public.protect_project_legacy_financial_columns();

create or replace function public.is_financial_administrator()
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select public.current_user_access_valid()
     and exists(
       select 1
       from public.profiles profile
       join public.permission_profiles permission_profile
         on permission_profile.id=profile.permission_profile_id
       where profile.id=auth.uid()
         and profile.active=true
         and profile.archived_at is null
         and profile.blocked_at is null
         and permission_profile.active=true
         and permission_profile.archived_at is null
         and permission_profile.code in('administrator','owner')
     )
$$;

-- Administrador e proprietário têm acesso integral ao ambiente profissional.
-- O ambiente pessoal continua desativado.
create or replace function public.can_access_finance_environment(
  p_environment text,
  p_owner_user_id uuid,
  p_action text default 'view'
)
returns boolean
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
begin
  if auth.uid() is null then return false; end if;
  if p_environment<>'professional' then return false; end if;
  return public.is_financial_administrator();
end
$$;

create or replace function public.get_project_financial_summary(p_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  result jsonb;
begin
  if not public.is_financial_administrator() then
    raise exception 'Informações financeiras restritas ao nível administrador.';
  end if;
  if not public.can_access_project(p_project_id) then
    raise exception 'Sem acesso ao projeto.';
  end if;

  with totals as (
    select
      coalesce(sum(entry.paid_amount) filter(
        where entry.entry_type='income'
          and entry.archived_at is null
          and entry.status<>'cancelled'
      ),0)::numeric(18,2) as received_from_entries,
      count(*) filter(
        where entry.entry_type='income'
          and entry.archived_at is null
          and entry.status<>'cancelled'
      )::integer as active_income_entries,
      coalesce(sum(entry.open_amount) filter(
        where entry.entry_type='income'
          and entry.archived_at is null
          and entry.status<>'cancelled'
          and entry.effective_status='overdue'
      ),0)::numeric(18,2) as overdue_amount,
      min(entry.due_date) filter(
        where entry.entry_type='income'
          and entry.archived_at is null
          and entry.status<>'cancelled'
          and entry.open_amount>0
          and entry.due_date is not null
      ) as next_due_date
    from public.financial_entry_balance_view entry
    where entry.project_id=p_project_id
      and entry.environment='professional'
  )
  select jsonb_build_object(
    'project_id',project.id,
    'project_code',project.code,
    'project_name',project.name,
    'client_id',project.client_id,
    'client_name',client.name,
    'contract_value',coalesce(contract.contract_value,0),
    'legacy_amount_received',coalesce(contract.legacy_amount_received,0),
    'received_from_entries',totals.received_from_entries,
    'amount_received',greatest(coalesce(contract.legacy_amount_received,0),totals.received_from_entries),
    'balance_due',greatest(
      coalesce(contract.contract_value,0)
      - greatest(coalesce(contract.legacy_amount_received,0),totals.received_from_entries),
      0
    ),
    'active_income_entries',totals.active_income_entries,
    'overdue_amount',totals.overdue_amount,
    'next_due_date',totals.next_due_date
  ) into result
  from public.projects project
  left join public.clients client on client.id=project.client_id
  left join public.project_contract_financials contract on contract.project_id=project.id
  cross join totals
  where project.id=p_project_id;

  if result is null then raise exception 'Projeto não encontrado.'; end if;
  return result;
end
$$;

create or replace function public.list_project_financial_summaries()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.is_financial_administrator() then
    raise exception 'Informações financeiras restritas ao nível administrador.';
  end if;

  return coalesce((
    with entry_totals as (
      select
        entry.project_id,
        coalesce(sum(entry.paid_amount) filter(
          where entry.entry_type='income'
            and entry.archived_at is null
            and entry.status<>'cancelled'
        ),0)::numeric(18,2) as received_from_entries,
        count(*) filter(
          where entry.entry_type='income'
            and entry.archived_at is null
            and entry.status<>'cancelled'
        )::integer as active_income_entries,
        coalesce(sum(entry.open_amount) filter(
          where entry.entry_type='income'
            and entry.archived_at is null
            and entry.status<>'cancelled'
            and entry.effective_status='overdue'
        ),0)::numeric(18,2) as overdue_amount,
        min(entry.due_date) filter(
          where entry.entry_type='income'
            and entry.archived_at is null
            and entry.status<>'cancelled'
            and entry.open_amount>0
            and entry.due_date is not null
        ) as next_due_date
      from public.financial_entry_balance_view entry
      where entry.environment='professional'
        and entry.project_id is not null
      group by entry.project_id
    )
    select jsonb_agg(
      jsonb_build_object(
        'project_id',project.id,
        'project_code',project.code,
        'project_name',project.name,
        'client_id',project.client_id,
        'client_name',client.name,
        'contract_value',coalesce(contract.contract_value,0),
        'legacy_amount_received',coalesce(contract.legacy_amount_received,0),
        'received_from_entries',coalesce(totals.received_from_entries,0),
        'amount_received',greatest(
          coalesce(contract.legacy_amount_received,0),
          coalesce(totals.received_from_entries,0)
        ),
        'balance_due',greatest(
          coalesce(contract.contract_value,0)
          - greatest(
              coalesce(contract.legacy_amount_received,0),
              coalesce(totals.received_from_entries,0)
            ),
          0
        ),
        'active_income_entries',coalesce(totals.active_income_entries,0),
        'overdue_amount',coalesce(totals.overdue_amount,0),
        'next_due_date',totals.next_due_date
      ) order by project.code
    )
    from public.projects project
    left join public.clients client on client.id=project.client_id
    left join public.project_contract_financials contract on contract.project_id=project.id
    left join entry_totals totals on totals.project_id=project.id
    where project.archived_at is null
      and public.can_access_project(project.id)
  ),'[]'::jsonb);
end
$$;

create or replace function public.set_project_contract_value(
  p_project_id uuid,
  p_contract_value numeric
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.is_financial_administrator() then
    raise exception 'Somente administradores podem alterar o valor do contrato.';
  end if;
  if not public.can_access_project(p_project_id) then
    raise exception 'Sem acesso ao projeto.';
  end if;
  if p_contract_value is null or p_contract_value<0 then
    raise exception 'O valor do contrato deve ser igual ou superior a zero.';
  end if;

  insert into public.project_contract_financials(
    project_id,
    contract_value,
    legacy_amount_received,
    updated_at,
    updated_by
  )
  values(
    p_project_id,
    round(p_contract_value,2),
    0,
    now(),
    auth.uid()
  )
  on conflict(project_id) do update
  set contract_value=excluded.contract_value,
      updated_at=now(),
      updated_by=auth.uid();

  return public.get_project_financial_summary(p_project_id);
end
$$;

-- Restaura a leitura operacional de projects para o PostgREST. Os valores
-- confidenciais nessa tabela são permanentemente neutralizados pelo trigger.
grant select on public.projects to authenticated;

revoke all on public.project_contract_financials from public,anon,authenticated;
grant select on public.project_contract_financials to authenticated;

drop policy if exists project_contract_financials_admin_select on public.project_contract_financials;
create policy project_contract_financials_admin_select
on public.project_contract_financials
for select to authenticated
using(public.is_financial_administrator());

revoke all on function public.protect_project_legacy_financial_columns() from public,anon;
revoke all on function public.is_financial_administrator() from public,anon;
revoke all on function public.can_access_finance_environment(text,uuid,text) from public,anon;
revoke all on function public.get_project_financial_summary(uuid) from public,anon;
revoke all on function public.list_project_financial_summaries() from public,anon;
revoke all on function public.set_project_contract_value(uuid,numeric) from public,anon;

grant execute on function public.is_financial_administrator() to authenticated;
grant execute on function public.can_access_finance_environment(text,uuid,text) to authenticated;
grant execute on function public.get_project_financial_summary(uuid) to authenticated;
grant execute on function public.list_project_financial_summaries() to authenticated;
grant execute on function public.set_project_contract_value(uuid,numeric) to authenticated;

create index if not exists idx_project_contract_financials_updated
  on public.project_contract_financials(updated_at desc);

insert into public.system_versions(version,notes,environment)
values(
  '3.0.18',
  'Hotfix corrigido da Etapa 17: restaura o acesso operacional a projects, preserva valores contratuais em tabela protegida, garante acesso financeiro à administradora, exibe saldos por projeto e respeita balance_due como coluna gerada.',
  'production'
)
on conflict(version) do update
set notes=excluded.notes,
    environment=excluded.environment;

commit;
