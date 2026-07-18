select public.is_financial_administrator() as current_user_is_financial_admin;
select grantee,privilege_type from information_schema.routine_privileges where routine_schema='public' and routine_name in('create_project_with_contract','set_project_contract_value') order by routine_name,grantee;
select policyname,cmd,roles,qual from pg_policies where schemaname='public' and tablename='project_contract_financials';
