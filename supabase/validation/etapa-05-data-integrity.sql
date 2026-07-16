-- Camilla Studio Etapa 05 — integridade de dados
select count(*) as self_parenting
from public.project_activities
where id=parent_id;

with recursive tree as (
  select id,parent_id,array[id] as path,false as cycle
  from public.project_activities
  where deleted_at is null
  union all
  select child.id,child.parent_id,tree.path||child.id,child.id=any(tree.path)
  from public.project_activities child
  join tree on child.parent_id=tree.id
  where not tree.cycle
)
select count(*) as circular_paths from tree where cycle;

select count(*) as invalid_parent_projects
from public.project_activities child
join public.project_activities parent on parent.id=child.parent_id
where child.project_id is distinct from parent.project_id
   or child.client_id is distinct from parent.client_id;

select count(*) as invalid_progress
from public.project_activities
where progress<0 or progress>100;

select count(*) as invalid_status
from public.project_activities a
where not exists (
  select 1 from public.activity_statuses s
  where s.code=a.status and s.active and s.archived_at is null
);

select count(*) as duplicate_default_views
from (
  select user_id from public.activity_saved_views where is_default group by user_id having count(*)>1
) duplicated;
