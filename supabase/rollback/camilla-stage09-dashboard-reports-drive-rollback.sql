-- Etapa 09 — reversão conservadora. Preserva auditoria, metadados, vínculos e arquivos externos.
begin;
drop function if exists public.get_dashboard_workspace(jsonb,boolean);
drop function if exists public.get_operational_report(text,jsonb,integer,integer);
drop function if exists public.get_report_filter_options();
drop function if exists public.register_report_export(text,text,jsonb,integer);
drop function if exists public.get_google_drive_workspace();
drop function if exists public.stage09_safe_date(text,date);

create or replace function public.get_dashboard_summary(p_include_financial boolean default false) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;income_value numeric:=0;expense_value numeric:=0;begin if p_include_financial and public.can_access_finance_environment('professional',null,'view_values') then select coalesce(sum(paid_amount) filter(where entry_type='income'),0),coalesce(sum(paid_amount) filter(where entry_type='expense'),0) into income_value,expense_value from public.financial_entry_balance_view where environment='professional' and archived_at is null and public.can_access_finance_environment(environment,owner_user_id,'view');end if;select jsonb_build_object('projects',(select count(*) from public.projects p where p.stage<>'completed' and public.can_access_project(p.id)),'late',(select count(*) from public.projects p where p.main_deadline<current_date and p.stage<>'completed' and public.can_access_project(p.id)),'activities',(select count(*) from public.project_activities a where a.status<>'completed' and a.archived_at is null and public.can_access_activity(a.id)),'clients',(select count(*) from public.clients c where c.archived_at is null and public.can_access_client(c.id)),'income',income_value,'expense',expense_value) into result;return result;end $$;
create or replace function public.get_report_summary(p_include_financial boolean default false) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare receivable numeric:=0;payable numeric:=0;begin if p_include_financial and public.can_access_finance_environment('professional',null,'view_values') then select coalesce(sum(open_amount) filter(where entry_type='income'),0),coalesce(sum(open_amount) filter(where entry_type='expense'),0) into receivable,payable from public.financial_entry_balance_view where environment='professional' and archived_at is null and public.can_access_finance_environment(environment,owner_user_id,'view');end if;return jsonb_build_object('projects',(select count(*) from public.projects p where public.can_access_project(p.id)),'activities',(select count(*) from public.project_activities a where public.can_access_activity(a.id)),'overdue',(select count(*) from public.projects p where p.main_deadline<current_date and p.stage<>'completed' and public.can_access_project(p.id)),'receivable',receivable,'payable',payable,'net',receivable-payable);end $$;
revoke all on function public.get_dashboard_summary(boolean),public.get_report_summary(boolean) from public,anon;
grant execute on function public.get_dashboard_summary(boolean),public.get_report_summary(boolean) to authenticated;
delete from public.system_versions where version='3.0.10';
commit;
