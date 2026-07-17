-- Etapa 08 — relatórios e proteção de valores. Somente leitura.
select to_regprocedure('public.get_financial_report(text,text,jsonb)') is not null as report_rpc;
select to_regclass('public.financial_report_base_view') is not null as report_base;
select has_table_privilege('authenticated','public.financial_report_base_view','SELECT') as authenticated_direct_report_view;
select has_function_privilege('authenticated','public.get_financial_report(text,text,jsonb)','EXECUTE') as authenticated_report_rpc;
-- Esperado: direct_report_view=false e report_rpc=true.
select count(*) as unsupported_environment from public.financial_entries where environment not in('personal','professional');
