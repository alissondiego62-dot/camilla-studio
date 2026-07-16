-- Etapa 04 — preflight somente de leitura
select current_database() as database_name, now() at time zone 'America/Boa_Vista' as checked_at;
select to_regclass('public.projects') as projects,to_regclass('public.project_history') as project_history,to_regclass('public.project_dates') as project_dates,to_regclass('public.project_files') as project_files,to_regclass('public.project_comments') as project_comments;
select count(*) as projects from public.projects;
select count(*) as existing_history from public.project_history;
select count(*) as existing_comments from public.project_comments;
select count(*) as existing_files from public.project_files;
select count(*) as push_subscriptions from public.push_subscriptions where enabled;
select to_regprocedure('public.has_permission(text,text,text)') as permissions_function,to_regprocedure('public.update_project_workflow(uuid,jsonb)') as stage03_workflow;
