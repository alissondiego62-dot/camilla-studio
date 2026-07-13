begin;

alter table public.projects
  drop constraint if exists projects_stage_check;

alter table public.projects
  add constraint projects_stage_check
  check (stage in (
    'prospecting',
    'briefing',
    'survey',
    'creation',
    'adjustments',
    'approval',
    'executive',
    'revision',
    'construction',
    'completed'
  ));

create index if not exists project_comments_project_created_idx
  on public.project_comments(project_id, created_at desc);

commit;
