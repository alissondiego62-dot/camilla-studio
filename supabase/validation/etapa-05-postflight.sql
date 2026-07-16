-- Camilla Studio Etapa 05 — validação estrutural pós-migration
select
  to_regclass('public.activity_participants') as activity_participants,
  to_regclass('public.activity_saved_views') as activity_saved_views,
  exists(select 1 from public.system_versions where version='3.0.6') as version_306;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name='project_activities'
  and column_name in ('client_id','starts_at','due_at','all_day','notes_document','updated_by','completed_by','archived_by','deleted_at','deleted_by')
order by column_name;

select code,name,active,position
from public.activity_statuses
where code in ('not_started','in_progress','waiting','blocked','completed','cancelled')
order by position;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid='public.project_activities'::regclass
  and conname='project_activities_parent_id_fkey';

select proname
from pg_proc join pg_namespace n on n.oid=pronamespace
where n.nspname='public' and proname in (
  'save_activity','set_activity_status','bulk_update_activities','duplicate_activity',
  'move_activity','reorder_activity','archive_activity','reactivate_activity','delete_activity_logically'
)
order by proname;
