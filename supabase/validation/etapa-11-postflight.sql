select exists(select 1 from public.system_versions where version='3.0.12') as version_3012,
       to_regprocedure('public.list_workflow_catalog(text)') is not null as workflow_rpc,
       to_regprocedure('public.list_stage_checklists()') is not null as checklist_rpc;
select code,name,position,active,archived_at from public.project_stages order by position;
select s.code,s.name,count(i.id) filter(where i.active) as checklist_items
from public.project_stages s left join public.checklist_templates t on t.stage_code=s.code and t.active and t.archived_at is null
left join public.checklist_template_items i on i.template_id=t.id
where s.active and s.archived_at is null group by s.code,s.name,s.position order by s.position;
