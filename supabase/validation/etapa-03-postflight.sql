-- Camilla Studio — Etapa 03 — Validação pós-aplicação
begin;
set transaction read only;

do $$
begin
  if to_regclass('public.project_dates') is null then raise exception 'project_dates não foi criada.'; end if;
  if to_regclass('public.project_thumbnails') is null then raise exception 'project_thumbnails não foi criada.'; end if;
  if to_regclass('public.project_kanban_view') is null then raise exception 'project_kanban_view não foi criada.'; end if;
  if to_regprocedure('public.update_project_workflow(uuid,jsonb)') is null then raise exception 'update_project_workflow não foi criada.'; end if;
  if to_regprocedure('public.save_project_date(jsonb)') is null then raise exception 'save_project_date não foi criada.'; end if;
  if exists(select 1 from public.projects where stage='construction') then raise exception 'Ainda existem projetos na etapa Obra.'; end if;
  if exists(select 1 from public.project_stages where code='construction' and active) then raise exception 'A etapa Obra ainda está ativa.'; end if;
  if not exists(select 1 from public.project_stages where code='briefing_preliminary' and name='Estudo Preliminar' and active) then raise exception 'Estudo Preliminar não está configurado corretamente.'; end if;
  if exists(select 1 from public.project_dates where archived_at is null group by project_id having count(*) filter(where is_main_deadline)>1) then raise exception 'Há mais de um prazo principal ativo em algum projeto.'; end if;
  if not exists(select 1 from storage.buckets where id='project-thumbnails' and public=false) then raise exception 'Bucket privado de miniaturas não encontrado.'; end if;
end $$;

select
  (select count(*) from public.projects) as projects,
  (select count(*) from public.project_dates where archived_at is null) as active_project_dates,
  (select count(*) from public.project_dates where is_main_deadline and archived_at is null) as main_deadlines,
  (select count(*) from public.project_thumbnails where active and removed_at is null) as active_thumbnails,
  (select count(*) from public.project_history where metadata->>'migration'='camilla_stage03') as migrated_stage_history;

select code,name,active,final,position,archived_at
from public.project_stages
where code in ('briefing_preliminary','construction','revision','completed')
order by position;

select schemaname,tablename,policyname,cmd
from pg_policies
where (schemaname='public' and tablename in ('project_dates','project_thumbnails'))
   or (schemaname='storage' and tablename='objects' and policyname like 'camilla_project_thumbnail_%')
order by schemaname,tablename,policyname;

select c.relname as relation_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as force_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('project_dates','project_thumbnails');

select version,released_at,notes
from public.system_versions
where version='3.0.4';

rollback;
