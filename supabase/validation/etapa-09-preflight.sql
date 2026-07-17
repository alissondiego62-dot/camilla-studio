-- Etapa 09 — preflight somente de leitura
select current_database() as database_name,
  exists(select 1 from public.system_versions where version='3.0.9') as version_309,
  to_regclass('public.projects') as projects,
  to_regclass('public.project_activities') as project_activities,
  to_regclass('public.history_entries') as history_entries,
  to_regclass('public.google_drive_settings') as drive_settings,
  to_regclass('public.project_files') as project_files;
select
 (select count(*) from public.projects) as projects,
 (select count(*) from public.project_activities) as activities,
 (select count(*) from public.clients) as clients,
 (select count(*) from public.calendar_events) as events,
 (select count(*) from public.history_entries) as history_entries,
 (select count(*) from public.project_files) as files;
select connected,google_account_email,root_folder_name,updated_at from public.google_drive_settings where id=true;
select count(*) filter(where active) as active_connections,count(*) as total_connections from public.google_drive_connections;
select module,action,count(*) as grants from public.profile_permissions where allowed and module in('dashboard','reports','integrations','files') group by module,action order by module,action;
