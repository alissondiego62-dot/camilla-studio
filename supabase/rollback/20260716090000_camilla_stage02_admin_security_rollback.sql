-- Rollback conservador da Etapa 02.
-- Não apaga usuários, projetos, atividades, checklists ou auditorias.
-- Em vez de restaurar políticas abertas, entra em modo administrativo seguro.
-- Execute somente após backup e validação em homologação.
begin;
drop trigger if exists profiles_protect_last_administrator on public.profiles;
drop trigger if exists profiles_audit_security_change on public.profiles;
drop trigger if exists permission_profiles_protect_system on public.permission_profiles;
drop trigger if exists profile_permissions_protect_admin_core on public.profile_permissions;
drop trigger if exists projects_apply_stage_checklist on public.projects;
drop trigger if exists checklist_items_bump_template_version on public.checklist_template_items;
drop trigger if exists project_checklist_audit_progress on public.project_checklist_items;

do $$
declare r record; t text;
begin
  foreach t in array array[
    'profiles','teams','team_members','project_members','google_drive_settings','google_drive_connections',
    'permission_catalog','permission_profiles','profile_permissions','user_permission_overrides','system_settings',
    'project_stages','project_statuses','activity_statuses','system_categories','system_versions','security_audit_events',
    'checklist_templates','checklist_template_items','checklist_applications','project_checklist_items',
    'projects','clients','calendar_events','project_activities','project_files','financial_entries',
    'project_deliverables','project_comments','project_history','project_revisions','project_financial_entries'
  ] loop
    if to_regclass('public.'||t) is not null then
      for r in select policyname from pg_policies where schemaname='public' and tablename=t loop
        execute format('drop policy if exists %I on public.%I',r.policyname,t);
      end loop;
    end if;
  end loop;
end $$;

-- Perfil próprio continua visível. Todas as demais tabelas entram em modo administrador legado.
create policy profiles_rollback_read on public.profiles for select to authenticated
using(id=auth.uid() or public.current_user_role()='admin');
create policy profiles_rollback_admin on public.profiles for all to authenticated
using(public.current_user_role()='admin') with check(public.current_user_role()='admin');

do $$
declare t text;
begin
  foreach t in array array[
    'teams','team_members','project_members','google_drive_settings','permission_catalog','permission_profiles',
    'profile_permissions','user_permission_overrides','system_settings','project_stages','project_statuses',
    'activity_statuses','system_categories','system_versions','security_audit_events','checklist_templates',
    'checklist_template_items','checklist_applications','project_checklist_items','projects','clients','calendar_events',
    'project_activities','project_files','financial_entries','project_deliverables','project_comments','project_history',
    'project_revisions','project_financial_entries'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format(
        'create policy %I on public.%I for all to authenticated using(public.current_user_role()=''admin'') with check(public.current_user_role()=''admin'')',
        'stage02_rollback_admin_'||t,t
      );
    end if;
  end loop;
end $$;

-- Conexões/tokens do Drive continuam inacessíveis diretamente ao cliente.
do $$ declare t text; begin
  foreach t in array array['google_drive_connections','google_drive_tokens','google_drive_upload_sessions'] loop
    if to_regclass('public.'||t) is not null then
      execute format('revoke all on public.%I from anon,authenticated',t);
    end if;
  end loop;
end $$;

-- Funções e dados são preservados para reaplicação sem perda.
commit;
