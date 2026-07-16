-- Camilla Studio — Etapa 03 — Preflight somente leitura
begin;
set transaction read only;

select
  current_database() as database_name,
  current_user as executor,
  now() at time zone 'America/Boa_Vista' as checked_at_boa_vista;

select required_object, exists_flag
from (values
  ('public.projects', to_regclass('public.projects') is not null),
  ('public.project_history', to_regclass('public.project_history') is not null),
  ('public.project_stages', to_regclass('public.project_stages') is not null),
  ('public.permission_catalog', to_regclass('public.permission_catalog') is not null),
  ('public.project_checklist_items', to_regclass('public.project_checklist_items') is not null),
  ('public.has_permission(text,text,text)', to_regprocedure('public.has_permission(text,text,text)') is not null),
  ('public.can_access_project(uuid)', to_regprocedure('public.can_access_project(uuid)') is not null)
) as requirements(required_object, exists_flag)
order by required_object;

select stage, count(*) as projects
from public.projects
group by stage
order by stage;

select
  count(*) filter (where stage='construction') as projects_in_obsolete_stage,
  count(*) filter (where stage='briefing_preliminary') as preliminary_study_projects,
  count(*) filter (where main_deadline is not null) as projects_with_main_deadline,
  count(*) as total_projects
from public.projects;

select code,name,active,final,archived_at
from public.project_stages
where code in ('briefing_preliminary','construction','revision','completed')
order by position;

select
  count(*) as applied_checklists,
  count(*) filter (where stage='construction') as checklists_from_obsolete_stage
from public.project_checklist_items;

select
  count(*) as files,
  count(*) filter (where thumbnail_url is not null) as legacy_file_thumbnails
from public.project_files;

select conname,pg_get_constraintdef(oid,true) as definition
from pg_constraint
where conrelid='public.projects'::regclass
order by conname;

rollback;
