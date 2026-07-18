select exists(select 1 from public.system_versions where version='3.0.11') as version_3011,
       (select value from public.system_settings where key='app_minimum_viewport_width') as minimum_viewport,
       (select value from public.system_settings where key='app_accessibility_baseline') as accessibility_baseline;
select count(*) as stage10_indexes
from pg_indexes where schemaname='public' and indexname like 'idx_stage10_%';
select count(*) as anon_security_definer_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where p.prosecdef and n.nspname not in('pg_catalog','information_schema')
  and exists(select 1 from pg_roles r where r.rolname='anon' and has_function_privilege('anon',p.oid,'EXECUTE'));
