begin;

-- Etapa 17: saldo contratual integrado e confidencialidade administrativa.

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
       from public.profiles p
       join public.permission_profiles pp on pp.id=p.permission_profile_id
       where p.id=auth.uid()
         and p.active=true
         and p.archived_at is null
         and p.blocked_at is null
         and pp.code in('administrator','owner')
     )
$$;

-- Perfis não administrativos deixam de receber permissões financeiras, mesmo
-- que uma configuração antiga ainda esteja gravada na matriz.
update public.profile_permissions permission
   set allowed=false,
       scope='none',
       updated_at=now()
  from public.permission_profiles profile
 where profile.id=permission.profile_id
   and (
     permission.module='finance_professional'
     or (permission.module='clients' and permission.action='view_financial')
     or (permission.module='dashboard' and permission.action='view_financial')
   )
   and profile.code not in('administrator','owner');

delete from public.user_permission_overrides override_row
using public.profiles profile
left join public.permission_profiles permission_profile on permission_profile.id=profile.permission_profile_id
where override_row.user_id=profile.id
  and (
    override_row.module='finance_professional'
    or (override_row.module='clients' and override_row.action='view_financial')
    or (override_row.module='dashboard' and override_row.action='view_financial')
  )
  and coalesce(permission_profile.code,'viewer') not in('administrator','owner');

create or replace function public.can_access_finance_environment(p_environment text,p_owner_user_id uuid,p_action text default 'view')
returns boolean
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  module_name text;
  action_name text;
  permission_ok boolean;
  delegated boolean:=false;
begin
  if auth.uid() is null or p_environment not in('personal','professional') then return false; end if;
  if not public.is_financial_administrator() then return false; end if;
  if p_environment='personal' then return false; end if;

  module_name:='finance_professional';
  action_name:=public.finance_permission_action(p_action);
  permission_ok:=public.has_permission(module_name,action_name,'own');

  select exists(
    select 1
    from public.financial_environment_access access_row
    where access_row.environment='professional'
      and access_row.user_id=auth.uid()
      and access_row.archived_at is null
      and case action_name
        when 'view' then true
        when 'view_values' then access_row.can_view_values
        when 'create' then access_row.can_create
        when 'edit' then access_row.can_edit
        when 'settle_finance' then access_row.can_settle
        when 'approve_finance' then access_row.can_approve
        when 'export' then access_row.can_export
        when 'export_values' then access_row.can_export and access_row.can_view_values
        else access_row.access_role in('owner','finance')
      end
  ) into delegated;

  return permission_ok or delegated;
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
    'contract_value',project.contract_value,
    'legacy_amount_received',project.amount_received,
    'received_from_entries',totals.received_from_entries,
    'amount_received',greatest(project.amount_received,totals.received_from_entries),
    'balance_due',greatest(project.contract_value-greatest(project.amount_received,totals.received_from_entries),0),
    'active_income_entries',totals.active_income_entries,
    'overdue_amount',totals.overdue_amount,
    'next_due_date',totals.next_due_date
  ) into result
  from public.projects project
  left join public.clients client on client.id=project.client_id
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
        'contract_value',project.contract_value,
        'legacy_amount_received',project.amount_received,
        'received_from_entries',coalesce(totals.received_from_entries,0),
        'amount_received',greatest(project.amount_received,coalesce(totals.received_from_entries,0)),
        'balance_due',greatest(project.contract_value-greatest(project.amount_received,coalesce(totals.received_from_entries,0)),0),
        'active_income_entries',coalesce(totals.active_income_entries,0),
        'overdue_amount',coalesce(totals.overdue_amount,0),
        'next_due_date',totals.next_due_date
      ) order by project.code
    )
    from public.projects project
    left join public.clients client on client.id=project.client_id
    left join entry_totals totals on totals.project_id=project.id
    where project.archived_at is null
      and public.can_access_project(project.id)
  ),'[]'::jsonb);
end
$$;

create or replace function public.set_project_contract_value(p_project_id uuid,p_contract_value numeric)
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

  update public.projects
     set contract_value=round(p_contract_value,2),
         balance_due=greatest(round(p_contract_value,2)-coalesce(amount_received,0),0),
         updated_at=now()
   where id=p_project_id;

  if not found then raise exception 'Projeto não encontrado.'; end if;
  return public.get_project_financial_summary(p_project_id);
end
$$;

