select 'versao_3_0_17' as check_name,exists(select 1 from public.system_versions where version='3.0.17') as ok;
select 'is_financial_administrator' as check_name,to_regprocedure('public.is_financial_administrator()') is not null as ok;
select 'project_summary_rpc' as check_name,to_regprocedure('public.get_project_financial_summary(uuid)') is not null as ok;
select 'project_summaries_rpc' as check_name,to_regprocedure('public.list_project_financial_summaries()') is not null as ok;
select 'set_contract_rpc' as check_name,to_regprocedure('public.set_project_contract_value(uuid,numeric)') is not null as ok;
select 'project_entries_rpc' as check_name,to_regprocedure('public.get_project_financial_entries(uuid)') is not null as ok;
select 'migration_functions_not_public' as check_name,
  not exists(
    select 1 from information_schema.routine_privileges
    where routine_schema='public'
      and routine_name in('is_financial_administrator','get_project_financial_summary','list_project_financial_summaries','set_project_contract_value','get_project_financial_entries')
      and grantee in('PUBLIC','anon') and privilege_type='EXECUTE'
  ) as ok;
