-- Etapa 09 — confirmação estrutural. Todos os booleanos devem retornar true.
select
 exists(select 1 from public.system_versions where version='3.0.10') as version_3010,
 to_regclass('public.report_export_audit') is not null as report_export_audit,
 to_regclass('public.google_drive_operations') is not null as drive_operations,
 to_regclass('public.google_drive_shares') is not null as drive_shares,
 to_regclass('integration_private.google_drive_credentials') is not null as private_credentials,
 to_regclass('integration_private.google_drive_oauth_states') is not null as private_oauth_states;
select
 to_regprocedure('public.get_dashboard_workspace(jsonb,boolean)') is not null as dashboard_workspace,
 to_regprocedure('public.get_operational_report(text,jsonb,integer,integer)') is not null as operational_report,
 to_regprocedure('public.get_report_filter_options()') is not null as report_options,
 to_regprocedure('public.register_report_export(text,text,jsonb,integer)') is not null as register_export,
 to_regprocedure('public.get_google_drive_workspace()') is not null as drive_workspace;
select column_name from information_schema.columns where table_schema='public' and table_name='project_files' and column_name in(
 'drive_connection_id','drive_web_view_link','drive_web_content_link','drive_revision_id','drive_checksum','drive_last_synced_at','drive_sync_error','drive_uploaded_at') order by column_name;
select module,action from public.permission_catalog where (module='dashboard' and action in('view_team','view_financial')) or (module='reports' and action in('view_history','view_productivity')) or (module='integrations' and action in('connect_drive','disconnect_drive','test_drive')) or (module='files' and action in('upload_drive','share_drive','revoke_drive_share','refresh_drive_metadata')) order by module,action;
