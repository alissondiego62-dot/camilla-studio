select
  to_regclass('public.project_stages') as project_stages,
  to_regclass('public.project_statuses') as project_statuses,
  to_regclass('public.activity_statuses') as activity_statuses,
  to_regclass('public.checklist_templates') as checklist_templates,
  to_regclass('public.project_checklist_items') as project_checklist_items,
  exists(select 1 from public.system_versions where version='3.0.11') as etapa_10_aplicada;
select 'project_stages' as catalog,count(*) as total from public.project_stages
union all select 'project_statuses',count(*) from public.project_statuses
union all select 'activity_statuses',count(*) from public.activity_statuses;
select count(*) as active_templates from public.checklist_templates where active and archived_at is null;
select count(*) as applied_project_items from public.project_checklist_items;
