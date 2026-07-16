-- Camilla Studio — Etapa 03 — Integridade de dados
begin;
set transaction read only;

select 'projects_in_construction' as check_name,count(*)::bigint as failures
from public.projects where stage='construction'
union all
select 'invalid_active_project_stage',count(*)
from public.projects p
where p.archived_at is null
  and not exists(select 1 from public.project_stages s where s.code=p.stage and s.active and s.archived_at is null)
union all
select 'duplicate_main_deadlines',count(*)
from (
  select project_id from public.project_dates
  where is_main_deadline and archived_at is null
  group by project_id having count(*)>1
) duplicates
union all
select 'main_deadline_out_of_sync',count(*)
from public.projects p
left join lateral (
  select (d.starts_at at time zone 'America/Boa_Vista')::date as date_value
  from public.project_dates d
  where d.project_id=p.id and d.is_main_deadline and d.archived_at is null
  limit 1
) main_date on true
where p.main_deadline is distinct from main_date.date_value
union all
select 'active_thumbnail_without_storage_object',count(*)
from public.project_thumbnails t
where t.active and t.removed_at is null
  and not exists(select 1 from storage.objects o where o.bucket_id=t.bucket_id and o.name=t.object_path)
union all
select 'duplicate_active_thumbnails',count(*)
from (
  select project_id from public.project_thumbnails
  where active and removed_at is null
  group by project_id having count(*)>1
) duplicates
union all
select 'required_checklist_waived_without_reason',count(*)
from public.project_checklist_items
where required and waived_at is not null and length(trim(coalesce(waiver_reason,'')))<5;

select p.id,p.code,p.name,p.main_deadline,d.starts_at,d.title
from public.projects p
left join public.project_dates d on d.project_id=p.id and d.is_main_deadline and d.archived_at is null
where p.main_deadline is distinct from (d.starts_at at time zone 'America/Boa_Vista')::date
order by p.code;

rollback;
