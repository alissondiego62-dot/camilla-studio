begin;

-- Reverte funções e privilégios estruturais da Etapa 17.
-- A matriz de permissões e os overrides removidos devem ser restaurados a
-- partir do backup realizado antes da migration, pois não é seguro adivinhar
-- quais permissões personalizadas existiam anteriormente.

drop function if exists public.set_project_contract_value(uuid,numeric);
drop function if exists public.list_project_financial_summaries();
drop function if exists public.get_project_financial_summary(uuid);
drop function if exists public.is_financial_administrator();

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

create or replace function public.get_project_financial_entries(p_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.can_access_project(p_project_id) then raise exception 'Sem acesso ao projeto.'; end if;
  if not public.can_access_finance_environment('professional',null,'view_values') then raise exception 'Sem permissão para visualizar valores.'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',id,'project_id',project_id,'entry_type',entry_type,'description',description,
      'amount',amount,'competence_date',competence_date,'due_date',due_date,
      'status',effective_status,'notes',notes,'created_at',created_at
    ) order by coalesce(due_date,competence_date) asc,created_at desc)
    from public.financial_entry_balance_view
    where project_id=p_project_id and environment='professional' and archived_at is null
  ),'[]'::jsonb);
end $$;

-- Restaura as policies legadas da tabela histórica.
drop policy if exists project_financial_select_scope on public.project_financial_entries;
drop policy if exists project_financial_insert_scope on public.project_financial_entries;
drop policy if exists project_financial_update_scope on public.project_financial_entries;
drop policy if exists project_financial_delete_scope on public.project_financial_entries;
create policy project_financial_select_scope on public.project_financial_entries for select to authenticated using(public.has_permission('finance_professional','view','own'));
create policy project_financial_insert_scope on public.project_financial_entries for insert to authenticated with check(public.has_permission('finance_professional','create','own'));
create policy project_financial_update_scope on public.project_financial_entries for update to authenticated using(public.has_permission('finance_professional','edit','own')) with check(public.has_permission('finance_professional','edit','own'));
create policy project_financial_delete_scope on public.project_financial_entries for delete to authenticated using(public.has_permission('finance_professional','cancel_entry','own'));

-- Restaura os privilégios de tabela existentes antes da Etapa 17.
grant select,insert,update on public.projects to authenticated;

revoke all on function public.can_access_finance_environment(text,uuid,text) from public,anon;
revoke all on function public.get_project_financial_entries(uuid) from public,anon;
grant execute on function public.can_access_finance_environment(text,uuid,text) to authenticated;
grant execute on function public.get_project_financial_entries(uuid) to authenticated;

delete from public.system_versions where version='3.0.17';

commit;
