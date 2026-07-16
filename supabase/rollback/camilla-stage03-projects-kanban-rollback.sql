-- Camilla Studio — Etapa 03 — Rollback conservador
-- Não exclui datas, miniaturas, arquivos ou históricos criados depois da Etapa 03.
begin;
set local lock_timeout='20s';
set local statement_timeout='0';
lock table public.projects in share row exclusive mode;

-- Suspende regras novas antes da restauração do fluxo anterior.
drop trigger if exists projects_enforce_required_checklist on public.projects;
drop view if exists public.project_kanban_view;

-- Restaura a restrição anterior, que aceitava Obra.
alter table public.projects drop constraint if exists projects_stage_check;
alter table public.projects add constraint projects_stage_check check(stage in(
  'prospecting','briefing','survey','briefing_preliminary','creation','adjustments',
  'approval','executive','revision','construction','completed'
));

-- Restaura somente projetos migrados automaticamente que não tiveram mudança posterior de etapa.
select set_config('camilla.skip_project_history','on',true);
with migrations as (
  select distinct on (h.project_id)
    h.project_id,h.created_at,h.new_value #>> '{}' as migrated_to
  from public.project_history h
  where h.metadata->>'migration'='camilla_stage03'
    and h.metadata->>'original_stage'='construction'
  order by h.project_id,h.created_at desc
)
update public.projects p
set stage='construction'
from migrations m
where p.id=m.project_id
  and p.stage=m.migrated_to
  and not exists(
    select 1 from public.project_history later
    where later.project_id=p.id
      and later.created_at>m.created_at
      and later.action_type in('stage_changed','stage_migrated')
  );
select set_config('camilla.skip_project_history','off',true);

update public.project_stages
set name='Obra',active=true,archived_at=null,updated_at=now()
where code='construction';
update public.project_stages
set name='Briefing e preliminares',updated_at=now()
where code='briefing_preliminary';
update public.checklist_templates
set active=true,archived_at=null,updated_at=now()
where coalesce(stage_code,stage)='construction';

-- Restaura o registrador de histórico existente antes da Etapa 03.
create or replace function public.log_project_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if current_setting('camilla.skip_project_history',true)='on' then return new; end if;
  if tg_op='INSERT' then
    insert into public.project_history(project_id,action_type,description,author_id)
    values(new.id,'created','Projeto criado.',auth.uid());
    return new;
  end if;
  if old.stage is distinct from new.stage then
    insert into public.project_history(project_id,action_type,description,author_id)
    values(new.id,'stage_changed','Etapa alterada de '||coalesce(old.stage,'não definida')||' para '||coalesce(new.stage,'não definida')||'.',auth.uid());
  end if;
  if old.status is distinct from new.status then
    insert into public.project_history(project_id,action_type,description,author_id)
    values(new.id,'status_changed','Status alterado de '||coalesce(old.status,'não definido')||' para '||coalesce(new.status,'não definido')||'.',auth.uid());
  end if;
  if old.responsible_name is distinct from new.responsible_name then
    insert into public.project_history(project_id,action_type,description,author_id)
    values(new.id,'responsible_changed','Responsável alterado de '||coalesce(old.responsible_name,'não atribuído')||' para '||coalesce(new.responsible_name,'não atribuído')||'.',auth.uid());
  end if;
  if old.main_deadline is distinct from new.main_deadline then
    insert into public.project_history(project_id,action_type,description,author_id)
    values(new.id,'main_deadline_changed','Prazo principal alterado de '||coalesce(to_char(old.main_deadline,'DD/MM/YYYY'),'não definido')||' para '||coalesce(to_char(new.main_deadline,'DD/MM/YYYY'),'não definido')||'.',auth.uid());
  end if;
  return new;
end $$;

-- Remove exposição e funções operacionais novas sem apagar seus dados.
do $$ declare r record;begin
  for r in select policyname from pg_policies where schemaname='public' and tablename in('project_dates','project_thumbnails') loop
    execute format('drop policy if exists %I on public.%I',r.policyname,r.tablename);
  end loop;
  for r in select policyname from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'camilla_project_thumbnail_%' loop
    execute format('drop policy if exists %I on storage.objects',r.policyname);
  end loop;
end $$;

revoke all on public.project_dates,public.project_thumbnails from anon,authenticated;

drop function if exists public.save_project_date(jsonb);
drop function if exists public.archive_project_date(uuid);
drop function if exists public.create_activity_from_project_date(uuid);
drop function if exists public.create_calendar_event_from_project_date(uuid);
drop function if exists public.activate_project_thumbnail(uuid,text,text,text,bigint);
drop function if exists public.remove_project_thumbnail(uuid);
drop function if exists public.update_project_workflow(uuid,jsonb);
drop function if exists public.update_project_checklist_item(uuid,text,text);
drop function if exists public.enforce_required_checklist_before_completion();

-- Funções de triggers das tabelas preservadas são mantidas, mas sem execução pública.
revoke all on function public.log_project_date_change() from public,anon,authenticated;
revoke all on function public.project_id_from_storage_path(text) from public,anon,authenticated;
revoke all on function public.project_stage_name(text) from public,anon,authenticated;

-- Mantém o bucket e os objetos privados para evitar perda de arquivos.
update storage.buckets set public=false where id='project-thumbnails';

-- Reverte apenas o catálogo de permissão criado nesta etapa.
delete from public.profile_permissions where module='checklists' and action='approve';
delete from public.user_permission_overrides where module='checklists' and action='approve';
delete from public.permission_catalog where module='checklists' and action='approve';

update public.system_categories
set active=false,archived_at=coalesce(archived_at,now()),updated_at=now()
where module='project_date_type';
delete from public.system_versions where version='3.0.4';
delete from public.system_settings where key in('project_thumbnail_max_size_mb','project_thumbnail_bucket','project_deadline_warning_days');

insert into public.project_history(project_id,action_type,description,field_name,author_id,metadata)
select p.id,'stage03_rollback','Rollback conservador da Etapa 03 executado. Dados de datas e miniaturas foram preservados.','system',auth.uid(),jsonb_build_object('rollback','camilla_stage03','executed_at',now())
from public.projects p
where exists(select 1 from public.project_history h where h.project_id=p.id and h.metadata->>'migration'='camilla_stage03');

commit;
