select to_regclass('public.projects') is not null as projects_ok;
select to_regclass('public.project_contract_financials') is not null as contract_table_ok;
select to_regprocedure('public.get_project_financial_summary(uuid)') is not null as summary_rpc_ok;
select column_name,is_generated,generation_expression from information_schema.columns where table_schema='public' and table_name='projects' and column_name='balance_due';
