-- Deve retornar uma linha por verificação, todas com ok=true.
select 'versao_3_0_16' as check_name,exists(select 1 from public.system_versions where version='3.0.16') as ok;
select 'projects_finance_columns' as check_name,count(*)=3 as ok
from information_schema.columns where table_schema='public' and table_name='projects' and column_name in('contract_value','amount_received','balance_due');
select 'finance_balance_view' as check_name,to_regclass('public.financial_entry_balance_view') is not null as ok;
select 'permission_profiles' as check_name,to_regclass('public.permission_profiles') is not null as ok;
select 'stage17_not_applied' as check_name,not exists(select 1 from public.system_versions where version='3.0.17') as ok;
