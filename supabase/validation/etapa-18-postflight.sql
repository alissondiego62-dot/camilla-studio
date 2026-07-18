select to_regprocedure('public.create_project_with_contract(jsonb)') is not null as create_rpc_ok;
select to_regprocedure('public.set_project_contract_value(uuid,numeric)') is not null as set_contract_rpc_ok;
select exists(select 1 from public.system_versions where version='3.0.19') as version_ok;
select count(*) as protected_contract_rows from public.project_contract_financials;
