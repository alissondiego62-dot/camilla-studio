select n.nspname as schema_name,p.proname,pg_get_function_identity_arguments(p.oid) arguments
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where p.prosecdef and n.nspname not in('pg_catalog','information_schema')
  and exists (
    select 1
    from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) privilege
    left join pg_roles role_row on role_row.oid=privilege.grantee
    where privilege.privilege_type='EXECUTE'
      and (privilege.grantee=0 or role_row.rolname='anon')
  )
order by 1,2;
-- Resultado esperado: zero linhas.
