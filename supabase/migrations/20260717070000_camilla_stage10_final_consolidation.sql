-- Camilla Studio 3.0.11 — Etapa 10: consolidação final
-- Responsividade, acessibilidade, performance, segurança e integridade.
begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local idle_in_transaction_session_timeout = '120s';

DO $$
begin
  if to_regclass('public.system_versions') is null
     or to_regclass('public.projects') is null
     or to_regclass('public.project_activities') is null
     or to_regclass('public.clients') is null
     or to_regclass('public.financial_entries') is null then
    raise exception 'Estruturas obrigatórias das Etapas 01 a 09 não foram encontradas.';
  end if;
  if not exists(select 1 from public.system_versions where version='3.0.10') then
    raise exception 'A Etapa 09 (versão 3.0.10) deve estar aplicada antes da Etapa 10.';
  end if;
end $$;

-- 1. Hardening: funções SECURITY DEFINER não devem ser chamadas por PUBLIC ou anon.
DO $$
declare function_row record;
begin
  for function_row in
    select n.nspname as schema_name,
           p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as identity_arguments
      from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
     where p.prosecdef
       and n.nspname not in ('pg_catalog','information_schema')
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from public',
      function_row.schema_name,
      function_row.function_name,
      function_row.identity_arguments
    );
    if exists(select 1 from pg_roles where rolname='anon') then
      execute format(
        'revoke execute on function %I.%I(%s) from anon',
        function_row.schema_name,
        function_row.function_name,
        function_row.identity_arguments
      );
    end if;
  end loop;
end $$;

-- 2. Índices operacionais usados por Dashboard, Kanban, Agenda, CRM, Histórico e Financeiro.
create index if not exists idx_stage10_projects_deadline_active
  on public.projects(main_deadline)
  where archived_at is null and stage <> 'completed';
create index if not exists idx_stage10_projects_responsible_active
  on public.projects(responsible_user_id,updated_at desc)
  where archived_at is null;
create index if not exists idx_stage10_projects_client_active
  on public.projects(client_id,updated_at desc)
  where archived_at is null;

create index if not exists idx_stage10_activities_project_active
  on public.project_activities(project_id,updated_at desc)
  where archived_at is null and deleted_at is null;
create index if not exists idx_stage10_activities_client_active
  on public.project_activities(client_id,updated_at desc)
  where archived_at is null and deleted_at is null;
create index if not exists idx_stage10_activities_responsible_active
  on public.project_activities(responsible_user_id,status,due_at)
  where archived_at is null and deleted_at is null;
create index if not exists idx_stage10_activities_due_at_active
  on public.project_activities(due_at,status)
  where archived_at is null and deleted_at is null and due_at is not null;
create index if not exists idx_stage10_activities_due_date_active
  on public.project_activities(due_date,status)
  where archived_at is null and deleted_at is null and due_date is not null;

create index if not exists idx_stage10_calendar_starts_active
  on public.calendar_events(starts_at,status)
  where archived_at is null;
create index if not exists idx_stage10_calendar_project_active
  on public.calendar_events(project_id,starts_at)
  where archived_at is null;
create index if not exists idx_stage10_calendar_client_active
  on public.calendar_events(client_id,starts_at)
  where archived_at is null;
create index if not exists idx_stage10_calendar_responsible_active
  on public.calendar_events(responsible_user_id,starts_at)
  where archived_at is null;

create index if not exists idx_stage10_notifications_unread
  on public.notifications(user_id,created_at desc)
  where read_at is null and archived_at is null;
create index if not exists idx_stage10_history_module_created
  on public.history_entries(module,created_at desc);
create index if not exists idx_stage10_history_record_created
  on public.history_entries(record_type,record_id,created_at desc);

create index if not exists idx_stage10_files_project_active
  on public.project_files(project_id,created_at desc)
  where archived_at is null;
create index if not exists idx_stage10_files_client_active
  on public.project_files(client_id,created_at desc)
  where archived_at is null;
create index if not exists idx_stage10_files_activity_active
  on public.project_files(activity_id,created_at desc)
  where archived_at is null;
create index if not exists idx_stage10_files_financial_active
  on public.project_files(financial_entry_id,created_at desc)
  where archived_at is null;

create index if not exists idx_stage10_finance_environment_due
  on public.financial_entries(environment,due_date,status)
  where archived_at is null;
create index if not exists idx_stage10_finance_project
  on public.financial_entries(project_id,competence_date desc)
  where archived_at is null;
create index if not exists idx_stage10_finance_client
  on public.financial_entries(client_id,competence_date desc)
  where archived_at is null;
create index if not exists idx_stage10_finance_account
  on public.financial_entries(account_id,competence_date desc)
  where archived_at is null;
create index if not exists idx_stage10_finance_category
  on public.financial_entries(category_id,competence_date desc)
  where archived_at is null;

create index if not exists idx_stage10_drive_operations_status
  on public.google_drive_operations(status,created_at desc);
create index if not exists idx_stage10_comments_project_created
  on public.project_comments(project_id,created_at desc)
  where deleted_at is null;
create index if not exists idx_stage10_comments_activity_created
  on public.project_comments(activity_id,created_at desc)
  where deleted_at is null;
create index if not exists idx_stage10_record_views_lookup
  on public.record_views(user_id,module,record_type,record_id,area);

-- 3. Configuração de qualidade da versão final.
insert into public.system_settings(key,value,description) values
 ('app_minimum_viewport_width','320'::jsonb,'Largura mínima validada da interface, em pixels.'),
 ('app_accessibility_baseline','"WCAG 2.2 AA"'::jsonb,'Baseline de acessibilidade adotado na consolidação final.'),
 ('app_quality_timezone','"America/Boa_Vista"'::jsonb,'Fuso oficial da aplicação.'),
 ('app_quality_locale','"pt-BR"'::jsonb,'Localidade oficial da aplicação.')
on conflict(key) do update set value=excluded.value,description=excluded.description,updated_at=now();

insert into public.system_versions(version,notes,environment)
values('3.0.11','Etapa 10 final: responsividade consolidada, acessibilidade por teclado e foco, otimização de consultas, remoção de legado da Publicolor, hardening de funções SECURITY DEFINER, índices operacionais e suíte final de validação.','production')
on conflict(version) do update set notes=excluded.notes,environment=excluded.environment,released_at=now();

commit;
