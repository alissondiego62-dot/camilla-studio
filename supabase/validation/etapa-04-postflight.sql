-- Etapa 04 — validação após aplicação
select to_regclass('public.notifications') as notifications,to_regclass('public.history_entries') as history_entries,to_regclass('public.record_views') as record_views,to_regclass('public.comment_mentions') as comment_mentions,to_regclass('public.comment_reads') as comment_reads;
select to_regprocedure('public.mark_notification_read(uuid)') as mark_read,to_regprocedure('public.mark_record_view(text,text,text,text)') as mark_view,to_regprocedure('public.save_project_comment(uuid,text,uuid,text,boolean,uuid[],uuid)') as save_comment,to_regprocedure('public.generate_due_notifications(timestamptz)') as due_notifications;
select id,name,public,file_size_limit from storage.buckets where id in('project-thumbnails','linked-files') order by id;
select version,notes,released_at from public.system_versions where version='3.0.5';
select count(*) as central_history_count from public.history_entries;
select count(*) as migrated_project_history from public.history_entries where source_table='project_history';
select tablename,policyname,cmd from pg_policies where schemaname='public' and tablename in('notifications','history_entries','record_views','project_comments','project_files') order by tablename,policyname;
select exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') as notifications_in_realtime;

select column_name,is_nullable from information_schema.columns where table_schema='public' and table_name='project_files' and column_name in('version_group_id','client_id','activity_id','financial_entry_id','storage_path','archived_at') order by column_name;
select column_name,is_nullable from information_schema.columns where table_schema='public' and table_name='calendar_events' and column_name='updated_by';
