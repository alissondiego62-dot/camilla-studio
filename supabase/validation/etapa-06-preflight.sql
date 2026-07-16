-- Etapa 06 — preflight somente de leitura
select version,released_at from public.system_versions where version in('3.0.5','3.0.6') order by version;
select count(*) as calendar_events_total from public.calendar_events;
select count(*) as activities_total,count(*) filter(where coalesce(starts_at,due_at) is not null) as activities_with_date from public.project_activities where deleted_at is null;
select count(*) as project_dates_total from public.project_dates where archived_at is null;
select column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name='calendar_events' order by ordinal_position;
select policyname,cmd,roles,qual,with_check from pg_policies where schemaname='public' and tablename in('calendar_events','project_activities','project_dates') order by tablename,policyname;
