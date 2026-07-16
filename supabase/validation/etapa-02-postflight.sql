-- Execute depois do SQL da Etapa 02. Somente leitura.
select count(*) as permission_profiles from public.permission_profiles;
select code,name,system,active from public.permission_profiles order by position;
select count(*) as permission_catalog_items from public.permission_catalog;
select count(*) as profile_permission_rows from public.profile_permissions;
select key,value from public.system_settings order by key;
select version,released_at,environment from public.system_versions order by released_at desc limit 5;
select proname from pg_proc join pg_namespace n on n.oid=pronamespace
where n.nspname='public' and proname in ('current_access_context','has_permission','permission_scope','can_access_project','protect_last_administrator','apply_stage_checklist_snapshot','bootstrap_first_administrator')
order by proname;
select tablename,policyname,cmd from pg_policies where schemaname='public' and tablename in
('profiles','projects','clients','calendar_events','project_activities','project_files','financial_entries','permission_profiles','profile_permissions','checklist_templates','project_checklist_items','project_financial_entries','project_deliverables','project_comments','project_history','project_revisions','google_drive_connections','google_drive_tokens','google_drive_upload_sessions')
order by tablename,policyname;

do $$
declare profile_count integer; insecure_policy_count integer; disabled_rls_count integer;
begin
  select count(*) into profile_count from public.permission_profiles where system and active and code in
    ('administrator','owner','manager','finance','architect','collaborator','assistant','viewer');
  if profile_count <> 8 then raise exception 'Validação falhou: esperados 8 perfis de sistema ativos, encontrados %.',profile_count; end if;

  select count(*) into insecure_policy_count from pg_policies
  where schemaname='public' and tablename in
    ('profiles','projects','clients','calendar_events','project_activities','project_files','financial_entries','permission_profiles','profile_permissions','checklist_templates','project_checklist_items','project_financial_entries','project_deliverables','project_comments','project_history','project_revisions','google_drive_connections','google_drive_tokens','google_drive_upload_sessions')
    and (trim(coalesce(qual,'')) in ('true','(true)') or trim(coalesce(with_check,'')) in ('true','(true)'));
  if insecure_policy_count > 0 then raise exception 'Validação falhou: % política(s) ampla(s) usando TRUE.',insecure_policy_count; end if;

  select count(*) into disabled_rls_count from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in
    ('profiles','projects','clients','calendar_events','project_activities','project_files','financial_entries','permission_profiles','profile_permissions','checklist_templates','project_checklist_items','project_financial_entries','project_deliverables','project_comments','project_history','project_revisions','google_drive_connections','google_drive_tokens','google_drive_upload_sessions')
    and not c.relrowsecurity;
  if disabled_rls_count > 0 then raise exception 'Validação falhou: % tabela(s) sem RLS.',disabled_rls_count; end if;
end $$;

select 'ETAPA 02 VALIDADA' as resultado;
