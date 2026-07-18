-- Somente leitura.
select current_database() as database_name,
  exists(select 1 from public.system_versions where version='3.0.10') as version_3010,
  to_regclass('public.projects') as projects,
  to_regclass('public.project_activities') as activities,
  to_regclass('public.clients') as clients,
  to_regclass('public.financial_entries') as finance,
  to_regclass('public.google_drive_operations') as drive_operations;
select
 (select count(*) from public.projects) projects,
 (select count(*) from public.clients) clients,
 (select count(*) from public.project_activities) activities,
 (select count(*) from public.calendar_events) events,
 (select count(*) from public.financial_entries) financial_entries,
 (select count(*) from public.history_entries) history_entries;