create or replace function public.get_project_financial_entries(p_project_id uuid)
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
  if not public.can_access_project(p_project_id) then raise exception 'Sem acesso ao projeto.'; end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',entry.id,
      'project_id',entry.project_id,
      'entry_type',entry.entry_type,
      'description',entry.description,
      'amount',entry.amount,
      'paid_amount',entry.paid_amount,
      'open_amount',entry.open_amount,
      'competence_date',entry.competence_date,
      'due_date',entry.due_date,
      'status',entry.effective_status,
      'notes',entry.notes,
      'created_at',entry.created_at
    ) order by coalesce(entry.due_date,entry.competence_date) asc,entry.created_at desc)
    from public.financial_entry_balance_view entry
    where entry.project_id=p_project_id
      and entry.environment='professional'
      and entry.archived_at is null
      and entry.status<>'cancelled'
  ),'[]'::jsonb);
end
$$;

-- A tabela financeira legada também permanece fechada para perfis que não
-- pertencem ao nível administrativo, mesmo que uma permissão seja reativada
-- manualmente no catálogo no futuro.
drop policy if exists project_financial_select_scope on public.project_financial_entries;
drop policy if exists project_financial_insert_scope on public.project_financial_entries;
drop policy if exists project_financial_update_scope on public.project_financial_entries;
drop policy if exists project_financial_delete_scope on public.project_financial_entries;
create policy project_financial_select_scope on public.project_financial_entries
for select to authenticated using(public.is_financial_administrator() and public.has_permission('finance_professional','view','own'));
create policy project_financial_insert_scope on public.project_financial_entries
for insert to authenticated with check(public.is_financial_administrator() and public.has_permission('finance_professional','create','own'));
create policy project_financial_update_scope on public.project_financial_entries
for update to authenticated using(public.is_financial_administrator() and public.has_permission('finance_professional','edit','own'))
with check(public.is_financial_administrator() and public.has_permission('finance_professional','edit','own'));
create policy project_financial_delete_scope on public.project_financial_entries
for delete to authenticated using(public.is_financial_administrator() and public.has_permission('finance_professional','cancel_entry','own'));

-- Remove acesso direto às três colunas confidenciais. Administradores leem e
-- alteram esses valores exclusivamente pelas funções SECURITY DEFINER acima.
revoke select on public.projects from public,anon,authenticated;
grant select(
  id,code,client_id,name,project_type,subtype,stage,status,priority,responsible_name,
  deadline_stage_1,deadline_stage_2,deadline_stage_3,cover_url,notes,created_by,
  created_at,updated_at,main_deadline,responsible_user_id,archived_at
) on public.projects to authenticated;

revoke update on public.projects from public,anon,authenticated;
grant update(
  code,client_id,name,project_type,subtype,stage,status,priority,responsible_name,
  deadline_stage_1,deadline_stage_2,deadline_stage_3,cover_url,notes,updated_at,
  main_deadline,responsible_user_id,archived_at
) on public.projects to authenticated;

revoke insert on public.projects from public,anon,authenticated;
grant insert(
  code,client_id,name,project_type,subtype,stage,status,priority,responsible_name,
  deadline_stage_1,deadline_stage_2,deadline_stage_3,cover_url,notes,main_deadline,
  responsible_user_id
) on public.projects to authenticated;

revoke all on function public.can_access_finance_environment(text,uuid,text) from public,anon;
revoke all on function public.is_financial_administrator() from public,anon;
revoke all on function public.get_project_financial_summary(uuid) from public,anon;
revoke all on function public.list_project_financial_summaries() from public,anon;
revoke all on function public.set_project_contract_value(uuid,numeric) from public,anon;
revoke all on function public.get_project_financial_entries(uuid) from public,anon;

grant execute on function public.can_access_finance_environment(text,uuid,text) to authenticated;
grant execute on function public.is_financial_administrator() to authenticated;
grant execute on function public.get_project_financial_summary(uuid) to authenticated;
grant execute on function public.list_project_financial_summaries() to authenticated;
grant execute on function public.set_project_contract_value(uuid,numeric) to authenticated;
grant execute on function public.get_project_financial_entries(uuid) to authenticated;

insert into public.system_versions(version,notes,environment)
values(
  '3.0.17',
  'Etapa 17: valor do contrato, recebido e saldo a receber integrados por projeto; posição contratual no Financeiro e em Projetos; acesso financeiro restrito ao nível administrativo no frontend e no banco.',
  'production'
)
on conflict(version) do update set notes=excluded.notes,environment=excluded.environment;

commit;
