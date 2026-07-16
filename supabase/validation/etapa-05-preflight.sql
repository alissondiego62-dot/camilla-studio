-- Camilla Studio Etapa 05 — preflight somente leitura
select current_database() as database_name, now() as checked_at;

select
  to_regclass('public.project_activities') as project_activities,
  to_regclass('public.activity_statuses') as activity_statuses,
  to_regclass('public.notifications') as notifications,
  to_regclass('public.history_entries') as history_entries;

select count(*) as total_activities,
       count(*) filter (where parent_id is null) as main_activities,
       count(*) filter (where parent_id is not null) as subactivities,
       count(*) filter (where archived_at is not null) as archived_activities
from public.project_activities;

select status, count(*) as total
from public.project_activities
group by status
order by status;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid='public.project_activities'::regclass
order by conname;
