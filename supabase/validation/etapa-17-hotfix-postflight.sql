select to_regclass('public.project_contract_financials') is not null as tabela_financeira_protegida;
select to_regprocedure('public.list_project_financial_summaries()') is not null as rpc_lista_saldos;
select to_regprocedure('public.get_project_financial_summary(uuid)') is not null as rpc_saldo_projeto;
select to_regprocedure('public.set_project_contract_value(uuid,numeric)') is not null as rpc_valor_contrato;
select has_table_privilege('authenticated','public.projects','select') as projects_legivel_pelo_app;
select count(*) as projetos_protegidos from public.project_contract_financials;
select count(*) as colunas_legadas_com_valores
from public.projects
where coalesce(contract_value,0)<>0 or coalesce(amount_received,0)<>0 or coalesce(balance_due,0)<>0;
select version,notes from public.system_versions where version='3.0.18';
