-- Etapa 09 — verificação estrutural de RLS.
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in('report_export_audit','google_drive_operations','google_drive_shares') order by c.relname;
select tablename,policyname,cmd,roles,qual,with_check from pg_policies where schemaname='public' and tablename in('report_export_audit','google_drive_operations','google_drive_shares','project_files','google_drive_connections','google_drive_settings') order by tablename,policyname;
select n.nspname,p.proname,prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('get_dashboard_workspace','get_operational_report','get_report_filter_options','register_report_export','get_google_drive_workspace');
select has_schema_privilege('authenticated','integration_private','USAGE') as authenticated_private_schema_usage,
       has_schema_privilege('anon','integration_private','USAGE') as anon_private_schema_usage;
-- Os dois privilégios acima devem retornar false.
