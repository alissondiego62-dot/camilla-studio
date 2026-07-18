begin;

-- Desativa o módulo financeiro pessoal sem remover dados históricos.
update public.profile_permissions
set allowed = false,
    scope = 'none',
    updated_at = now()
where module = 'finance_personal';

delete from public.user_permission_overrides
where module = 'finance_personal';

-- Índices idempotentes para as consultas principais da aplicação.
create index if not exists idx_projects_active_stage_position
  on public.projects(stage, position, updated_at desc)
  where archived_at is null;
create index if not exists idx_projects_active_status_deadline
  on public.projects(status, main_deadline)
  where archived_at is null;
create index if not exists idx_activities_active_status_due
  on public.project_activities(status, due_at)
  where archived_at is null;
create index if not exists idx_calendar_events_range
  on public.calendar_events(starts_at, ends_at)
  where cancelled_at is null;
create index if not exists idx_project_dates_active_project_start
  on public.project_dates(project_id, starts_at)
  where archived_at is null;
create index if not exists idx_project_files_active_project_updated
  on public.project_files(project_id, updated_at desc)
  where archived_at is null;
create index if not exists idx_financial_entries_professional_due
  on public.financial_entries(status, due_date)
  where environment = 'professional' and archived_at is null;

insert into public.system_versions(version,notes,environment)
values('3.0.13','Etapa 13: simplificação da navegação, remoção das páginas gerais de relatórios e arquivos, usuários centralizados em Configurações, financeiro exclusivamente profissional, responsividade e favicon oficial.','production')
on conflict (version) do update set notes=excluded.notes, environment=excluded.environment;

commit;
