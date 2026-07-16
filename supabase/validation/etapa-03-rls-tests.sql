-- Camilla Studio — Etapa 03 — Auditoria estrutural de RLS
-- Este arquivo não cria usuários nem registros permanentes.
begin;
set transaction read only;

select c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('project_dates','project_thumbnails')
order by c.relname;

select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies
where (schemaname='public' and tablename in ('project_dates','project_thumbnails'))
   or (schemaname='storage' and tablename='objects' and policyname like 'camilla_project_thumbnail_%')
order by schemaname,tablename,policyname;

select routine_name,security_type
from information_schema.routines
where specific_schema='public'
  and routine_name in (
    'save_project_date','archive_project_date','create_activity_from_project_date',
    'create_calendar_event_from_project_date','activate_project_thumbnail',
    'remove_project_thumbnail','update_project_workflow','update_project_checklist_item'
  )
order by routine_name;

select p.proname,
       has_function_privilege('anon',p.oid,'execute') as anon_can_execute,
       has_function_privilege('authenticated',p.oid,'execute') as authenticated_can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
  'save_project_date','archive_project_date','create_activity_from_project_date',
  'create_calendar_event_from_project_date','activate_project_thumbnail',
  'remove_project_thumbnail','update_project_workflow','update_project_checklist_item',
  'log_project_change','log_project_date_change','enforce_required_checklist_before_completion'
)
order by p.proname;

select policyname
from pg_policies
where schemaname in ('public','storage')
  and tablename in ('project_dates','project_thumbnails','objects')
  and cmd<>'SELECT'
  and (coalesce(qual,'') ~* '^\s*true\s*$' or coalesce(with_check,'') ~* '^\s*true\s*$');

rollback;
