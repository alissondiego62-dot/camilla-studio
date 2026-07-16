-- Execute antes do SQL da Etapa 02. Não altera dados.
select current_database() as database_name, now() as checked_at;
select to_regclass('public.profiles') as profiles,
       to_regclass('public.projects') as projects,
       to_regclass('public.clients') as clients,
       to_regclass('public.calendar_events') as calendar_events,
       to_regclass('public.permission_profiles') as permission_profiles_existentes,
       to_regclass('public.checklist_templates') as checklist_templates_existentes;
select count(*) as users_total,
       count(*) filter(where active) as users_active,
       count(*) filter(where role::text='admin') as legacy_admins
from public.profiles;
select role::text as legacy_role,count(*) from public.profiles group by role::text order by role::text;
select schemaname,tablename,policyname,cmd,qual,with_check
from pg_policies
where schemaname='public' and tablename in ('profiles','projects','clients','calendar_events','project_activities','project_checklist_items','financial_entries')
order by tablename,policyname;
select filename from (values
 ('20260717010000_hybrid_drive_documents.sql'),('20260718010000_project_revision_and_comments.sql'),
 ('20260719010000_project_agenda_and_financial_income.sql'),('20260720010000_editable_project_overview_and_history.sql'),
 ('20260721010000_completed_projects_and_full_finance.sql'),('20260722010000_calendar_event_completion.sql'),
 ('20260723010000_briefing_checklists_finance_period.sql'),('20260724010000_pwa_push_notifications.sql'),
 ('20260726010000_camilla_project_access_drive_base.sql'),('20260727010000_camilla_activities_drive_thumbnails.sql'),
 ('20260728010000_camilla_studio_complete_core.sql'),('20260729010000_camilla_studio_v3.sql')
) as future_drafts(filename);
