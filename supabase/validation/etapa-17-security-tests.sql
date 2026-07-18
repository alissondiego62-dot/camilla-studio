-- Verificações de catálogo. Os testes por usuário devem ser feitos em homologação.
select profile.code,
       count(*) filter(where permission.allowed) as allowed_finance_permissions
from public.permission_profiles profile
left join public.profile_permissions permission
  on permission.profile_id=profile.id and permission.module='finance_professional'
group by profile.code
order by profile.code;

-- Esperado: somente administrator e owner podem possuir allowed_finance_permissions > 0.
select count(*) as invalid_non_admin_finance_permissions
from public.profile_permissions permission
join public.permission_profiles profile on profile.id=permission.profile_id
where permission.module='finance_professional'
  and permission.allowed
  and profile.code not in('administrator','owner');

-- Esperado: zero grants diretos das colunas confidenciais para authenticated.
select count(*) as direct_sensitive_column_grants
from information_schema.column_privileges
where table_schema='public' and table_name='projects' and grantee='authenticated'
  and column_name in('contract_value','amount_received','balance_due');

-- Esperado: as funções possuem SECURITY DEFINER e search_path explícito.
select p.proname,p.prosecdef,pg_get_functiondef(p.oid) ilike '%set search_path%' as safe_search_path
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in('is_financial_administrator','get_project_financial_summary','list_project_financial_summaries','set_project_contract_value','get_project_financial_entries')
order by p.proname;
