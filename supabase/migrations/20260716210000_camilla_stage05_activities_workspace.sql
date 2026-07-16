-- Camilla Studio 3.0.6 — Etapa 05: Atividades e subatividades
-- Aplicar somente após a Etapa 04 corrigida (versão 3.0.5).
begin;
set local lock_timeout='10s';
set local statement_timeout='120s';

create extension if not exists pgcrypto;

-- 1. Evolução aditiva das atividades
alter table public.project_activities
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists starts_at timestamptz,
  add column if not exists due_at timestamptz,
  add column if not exists all_day boolean not null default true,
  add column if not exists notes_document jsonb not null default '{"version":1,"blocks":[]}'::jsonb,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists completed_by uuid references auth.users(id) on delete set null,
  add column if not exists archived_by uuid references auth.users(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

update public.project_activities a
set client_id=coalesce(a.client_id,p.client_id)
from public.projects p
where p.id=a.project_id and a.client_id is null;

update public.project_activities
set due_at=((due_date::text||' 17:00:00')::timestamp at time zone 'America/Boa_Vista')
where due_date is not null and due_at is null;

update public.project_activities
set notes_document='{"version":1,"blocks":[]}'::jsonb
where notes_document is null or jsonb_typeof(notes_document)<>'object';

create index if not exists project_activities_parent_position_idx on public.project_activities(parent_id,position,id) where deleted_at is null;
create index if not exists project_activities_due_at_idx on public.project_activities(due_at) where deleted_at is null and archived_at is null;
create index if not exists project_activities_client_idx on public.project_activities(client_id,updated_at desc) where client_id is not null and deleted_at is null;
create index if not exists project_activities_responsible_idx on public.project_activities(responsible_user_id,status,due_at) where responsible_user_id is not null and deleted_at is null;
create index if not exists project_activities_project_idx on public.project_activities(project_id,status,position) where project_id is not null and deleted_at is null;

-- A exclusão física não pode apagar subatividades em cascata.
alter table public.project_activities drop constraint if exists project_activities_parent_id_fkey;
alter table public.project_activities
  add constraint project_activities_parent_id_fkey foreign key(parent_id) references public.project_activities(id) on delete set null;

-- 2. Catálogo de status
insert into public.activity_statuses(code,name,color,position,active)
values
('not_started','Não iniciada','#8e7c75',10,true),
('in_progress','Em andamento','#9b6352',20,true),
('waiting','Aguardando','#8b6a3d',30,true),
('blocked','Bloqueada','#8f4239',40,true),
('completed','Concluída','#52705c',50,true),
('cancelled','Cancelada','#6f6662',60,true)
on conflict(code) do update set name=excluded.name,color=excluded.color,position=excluded.position,active=true,archived_at=null,updated_at=now();

-- 3. Participantes e visualizações salvas
create table if not exists public.activity_participants(
  activity_id uuid not null references public.project_activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  participant_role text not null default 'participant' check(participant_role in('participant','observer','approver')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key(activity_id,user_id)
);
create index if not exists activity_participants_user_idx on public.activity_participants(user_id,activity_id);

create table if not exists public.activity_saved_views(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  name text not null check(length(trim(name)) between 1 and 100),
  view_type text not null default 'table' check(view_type in('table','list','board','calendar','timeline')),
  filters jsonb not null default '{}'::jsonb,
  sorting jsonb not null default '[]'::jsonb,
  grouping jsonb not null default '{"property":"none"}'::jsonb,
  visible_properties jsonb not null default '[]'::jsonb,
  column_order jsonb not null default '[]'::jsonb,
  column_widths jsonb not null default '{}'::jsonb,
  page_size integer not null default 25 check(page_size in(10,25,50,100)),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,name)
);
create unique index if not exists activity_saved_views_one_default on public.activity_saved_views(user_id) where is_default;

-- 4. Relações de comentários e agenda
alter table public.project_comments
  add column if not exists activity_id uuid references public.project_activities(id) on delete set null;
alter table public.project_comments alter column project_id drop not null;
alter table public.project_comments drop constraint if exists project_comments_relation_check;
alter table public.project_comments add constraint project_comments_relation_check check(project_id is not null or activity_id is not null);
create index if not exists project_comments_activity_idx on public.project_comments(activity_id,created_at) where activity_id is not null;

alter table public.calendar_events
  add column if not exists activity_id uuid references public.project_activities(id) on delete set null;
create index if not exists calendar_events_activity_idx on public.calendar_events(activity_id,starts_at) where activity_id is not null;

-- 5. Permissões novas
insert into public.permission_catalog(module,action,module_label,action_label,supports_scope,position) values
('activities','archive','Atividades','Arquivar',true,56),
('activities','reactivate','Atividades','Reativar',true,57)
on conflict(module,action) do update set module_label=excluded.module_label,action_label=excluded.action_label,supports_scope=excluded.supports_scope,position=excluded.position;

insert into public.profile_permissions(profile_id,permission_profile_id,module,action,allowed,scope)
select pp.profile_id,pp.permission_profile_id,'activities',action_value,pp.allowed,pp.scope
from public.profile_permissions pp
cross join (values('archive'),('reactivate')) a(action_value)
where pp.module='activities' and pp.action='edit'
on conflict(profile_id,module,action) do update set allowed=excluded.allowed,scope=excluded.scope,permission_profile_id=excluded.permission_profile_id;

insert into public.system_settings(key,value,description) values
('activity_auto_complete_parent','false'::jsonb,'Concluir automaticamente a atividade principal quando todas as subatividades forem concluídas.'),
('activity_allow_force_complete','true'::jsonb,'Permitir conclusão forçada da atividade principal com justificativa e permissão elevada.'),
('activity_notes_schema_version','1'::jsonb,'Versão do documento estruturado de observações das atividades.')
on conflict(key) do update set value=excluded.value,description=excluded.description,updated_at=now();

-- 6. Funções de autorização
create or replace function public.can_access_activity(target_activity_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.current_user_access_valid() and (
    public.has_permission('activities','view','all') or
    exists(
      select 1 from public.project_activities a
      where a.id=target_activity_id and a.deleted_at is null and (
        a.responsible_user_id=auth.uid() or a.created_by=auth.uid() or
        exists(select 1 from public.activity_participants ap where ap.activity_id=a.id and ap.user_id=auth.uid()) or
        (a.project_id is not null and public.can_access_project(a.project_id))
      )
    )
  )
$$;

create or replace function public.can_edit_activity(target_activity_id uuid)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare scope_value text; row_data public.project_activities%rowtype;
begin
  if not public.current_user_access_valid() then return false; end if;
  select * into row_data from public.project_activities where id=target_activity_id and deleted_at is null;
  if not found then return false; end if;
  scope_value:=public.permission_scope('activities','edit');
  if scope_value='all' then return true; end if;
  if scope_value='own' and row_data.created_by=auth.uid() then return true; end if;
  if scope_value in('assigned','team') and (
    row_data.responsible_user_id=auth.uid() or
    exists(select 1 from public.activity_participants ap where ap.activity_id=row_data.id and ap.user_id=auth.uid()) or
    (row_data.project_id is not null and public.can_edit_project(row_data.project_id))
  ) then return true; end if;
  return false;
end $$;

create or replace function public.can_access_calendar_event(target_event_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.current_user_access_valid() and (
    public.has_permission('agenda','view','all') or exists(
      select 1 from public.calendar_events e where e.id=target_event_id and (
        e.created_by=auth.uid() or e.assigned_user_id=auth.uid() or e.responsible_user_id=auth.uid() or
        (e.activity_id is not null and public.can_access_activity(e.activity_id)) or
        (e.project_id is not null and public.can_access_project(e.project_id))
      )
    )
  )
$$;

create or replace function public.can_access_linked_file(p_id uuid,p_write boolean default false)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare f public.project_files%rowtype; env text;
begin
  select * into f from public.project_files where id=p_id;
  if not found or not public.current_user_access_valid() then return false; end if;
  if f.project_id is not null then return case when p_write then public.can_edit_project(f.project_id) else public.can_access_project(f.project_id) end; end if;
  if f.client_id is not null then return public.has_permission('clients',case when p_write then 'edit' else 'view' end,'own'); end if;
  if f.activity_id is not null then return case when p_write then public.can_edit_activity(f.activity_id) else public.can_access_activity(f.activity_id) end; end if;
  if f.financial_entry_id is not null then select environment into env from public.financial_entries where id=f.financial_entry_id; return public.can_view_finance(env) and (not p_write or public.has_permission(case when env='personal' then 'finance_personal' else 'finance_professional' end,'edit','own')); end if;
  return false;
end $$;

-- 7. Validação, sincronização e progresso
create or replace function public.validate_activity_hierarchy()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare parent_row public.project_activities%rowtype;
begin
  if new.parent_id is null then return new; end if;
  if new.parent_id=new.id then raise exception 'Uma atividade não pode ser subatividade de si mesma.'; end if;
  select * into parent_row from public.project_activities where id=new.parent_id and deleted_at is null;
  if not found then raise exception 'Atividade principal não encontrada.'; end if;
  if parent_row.parent_id is not null then raise exception 'A estrutura permite somente um nível de subatividade.'; end if;
  if exists(select 1 from public.project_activities child where child.parent_id=new.id and child.deleted_at is null) then
    raise exception 'Uma atividade com subatividades não pode ser transformada em subatividade.';
  end if;
  if new.project_id is distinct from parent_row.project_id then
    new.project_id:=parent_row.project_id;
  end if;
  if new.client_id is null then new.client_id:=parent_row.client_id; end if;
  return new;
end $$;

drop trigger if exists project_activities_validate_hierarchy on public.project_activities;
create trigger project_activities_validate_hierarchy before insert or update of parent_id,project_id,client_id on public.project_activities for each row execute function public.validate_activity_hierarchy();

create or replace function public.sync_activity_fields()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  new.updated_at:=now();
  if tg_op='UPDATE' then new.updated_by:=coalesce(auth.uid(),new.updated_by); end if;
  if new.due_at is not null then new.due_date:=(new.due_at at time zone 'America/Boa_Vista')::date;
  elsif new.due_date is not null then new.due_at:=((new.due_date::text||' 17:00:00')::timestamp at time zone 'America/Boa_Vista'); end if;
  if new.status='completed' then
    new.completed_at:=coalesce(new.completed_at,now()); new.completed_by:=coalesce(new.completed_by,auth.uid()); new.progress:=100;
  elsif tg_op='UPDATE' and old.status='completed' and new.status<>'completed' then
    new.completed_at:=null; new.completed_by:=null;
  end if;
  if new.notes_document is null or jsonb_typeof(new.notes_document)<>'object' then
    raise exception 'O documento de observações deve ser um objeto JSON válido.';
  end if;
  return new;
end $$;

drop trigger if exists project_activities_sync_fields on public.project_activities;
create trigger project_activities_sync_fields before insert or update on public.project_activities for each row execute function public.sync_activity_fields();

create or replace function public.enforce_activity_children_before_completion()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare pending_count integer; force_value text;
begin
  if new.status='completed' and old.status is distinct from 'completed' then
    select count(*) into pending_count from public.project_activities c where c.parent_id=new.id and c.deleted_at is null and c.archived_at is null and c.status not in('completed','cancelled');
    force_value:=coalesce(current_setting('camilla.force_activity_complete',true),'off');
    if pending_count>0 and force_value<>'on' then raise exception 'A atividade possui % subatividade(s) pendente(s).',pending_count; end if;
  end if;
  return new;
end $$;

drop trigger if exists project_activities_enforce_children on public.project_activities;
create trigger project_activities_enforce_children before update of status on public.project_activities for each row execute function public.enforce_activity_children_before_completion();

create or replace function public.recalculate_parent_activity_progress()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare parent_value uuid; total_count integer; completed_count integer; auto_complete boolean;
begin
  if pg_trigger_depth()>1 then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  parent_value:=case when tg_op='DELETE' then old.parent_id when tg_op='INSERT' then new.parent_id else coalesce(new.parent_id,old.parent_id) end;
  if parent_value is null then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  select count(*),count(*) filter(where status in('completed','cancelled')) into total_count,completed_count
  from public.project_activities where parent_id=parent_value and deleted_at is null and archived_at is null;
  select coalesce((value#>>'{}')::boolean,false) into auto_complete from public.system_settings where key='activity_auto_complete_parent';
  perform set_config('camilla.force_activity_complete','on',true);
  update public.project_activities
  set progress=case when total_count=0 then progress else round(completed_count*100.0/total_count)::smallint end,
      status=case when auto_complete and total_count>0 and completed_count=total_count then 'completed' else status end,
      completed_at=case when auto_complete and total_count>0 and completed_count=total_count then coalesce(completed_at,now()) else completed_at end,
      completed_by=case when auto_complete and total_count>0 and completed_count=total_count then coalesce(completed_by,auth.uid()) else completed_by end
  where id=parent_value;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;

drop trigger if exists project_activities_recalculate_parent on public.project_activities;
create trigger project_activities_recalculate_parent after insert or update of status,parent_id,archived_at,deleted_at or delete on public.project_activities for each row execute function public.recalculate_parent_activity_progress();

-- 8. RPCs operacionais
create or replace function public.save_activity(p_activity_id uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_activity_id uuid:=p_activity_id; user_value uuid; participant_value text; project_value uuid; client_value uuid;
begin
  if auth.uid() is null or not public.current_user_access_valid() then raise exception 'Autenticação obrigatória.'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'Dados inválidos.'; end if;
  if v_activity_id is null then
    if not public.has_permission('activities','create','own') then raise exception 'Sem permissão para criar atividades.'; end if;
    project_value:=public.safe_uuid(nullif(p_payload->>'project_id',''));
    client_value:=public.safe_uuid(nullif(p_payload->>'client_id',''));
    if project_value is not null and not public.can_edit_project(project_value) then raise exception 'Sem acesso de edição ao projeto.'; end if;
    insert into public.project_activities(
      project_id,client_id,parent_id,title,description,notes_document,group_name,responsible_user_id,responsible_name,
      priority,starts_at,due_at,due_date,all_day,status,progress,stage,tags,position,created_by,updated_by
    ) values(
      project_value,client_value,public.safe_uuid(nullif(p_payload->>'parent_id','')),trim(p_payload->>'title'),nullif(trim(p_payload->>'description'),''),
      coalesce(p_payload->'notes_document','{"version":1,"blocks":[]}'::jsonb),coalesce(nullif(trim(p_payload->>'group_name'),''),'Projetos'),
      public.safe_uuid(nullif(p_payload->>'responsible_user_id','')),nullif(trim(p_payload->>'responsible_name'),''),coalesce(nullif(p_payload->>'priority',''),'normal'),
      nullif(p_payload->>'starts_at','')::timestamptz,nullif(p_payload->>'due_at','')::timestamptz,nullif(p_payload->>'due_date','')::date,
      coalesce((p_payload->>'all_day')::boolean,true),coalesce(nullif(p_payload->>'status',''),'not_started'),coalesce((p_payload->>'progress')::smallint,0),
      nullif(p_payload->>'stage',''),coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'tags','[]'::jsonb))),'{}'::text[]),
      coalesce((p_payload->>'position')::integer,(select coalesce(max(position),-1)+1 from public.project_activities where parent_id is not distinct from public.safe_uuid(nullif(p_payload->>'parent_id','')))),
      auth.uid(),auth.uid()
    ) returning id into v_activity_id;
  else
    if not public.can_edit_activity(v_activity_id) then raise exception 'Sem permissão para editar esta atividade.'; end if;
    update public.project_activities set
      title=case when p_payload?'title' then trim(p_payload->>'title') else title end,
      description=case when p_payload?'description' then nullif(trim(p_payload->>'description'),'') else description end,
      notes_document=case when p_payload?'notes_document' then p_payload->'notes_document' else notes_document end,
      group_name=case when p_payload?'group_name' then coalesce(nullif(trim(p_payload->>'group_name'),''),'Projetos') else group_name end,
      responsible_user_id=case when p_payload?'responsible_user_id' then public.safe_uuid(nullif(p_payload->>'responsible_user_id','')) else responsible_user_id end,
      responsible_name=case when p_payload?'responsible_name' then nullif(trim(p_payload->>'responsible_name'),'') else responsible_name end,
      priority=case when p_payload?'priority' then p_payload->>'priority' else priority end,
      starts_at=case when p_payload?'starts_at' then nullif(p_payload->>'starts_at','')::timestamptz else starts_at end,
      due_at=case when p_payload?'due_at' then nullif(p_payload->>'due_at','')::timestamptz else due_at end,
      due_date=case when p_payload?'due_date' then nullif(p_payload->>'due_date','')::date else due_date end,
      all_day=case when p_payload?'all_day' then (p_payload->>'all_day')::boolean else all_day end,
      project_id=case when p_payload?'project_id' then public.safe_uuid(nullif(p_payload->>'project_id','')) else project_id end,
      client_id=case when p_payload?'client_id' then public.safe_uuid(nullif(p_payload->>'client_id','')) else client_id end,
      parent_id=case when p_payload?'parent_id' then public.safe_uuid(nullif(p_payload->>'parent_id','')) else parent_id end,
      stage=case when p_payload?'stage' then nullif(p_payload->>'stage','') else stage end,
      tags=case when p_payload?'tags' then coalesce(array(select jsonb_array_elements_text(p_payload->'tags')),'{}'::text[]) else tags end,
      progress=case when p_payload?'progress' then greatest(0,least(100,(p_payload->>'progress')::smallint)) else progress end,
      position=case when p_payload?'position' then (p_payload->>'position')::integer else position end,
      updated_by=auth.uid()
    where id=v_activity_id;
  end if;
  if p_payload?'participant_ids' then
    delete from public.activity_participants where activity_id=v_activity_id;
    for participant_value in select jsonb_array_elements_text(coalesce(p_payload->'participant_ids','[]'::jsonb)) loop
      user_value:=public.safe_uuid(participant_value);
      if user_value is not null then insert into public.activity_participants(activity_id,user_id,created_by) values(v_activity_id,user_value,auth.uid()) on conflict do nothing; end if;
    end loop;
  end if;
  return v_activity_id;
end $$;

create or replace function public.set_activity_status(p_activity_id uuid,p_status text,p_force boolean default false,p_reason text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare pending_count integer;
begin
  if not public.can_edit_activity(p_activity_id) or not public.has_permission('activities','change_status','own') then raise exception 'Sem permissão para alterar o status.'; end if;
  if not exists(select 1 from public.activity_statuses where code=p_status and active and archived_at is null) then raise exception 'Status inválido.'; end if;
  select count(*) into pending_count from public.project_activities where parent_id=p_activity_id and deleted_at is null and archived_at is null and status not in('completed','cancelled');
  if p_status='completed' and pending_count>0 then
    if not p_force then raise exception 'A atividade possui % subatividade(s) pendente(s).',pending_count; end if;
    if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'Informe uma justificativa para concluir com pendências.'; end if;
    if not (public.has_permission('activities','edit','all') or public.has_permission('settings','manage_settings','own')) then raise exception 'Sem permissão para forçar a conclusão.'; end if;
    perform set_config('camilla.force_activity_complete','on',true);
  end if;
  update public.project_activities set status=p_status,updated_by=auth.uid() where id=p_activity_id;
  if p_force then
    insert into public.history_entries(module,record_type,record_id,project_id,actor_user_id,action,description,metadata,source_table,source_id)
    select 'activities',case when parent_id is null then 'activity' else 'subactivity' end,id::text,project_id,auth.uid(),'forced_completion','Atividade concluída com subatividades pendentes.',jsonb_build_object('reason',p_reason,'pending_count',pending_count),'project_activities',id::text||':forced:'||txid_current()::text from public.project_activities where id=p_activity_id;
  end if;
end $$;

create or replace function public.bulk_update_activities(p_activity_ids uuid[],p_changes jsonb)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare activity_id uuid; changed integer:=0; status_value text;
begin
  if coalesce(array_length(p_activity_ids,1),0)=0 then return 0; end if;
  foreach activity_id in array p_activity_ids loop
    if not public.can_edit_activity(activity_id) then raise exception 'Sem permissão para editar a atividade %.',activity_id; end if;
  end loop;
  status_value:=nullif(p_changes->>'status','');
  foreach activity_id in array p_activity_ids loop
    if status_value is not null then perform public.set_activity_status(activity_id,status_value,false,null); end if;
    perform public.save_activity(activity_id,p_changes-'status'); changed:=changed+1;
  end loop;
  return changed;
end $$;

create or replace function public.duplicate_activity(p_activity_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare source_row public.project_activities%rowtype; new_id uuid; child public.project_activities%rowtype; new_child uuid;
begin
  if not public.can_access_activity(p_activity_id) or not public.has_permission('activities','create','own') then raise exception 'Sem permissão para duplicar.'; end if;
  select * into source_row from public.project_activities where id=p_activity_id and deleted_at is null;
  if not found then raise exception 'Atividade não encontrada.'; end if;
  insert into public.project_activities(project_id,client_id,parent_id,title,description,notes_document,group_name,responsible_user_id,responsible_name,priority,starts_at,due_at,due_date,all_day,status,progress,stage,tags,position,created_by,updated_by)
  values(source_row.project_id,source_row.client_id,null,source_row.title||' — Cópia',source_row.description,source_row.notes_document,source_row.group_name,source_row.responsible_user_id,source_row.responsible_name,source_row.priority,source_row.starts_at,source_row.due_at,source_row.due_date,source_row.all_day,'not_started',0,source_row.stage,source_row.tags,source_row.position+1,auth.uid(),auth.uid()) returning id into new_id;
  insert into public.activity_participants(activity_id,user_id,participant_role,created_by) select new_id,user_id,participant_role,auth.uid() from public.activity_participants where activity_id=p_activity_id;
  for child in select * from public.project_activities where parent_id=p_activity_id and deleted_at is null order by position loop
    insert into public.project_activities(project_id,client_id,parent_id,title,description,notes_document,group_name,responsible_user_id,responsible_name,priority,starts_at,due_at,due_date,all_day,status,progress,stage,tags,position,created_by,updated_by)
    values(child.project_id,child.client_id,new_id,child.title,child.description,child.notes_document,child.group_name,child.responsible_user_id,child.responsible_name,child.priority,child.starts_at,child.due_at,child.due_date,child.all_day,'not_started',0,child.stage,child.tags,child.position,auth.uid(),auth.uid()) returning id into new_child;
    insert into public.activity_participants(activity_id,user_id,participant_role,created_by) select new_child,user_id,participant_role,auth.uid() from public.activity_participants where activity_id=child.id;
  end loop;
  return new_id;
end $$;

create or replace function public.move_activity(p_activity_id uuid,p_parent_id uuid default null,p_position integer default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.can_edit_activity(p_activity_id) then raise exception 'Sem permissão para mover a atividade.'; end if;
  if p_parent_id is not null and not public.can_edit_activity(p_parent_id) then raise exception 'Sem permissão sobre a atividade principal.'; end if;
  update public.project_activities set parent_id=p_parent_id,position=coalesce(p_position,(select coalesce(max(position),-1)+1 from public.project_activities where parent_id is not distinct from p_parent_id and deleted_at is null)),updated_by=auth.uid() where id=p_activity_id;
end $$;

create or replace function public.reorder_activity(p_activity_id uuid,p_position integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$ begin if not public.can_edit_activity(p_activity_id) then raise exception 'Sem permissão.'; end if; update public.project_activities set position=greatest(0,p_position),updated_by=auth.uid() where id=p_activity_id; end $$;
create or replace function public.archive_activity(p_activity_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$ begin if not public.can_edit_activity(p_activity_id) or not public.has_permission('activities','archive','own') then raise exception 'Sem permissão para arquivar.'; end if; update public.project_activities set archived_at=now(),archived_by=auth.uid(),updated_by=auth.uid() where id=p_activity_id; end $$;
create or replace function public.reactivate_activity(p_activity_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$ begin if not public.has_permission('activities','reactivate','own') then raise exception 'Sem permissão para reativar.'; end if; update public.project_activities set archived_at=null,archived_by=null,updated_by=auth.uid() where id=p_activity_id; end $$;
create or replace function public.delete_activity_logically(p_activity_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.can_edit_activity(p_activity_id) or not public.has_permission('activities','delete','own') then raise exception 'Sem permissão para excluir.'; end if;
  update public.project_activities set parent_id=null,updated_by=auth.uid() where parent_id=p_activity_id and deleted_at is null;
  update public.project_activities set deleted_at=now(),deleted_by=auth.uid(),archived_at=coalesce(archived_at,now()),archived_by=coalesce(archived_by,auth.uid()),updated_by=auth.uid() where id=p_activity_id;
end $$;

-- 9. Comentários de atividades
create or replace function public.save_activity_comment(p_activity_id uuid,p_comment text,p_parent_id uuid default null,p_kind text default 'comment',p_important boolean default false,p_mentions uuid[] default '{}'::uuid[],p_comment_id uuid default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare comment_value uuid:=p_comment_id; project_value uuid; created_value timestamptz; author_value uuid; edit_minutes integer:=15; mentioned uuid;
begin
  if not public.can_access_activity(p_activity_id) or not public.has_permission('comments','create','own') then raise exception 'Sem permissão para comentar.'; end if;
  if p_kind='internal_note' and not public.has_permission('comments','create_internal','own') then raise exception 'Sem permissão para observação interna.'; end if;
  if nullif(trim(p_comment),'') is null then raise exception 'Comentário obrigatório.'; end if;
  select project_id into project_value from public.project_activities where id=p_activity_id;
  if comment_value is null then
    insert into public.project_comments(project_id,activity_id,parent_comment_id,author_id,comment,comment_kind,important)
    values(project_value,p_activity_id,p_parent_id,auth.uid(),trim(p_comment),p_kind,p_important) returning id into comment_value;
  else
    select created_at,author_id into created_value,author_value from public.project_comments where id=comment_value and activity_id=p_activity_id and deleted_at is null;
    if not found then raise exception 'Comentário não encontrado.'; end if;
    select coalesce((value#>>'{}')::integer,15) into edit_minutes from public.system_settings where key='comment_edit_window_minutes';
    if author_value<>auth.uid() and not public.has_permission('comments','edit','all') then raise exception 'Sem permissão para editar.'; end if;
    if author_value=auth.uid() and created_value+make_interval(mins=>edit_minutes)<now() and not public.has_permission('comments','edit','all') then raise exception 'O prazo de edição expirou.'; end if;
    update public.project_comments set comment=trim(p_comment),comment_kind=p_kind,important=p_important,edited_at=now(),updated_at=now() where id=comment_value;
    delete from public.comment_mentions where comment_id=comment_value;
  end if;
  foreach mentioned in array coalesce(p_mentions,'{}'::uuid[]) loop
    if mentioned<>auth.uid() then insert into public.comment_mentions(comment_id,user_id) values(comment_value,mentioned) on conflict do nothing; end if;
  end loop;
  return comment_value;
end $$;

create or replace function public.delete_project_comment(p_comment_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare row_data public.project_comments%rowtype;
begin
  select * into row_data from public.project_comments where id=p_comment_id and deleted_at is null;
  if not found then raise exception 'Comentário não encontrado.'; end if;
  if row_data.author_id<>auth.uid() and not public.has_permission('comments','delete','all') then raise exception 'Sem permissão para excluir.'; end if;
  if row_data.project_id is not null and not public.can_access_project(row_data.project_id) then raise exception 'Sem acesso ao projeto.'; end if;
  if row_data.activity_id is not null and not public.can_access_activity(row_data.activity_id) then raise exception 'Sem acesso à atividade.'; end if;
  update public.project_comments set deleted_at=now(),deleted_by=auth.uid(),updated_at=now() where id=p_comment_id;
end $$;

-- 10. Histórico e notificações das atividades
create or replace function public.log_activity_central_history()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare row_value jsonb; old_value_json jsonb; action_value text; description_value text; recipient uuid; type_value text; project_value uuid; activity_value uuid;
begin
  row_value:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  old_value_json:=case when tg_op='INSERT' then null else to_jsonb(old) end;
  activity_value:=(row_value->>'id')::uuid; project_value=public.safe_uuid(row_value->>'project_id');
  if tg_op='INSERT' then action_value:='created'; description_value:=case when row_value->>'parent_id' is null then 'Atividade criada.' else 'Subatividade criada.' end;
  elsif tg_op='DELETE' then action_value:='deleted'; description_value:='Atividade removida.';
  elsif new.deleted_at is not null and old.deleted_at is null then action_value:='deleted'; description_value:='Atividade excluída logicamente.';
  elsif new.archived_at is not null and old.archived_at is null then action_value:='archived'; description_value:='Atividade arquivada.';
  elsif new.archived_at is null and old.archived_at is not null then action_value:='reactivated'; description_value:='Atividade reativada.';
  elsif new.parent_id is distinct from old.parent_id then action_value:='moved'; description_value:='Hierarquia da atividade alterada.';
  elsif new.status is distinct from old.status then action_value:='status_changed'; description_value:='Status alterado de '||old.status||' para '||new.status||'.';
  elsif new.responsible_user_id is distinct from old.responsible_user_id then action_value:='responsible_changed'; description_value:='Responsável da atividade alterado.';
  elsif new.due_at is distinct from old.due_at then action_value:='deadline_changed'; description_value:='Prazo da atividade alterado.';
  elsif new.notes_document is distinct from old.notes_document then action_value:='notes_changed'; description_value:='Observações da atividade alteradas.';
  else action_value:='updated'; description_value:='Atividade alterada.'; end if;
  insert into public.history_entries(module,record_type,record_id,project_id,actor_user_id,action,old_value,new_value,description,source_table,source_id)
  values('activities',case when row_value->>'parent_id' is null then 'activity' else 'subactivity' end,activity_value::text,project_value,auth.uid(),action_value,old_value_json,case when tg_op='DELETE' then null else row_value end,description_value,'project_activities',activity_value::text||':'||txid_current()::text||':'||tg_op)
  on conflict(source_table,source_id) where source_table is not null and source_id is not null do nothing;
  if tg_op<>'DELETE' then
    if tg_op='INSERT' or old.responsible_user_id is distinct from new.responsible_user_id then recipient:=new.responsible_user_id; type_value:=case when new.parent_id is null then 'activity_assigned' else 'subactivity_assigned' end;
    elsif old.status is distinct from new.status and new.status='completed' then recipient:=coalesce((select responsible_user_id from public.projects where id=new.project_id),new.created_by); type_value:='activity_completed'; end if;
    if recipient is not null then perform public.enqueue_notification(recipient,type_value,'activities','activity',new.id::text,new.project_id,new.title,case when type_value='activity_completed' then 'A atividade foi concluída.' else 'Uma atividade foi atribuída a você.' end,'/activities?activity='||new.id,auth.uid(),type_value||':'||new.id||':'||new.updated_at||':'||recipient,jsonb_build_object('activity_id',new.id)); end if;
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;

drop trigger if exists project_activities_history_notify on public.project_activities;
create trigger project_activities_history_notify after insert or update or delete on public.project_activities for each row execute function public.log_activity_central_history();

create or replace function public.log_comment_history_notify()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare action_value text; description_value text; project_value uuid; link_value text;
begin
  action_value:=case when tg_op='INSERT' then 'comment_created' when new.deleted_at is not null and old.deleted_at is null then 'comment_deleted' else 'comment_updated' end;
  description_value:=case action_value when 'comment_created' then case when new.comment_kind='internal_note' then 'Observação interna criada.' else 'Comentário criado.' end when 'comment_deleted' then 'Comentário removido.' else 'Comentário editado.' end;
  project_value:=coalesce(new.project_id,(select project_id from public.project_activities where id=new.activity_id));
  insert into public.history_entries(module,record_type,record_id,project_id,actor_user_id,action,old_value,new_value,description,metadata,source_table,source_id)
  values('comments','comment',new.id::text,project_value,auth.uid(),action_value,case when tg_op='UPDATE' then to_jsonb(old) end,to_jsonb(new),description_value,jsonb_build_object('activity_id',new.activity_id),'project_comments',new.id::text||':'||new.updated_at::text)
  on conflict(source_table,source_id) where source_table is not null and source_id is not null do nothing;
  if tg_op='INSERT' then
    if new.activity_id is not null then link_value:='/activities?activity='||new.activity_id; else link_value:='/projects/'||new.project_id||'?section=comments'; end if;
    if new.activity_id is not null then
      perform public.enqueue_notification(a.responsible_user_id,'comment_added','comments','comment',new.id::text,project_value,'Novo comentário',left(new.comment,240),link_value,new.author_id,'activity_comment:'||new.id||':'||a.responsible_user_id,jsonb_build_object('activity_id',new.activity_id)) from public.project_activities a where a.id=new.activity_id and a.responsible_user_id is not null;
    end if;
  end if;
  return new;
end $$;

create or replace function public.notify_comment_mention()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare cm public.project_comments%rowtype; link_value text; project_value uuid;
begin
  select * into cm from public.project_comments where id=new.comment_id;
  project_value:=coalesce(cm.project_id,(select project_id from public.project_activities where id=cm.activity_id));
  link_value:=case when cm.activity_id is not null then '/activities?activity='||cm.activity_id else '/projects/'||cm.project_id||'?section=comments' end;
  perform public.enqueue_notification(new.user_id,'mention','comments','comment',cm.id::text,project_value,'Você foi mencionado',left(cm.comment,240),link_value,cm.author_id,'mention:'||cm.id||':'||new.user_id,jsonb_build_object('activity_id',cm.activity_id));
  return new;
end $$;

-- 11. RLS
alter table public.activity_participants enable row level security;
alter table public.activity_saved_views enable row level security;

do $$ declare r record; begin
  for r in select policyname,tablename from pg_policies where schemaname='public' and tablename in('project_activities','activity_participants','activity_saved_views','project_comments','calendar_events','project_files') loop execute format('drop policy if exists %I on public.%I',r.policyname,r.tablename); end loop;
end $$;

create policy activities_select_scope on public.project_activities for select to authenticated using(deleted_at is null and public.can_access_activity(id));
create policy activities_insert_scope on public.project_activities for insert to authenticated with check(public.has_permission('activities','create','own') and (project_id is null or public.can_edit_project(project_id)));
create policy activities_update_scope on public.project_activities for update to authenticated using(public.can_edit_activity(id)) with check(public.can_edit_activity(id));
create policy activities_delete_scope on public.project_activities for delete to authenticated using(public.has_permission('activities','delete','all') and public.can_edit_activity(id));

create policy activity_participants_select on public.activity_participants for select to authenticated using(public.can_access_activity(activity_id));
create policy activity_participants_insert on public.activity_participants for insert to authenticated with check(public.can_edit_activity(activity_id));
create policy activity_participants_update on public.activity_participants for update to authenticated using(public.can_edit_activity(activity_id)) with check(public.can_edit_activity(activity_id));
create policy activity_participants_delete on public.activity_participants for delete to authenticated using(public.can_edit_activity(activity_id));

create policy activity_saved_views_select_own on public.activity_saved_views for select to authenticated using(user_id=auth.uid());
create policy activity_saved_views_insert_own on public.activity_saved_views for insert to authenticated with check(user_id=auth.uid());
create policy activity_saved_views_update_own on public.activity_saved_views for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy activity_saved_views_delete_own on public.activity_saved_views for delete to authenticated using(user_id=auth.uid());

create policy project_comments_select_scope on public.project_comments for select to authenticated using(
  ((project_id is not null and public.can_access_project(project_id)) or (activity_id is not null and public.can_access_activity(activity_id)))
  and (comment_kind='comment' or public.has_permission('comments','view_internal','own'))
);

create policy calendar_select_scope on public.calendar_events for select to authenticated using(public.can_access_calendar_event(id));
create policy calendar_insert_scope on public.calendar_events for insert to authenticated with check(public.has_permission('agenda','create','own') and ((project_id is null or public.can_edit_project(project_id)) and (activity_id is null or public.can_edit_activity(activity_id))));
create policy calendar_update_scope on public.calendar_events for update to authenticated using(public.has_permission('agenda','edit','assigned') and public.can_access_calendar_event(id)) with check(public.has_permission('agenda','edit','assigned') and public.can_access_calendar_event(id));
create policy calendar_delete_scope on public.calendar_events for delete to authenticated using(public.has_permission('agenda','delete','assigned') and public.can_access_calendar_event(id));

create policy linked_files_select_scope on public.project_files for select to authenticated using(public.can_access_linked_file(id,false) and public.has_permission('files','view','own'));
create policy linked_files_insert_scope on public.project_files for insert to authenticated with check(public.has_permission('files','add_file','own') and (
  (project_id is not null and public.can_edit_project(project_id)) or (client_id is not null and public.has_permission('clients','edit','own')) or
  (activity_id is not null and public.can_edit_activity(activity_id)) or
  (financial_entry_id is not null and exists(select 1 from public.financial_entries f where f.id=financial_entry_id and public.can_view_finance(f.environment)))
));
create policy linked_files_update_scope on public.project_files for update to authenticated using(public.can_access_linked_file(id,true) and (public.has_permission('files','add_file','own') or public.has_permission('files','remove_file','own'))) with check(public.can_access_linked_file(id,true));
create policy linked_files_delete_scope on public.project_files for delete to authenticated using(public.can_access_linked_file(id,true) and public.has_permission('files','remove_file','own'));

-- 12. Grants e proteção das funções privilegiadas
grant select,insert,update,delete on public.activity_participants,public.activity_saved_views to authenticated;
grant select on public.activity_statuses to authenticated;

revoke all on function public.can_access_activity(uuid) from public,anon;
revoke all on function public.validate_activity_hierarchy() from public,anon,authenticated;
revoke all on function public.sync_activity_fields() from public,anon,authenticated;
revoke all on function public.enforce_activity_children_before_completion() from public,anon,authenticated;
revoke all on function public.recalculate_parent_activity_progress() from public,anon,authenticated;
revoke all on function public.log_activity_central_history() from public,anon,authenticated;
revoke all on function public.log_comment_history_notify() from public,anon,authenticated;
revoke all on function public.notify_comment_mention() from public,anon,authenticated;
revoke all on function public.can_edit_activity(uuid) from public,anon;
revoke all on function public.save_activity(uuid,jsonb) from public,anon;
revoke all on function public.set_activity_status(uuid,text,boolean,text) from public,anon;
revoke all on function public.bulk_update_activities(uuid[],jsonb) from public,anon;
revoke all on function public.duplicate_activity(uuid) from public,anon;
revoke all on function public.move_activity(uuid,uuid,integer) from public,anon;
revoke all on function public.reorder_activity(uuid,integer) from public,anon;
revoke all on function public.archive_activity(uuid) from public,anon;
revoke all on function public.reactivate_activity(uuid) from public,anon;
revoke all on function public.delete_activity_logically(uuid) from public,anon;
revoke all on function public.save_activity_comment(uuid,text,uuid,text,boolean,uuid[],uuid) from public,anon;

grant execute on function public.can_access_activity(uuid),public.can_edit_activity(uuid),public.save_activity(uuid,jsonb),public.set_activity_status(uuid,text,boolean,text),public.bulk_update_activities(uuid[],jsonb),public.duplicate_activity(uuid),public.move_activity(uuid,uuid,integer),public.reorder_activity(uuid,integer),public.archive_activity(uuid),public.reactivate_activity(uuid),public.delete_activity_logically(uuid),public.save_activity_comment(uuid,text,uuid,text,boolean,uuid[],uuid),public.delete_project_comment(uuid) to authenticated;

-- 13. Versão
insert into public.system_versions(version,notes,environment)
values('3.0.6','Etapa 05: workspace de atividades com tabela, lista, quadro, calendário, linha do tempo, visualizações salvas, subatividades, observações estruturadas e ações em massa.','production')
on conflict(version) do update set notes=excluded.notes,environment=excluded.environment,released_at=now();

commit;
