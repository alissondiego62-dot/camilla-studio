select count(*) as projects_with_missing_stage from public.projects p left join public.project_stages s on s.code=p.stage where s.id is null;
select count(*) as projects_with_missing_status from public.projects p left join public.project_statuses s on s.code=p.status where s.id is null;
select count(*) as activities_with_missing_status from public.project_activities a left join public.activity_statuses s on s.code=a.status where s.id is null;
select stage_code,count(*) from public.checklist_templates where active and archived_at is null group by stage_code having count(*)>1;
