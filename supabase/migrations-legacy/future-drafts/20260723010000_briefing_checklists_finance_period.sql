begin;

-- Consolida as três primeiras etapas em uma única coluna operacional.
alter table public.projects drop constraint if exists projects_stage_check;

update public.projects
set stage = 'briefing_preliminary'
where stage in ('prospecting', 'briefing', 'survey');

alter table public.projects
  add constraint projects_stage_check
  check (stage in (
    'briefing_preliminary',
    'creation',
    'adjustments',
    'approval',
    'executive',
    'revision',
    'construction',
    'completed'
  ));

create table if not exists public.project_checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  stage text not null check (stage in (
    'briefing_preliminary',
    'creation',
    'adjustments',
    'approval',
    'executive',
    'revision',
    'construction',
    'completed'
  )),
  section text not null default 'Geral',
  title text not null,
  completed_at timestamptz,
  position integer not null default 0,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_checklist_project_stage_idx
  on public.project_checklist_items(project_id, stage, position);

alter table public.project_checklist_items enable row level security;

drop policy if exists "authenticated checklist read" on public.project_checklist_items;
create policy "authenticated checklist read"
  on public.project_checklist_items for select to authenticated
  using (true);

drop policy if exists "authenticated checklist insert" on public.project_checklist_items;
create policy "authenticated checklist insert"
  on public.project_checklist_items for insert to authenticated
  with check (true);

drop policy if exists "authenticated checklist update" on public.project_checklist_items;
create policy "authenticated checklist update"
  on public.project_checklist_items for update to authenticated
  using (true) with check (true);

drop policy if exists "authenticated checklist delete" on public.project_checklist_items;
create policy "authenticated checklist delete"
  on public.project_checklist_items for delete to authenticated
  using (true);

drop trigger if exists project_checklist_set_updated_at on public.project_checklist_items;
create trigger project_checklist_set_updated_at
before update on public.project_checklist_items
for each row execute function public.set_updated_at();

commit;
