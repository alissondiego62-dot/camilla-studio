-- Etapa 04 — integridade de dados
select source_table,source_id,count(*) from public.history_entries where source_table is not null and source_id is not null group by source_table,source_id having count(*)>1;
select user_id,dedupe_key,count(*) from public.notifications where dedupe_key is not null group by user_id,dedupe_key having count(*)>1;
select id,name from public.project_files where num_nonnulls(project_id,client_id,activity_id,financial_entry_id)<1;
select id,name from public.project_files where origin='supabase_storage' and (storage_bucket is null or storage_path is null);
select id,name from public.project_files where origin<>'supabase_storage' and drive_url is null;
select c.id from public.project_comments c left join public.projects p on p.id=c.project_id where p.id is null;
select count(*) as source_project_history, (select count(*) from public.history_entries where source_table='project_history') as central_project_history from public.project_history;

select version_group_id,version,count(*) from public.project_files group by version_group_id,version having count(*)>1;
select id,name from public.project_files where version_group_id is null;
select count(*) as notification_delivery_types_without_catalog from public.notification_deliveries d left join public.notification_type_catalog c on c.type_code=d.notification_type where c.type_code is null;
