-- Etapa 07 — preflight somente de leitura
select version,released_at from public.system_versions where version in('3.0.6','3.0.7') order by version;
select count(*) as clients_total,count(*) filter(where archived_at is null) as clients_active,count(*) filter(where archived_at is not null) as clients_archived from public.clients;
select count(*) as projects_with_client from public.projects where client_id is not null;
select count(*) as activities_with_client from public.project_activities where client_id is not null;
select count(*) as files_with_client from public.project_files where client_id is not null;
select count(*) as financial_entries_with_client from public.financial_entries where client_id is not null;
select column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name='clients' order by ordinal_position;
select policyname,cmd,roles,qual,with_check from pg_policies where schemaname='public' and tablename='clients' order by policyname;
select indexname,indexdef from pg_indexes where schemaname='public' and tablename='clients' order by indexname;
