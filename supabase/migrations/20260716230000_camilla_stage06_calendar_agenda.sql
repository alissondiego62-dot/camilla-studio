-- Camilla Studio 3.0.7 — Etapa 06: Calendário, Agenda e integração bidirecional
-- Aplicar somente após a Etapa 05 (versão 3.0.6).
begin;

-- 0. Pré-condições
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.system_versions WHERE version='3.0.6') THEN
    RAISE EXCEPTION 'A Etapa 05 (versão 3.0.6) deve ser aplicada antes da Etapa 06.';
  END IF;
  IF to_regclass('public.project_activities') IS NULL OR to_regclass('public.project_dates') IS NULL OR to_regclass('public.calendar_events') IS NULL THEN
    RAISE EXCEPTION 'Estruturas obrigatórias de Agenda, Atividades ou Prazos não foram encontradas.';
  END IF;
END $$;

-- 1. Evolução aditiva dos eventos manuais
alter table public.calendar_events
  add column if not exists all_day boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null;

update public.calendar_events
set status='completed',updated_at=now()
where completed_at is not null and status is distinct from 'completed';

update public.calendar_events
set cancelled_at=coalesce(cancelled_at,updated_at,now())
where status='cancelled' and cancelled_at is null;

alter table public.calendar_events drop constraint if exists calendar_events_valid_range;
alter table public.calendar_events add constraint calendar_events_valid_range check(ends_at is null or ends_at>=starts_at);
create index if not exists calendar_events_visible_range_idx on public.calendar_events(starts_at,coalesce(ends_at,starts_at),status) where archived_at is null;
create index if not exists calendar_events_responsible_range_idx on public.calendar_events(responsible_user_id,starts_at) where archived_at is null and responsible_user_id is not null;

insert into public.system_settings(key,value,description) values
('agenda_snap_minutes','15'::jsonb,'Intervalo, em minutos, utilizado ao mover ou redimensionar itens na Agenda.'),
('agenda_default_view','"week"'::jsonb,'Visualização padrão da Agenda profissional.'),
('agenda_hide_cancelled','true'::jsonb,'Ocultar itens cancelados na visão padrão da Agenda.'),
('agenda_time_zone','"America/Boa_Vista"'::jsonb,'Fuso operacional da Agenda.')
on conflict(key) do update set description=excluded.description,updated_at=now();

insert into public.permission_catalog(module,action,module_label,action_label,supports_scope,position) values
('agenda','move','Agenda','Mover itens',true,68),
('agenda','resize','Agenda','Alterar duração',true,69),
('agenda','cancel','Agenda','Cancelar eventos',true,70),
('agenda','archive','Agenda','Arquivar eventos',true,71)
on conflict(module,action) do update set module_label=excluded.module_label,action_label=excluded.action_label,supports_scope=excluded.supports_scope,position=excluded.position;

insert into public.profile_permissions(profile_id,permission_profile_id,module,action,allowed,scope)
select pp.profile_id,pp.permission_profile_id,'agenda',new_action,pp.allowed,pp.scope
from public.profile_permissions pp
cross join (values('move'),('resize')) actions(new_action)
where pp.module='agenda' and pp.action='edit'
on conflict(profile_id,module,action) do update set allowed=excluded.allowed,scope=excluded.scope,permission_profile_id=excluded.permission_profile_id;

insert into public.profile_permissions(profile_id,permission_profile_id,module,action,allowed,scope)
select pp.profile_id,pp.permission_profile_id,'agenda',new_action,pp.allowed,pp.scope
from public.profile_permissions pp
cross join (values('cancel'),('archive')) actions(new_action)
where pp.module='agenda' and pp.action='delete'
on conflict(profile_id,module,action) do update set allowed=excluded.allowed,scope=excluded.scope,permission_profile_id=excluded.permission_profile_id;

-- 2. Camada unificada sem duplicar registros
create or replace view public.agenda_items
with (security_invoker=true) as
select
  'event:'||e.id::text as item_key,
  'event'::text as source_type,
  e.id as source_id,
  e.title,
  e.notes as description,
  e.starts_at,
  coalesce(e.ends_at,e.starts_at+case when e.all_day then interval '1 day' else interval '1 hour' end) as ends_at,
  e.all_day,
  e.status,
  e.event_type as item_type,
  e.project_id,
  p.name as project_name,
  e.activity_id,
  coalesce(e.responsible_user_id,e.assigned_user_id) as responsible_user_id,
  pr.name as responsible_name,
  e.location,
  case e.event_type when 'meeting' then '#9b6352' when 'visit' then '#52705c' when 'presentation' then '#765044' when 'personal' then '#8b6a3d' else '#8e7c75' end as color,
  (public.has_permission('agenda','edit','assigned') and public.can_access_calendar_event(e.id)) as editable,
  e.created_at,
  e.updated_at
from public.calendar_events e
left join public.projects p on p.id=e.project_id
left join public.profiles pr on pr.id=coalesce(e.responsible_user_id,e.assigned_user_id)
where e.archived_at is null
union all
select
  'activity:'||a.id::text,
  'activity'::text,
  a.id,
  a.title,
  a.description,
  coalesce(a.starts_at,a.due_at),
  case
    when a.all_day then coalesce(a.due_at,a.starts_at)+interval '1 day'
    when a.starts_at is not null and a.due_at is not null then greatest(a.due_at,a.starts_at+interval '15 minutes')
    when a.due_at is not null then a.due_at+interval '15 minutes'
    else a.starts_at+interval '1 hour'
  end,
  a.all_day,
  a.status,
  case when a.parent_id is null then 'activity' else 'subactivity' end,
  a.project_id,
  p.name,
  a.id,
  a.responsible_user_id,
  coalesce(a.responsible_name,pr.name),
  null::text,
  coalesce(s.color,'#9b6352'),
  public.can_edit_activity(a.id),
  a.created_at,
  a.updated_at
from public.project_activities a
left join public.projects p on p.id=a.project_id
left join public.profiles pr on pr.id=a.responsible_user_id
left join public.activity_statuses s on s.code=a.status
where a.deleted_at is null and a.archived_at is null and coalesce(a.starts_at,a.due_at) is not null
union all
select
  'project_date:'||d.id::text,
  'project_date'::text,
  d.id,
  d.title,
  d.description,
  d.starts_at,
  coalesce(d.ends_at,d.starts_at+case when d.all_day then interval '1 day' else interval '1 hour' end),
  d.all_day,
  d.status,
  'project_deadline'::text,
  d.project_id,
  p.name,
  d.activity_id,
  p.responsible_user_id,
  coalesce(p.responsible_name,pr.name),
  null::text,
  coalesce(c.color,case when d.is_main_deadline then '#8f4239' else '#8b6a3d' end),
  (public.can_edit_project(d.project_id) and public.has_permission('projects','change_deadline','own')),
  d.created_at,
  d.updated_at
from public.project_dates d
join public.projects p on p.id=d.project_id
left join public.profiles pr on pr.id=p.responsible_user_id
left join public.system_categories c on c.module='project_date_type' and c.code=d.purpose_code and c.archived_at is null
where d.archived_at is null and d.activity_id is null and d.calendar_event_id is null;

revoke all on public.agenda_items from anon;
grant select on public.agenda_items to authenticated;

-- 3. Eventos manuais
create or replace function public.save_calendar_event(p_event_id uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid:=p_event_id;v_start timestamptz;v_end timestamptz;v_project uuid;v_activity uuid;v_status text;v_all_day boolean;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  v_start:=nullif(p_payload->>'starts_at','')::timestamptz;
  v_end:=nullif(p_payload->>'ends_at','')::timestamptz;
  v_project:=public.safe_uuid(p_payload->>'project_id');
  v_activity:=public.safe_uuid(p_payload->>'activity_id');
  v_status:=coalesce(nullif(p_payload->>'status',''),'scheduled');
  v_all_day:=coalesce((p_payload->>'all_day')::boolean,false);
  if trim(coalesce(p_payload->>'title',''))='' or v_start is null then raise exception 'Título e início são obrigatórios.'; end if;
  if v_end is not null and v_end<v_start then raise exception 'O fim não pode ser anterior ao início.'; end if;
  if v_project is not null and not public.can_access_project(v_project) then raise exception 'Sem acesso ao projeto.'; end if;
  if v_activity is not null and not public.can_access_activity(v_activity) then raise exception 'Sem acesso à atividade.'; end if;
  if v_id is null then
    if not public.has_permission('agenda','create','own') then raise exception 'Permissão insuficiente para criar eventos.'; end if;
    insert into public.calendar_events(project_id,activity_id,title,event_type,starts_at,ends_at,all_day,location,notes,status,responsible_user_id,assigned_user_id,created_by,updated_by,completed_at,cancelled_at,cancelled_by)
    values(v_project,v_activity,trim(p_payload->>'title'),coalesce(nullif(p_payload->>'event_type',''),'meeting'),v_start,v_end,v_all_day,nullif(trim(coalesce(p_payload->>'location','')),''),nullif(trim(coalesce(p_payload->>'notes','')),''),v_status,public.safe_uuid(p_payload->>'responsible_user_id'),public.safe_uuid(p_payload->>'responsible_user_id'),auth.uid(),auth.uid(),case when v_status='completed' then now() end,case when v_status='cancelled' then now() end,case when v_status='cancelled' then auth.uid() end)
    returning id into v_id;
  else
    if not public.can_access_calendar_event(v_id) or not public.has_permission('agenda','edit','assigned') then raise exception 'Permissão insuficiente para editar o evento.'; end if;
    update public.calendar_events set project_id=v_project,activity_id=v_activity,title=trim(p_payload->>'title'),event_type=coalesce(nullif(p_payload->>'event_type',''),'meeting'),starts_at=v_start,ends_at=v_end,all_day=v_all_day,location=nullif(trim(coalesce(p_payload->>'location','')),''),notes=nullif(trim(coalesce(p_payload->>'notes','')),''),status=v_status,responsible_user_id=public.safe_uuid(p_payload->>'responsible_user_id'),assigned_user_id=public.safe_uuid(p_payload->>'responsible_user_id'),updated_by=auth.uid(),updated_at=now(),completed_at=case when v_status='completed' then coalesce(completed_at,now()) else null end,cancelled_at=case when v_status='cancelled' then coalesce(cancelled_at,now()) else null end,cancelled_by=case when v_status='cancelled' then auth.uid() else null end
    where id=v_id and archived_at is null;
    if not found then raise exception 'Evento não encontrado.'; end if;
  end if;
  return v_id;
end $$;

create or replace function public.create_activity_from_agenda(p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if not public.has_permission('activities','create','own') then raise exception 'Permissão insuficiente para criar atividades.'; end if;
  return public.save_activity(null,p_payload||jsonb_build_object('due_date',case when nullif(p_payload->>'due_at','') is null then null else ((p_payload->>'due_at')::timestamptz at time zone 'America/Boa_Vista')::date end));
end $$;

-- 4. Atualização bidirecional pela fonte real
create or replace function public.update_agenda_item(p_source_type text,p_source_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_all_day boolean default false)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_project uuid;v_recipient uuid;v_title text;v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at<p_starts_at then raise exception 'Intervalo inválido.'; end if;
  if p_source_type='event' then
    if not public.can_access_calendar_event(p_source_id) or not (public.has_permission('agenda','move','assigned') or public.has_permission('agenda','edit','assigned')) then raise exception 'Sem permissão para mover o evento.'; end if;
    update public.calendar_events set starts_at=p_starts_at,ends_at=p_ends_at,all_day=coalesce(p_all_day,false),updated_by=auth.uid(),updated_at=now() where id=p_source_id and archived_at is null returning project_id,coalesce(responsible_user_id,assigned_user_id),title into v_project,v_recipient,v_title;
  elsif p_source_type='activity' then
    if not public.can_edit_activity(p_source_id) then raise exception 'Sem permissão para alterar a atividade.'; end if;
    update public.project_activities set starts_at=p_starts_at,due_at=p_ends_at,due_date=(p_ends_at at time zone 'America/Boa_Vista')::date,all_day=coalesce(p_all_day,false),updated_by=auth.uid(),updated_at=now() where id=p_source_id and deleted_at is null and archived_at is null returning project_id,responsible_user_id,title into v_project,v_recipient,v_title;
  elsif p_source_type='project_date' then
    select project_id,title into v_project,v_title from public.project_dates where id=p_source_id and archived_at is null;
    if v_project is null then raise exception 'Prazo não encontrado.'; end if;
    if not public.can_edit_project(v_project) or not public.has_permission('projects','change_deadline','own') then raise exception 'Sem permissão para alterar o prazo.'; end if;
    update public.project_dates set starts_at=p_starts_at,ends_at=p_ends_at,all_day=coalesce(p_all_day,false),updated_by=auth.uid(),updated_at=now() where id=p_source_id and archived_at is null;
    update public.projects set main_deadline=(select (starts_at at time zone 'America/Boa_Vista')::date from public.project_dates where project_id=v_project and is_main_deadline and archived_at is null limit 1),updated_at=now() where id=v_project;
    select responsible_user_id into v_recipient from public.projects where id=v_project;
  else
    raise exception 'Origem de Agenda inválida.';
  end if;
  if not found then raise exception 'Item não encontrado.'; end if;
  if v_recipient is not null and v_recipient is distinct from auth.uid() then
    perform public.enqueue_notification(v_recipient,case when p_source_type='project_date' then 'deadline_changed' else 'agenda_changed' end,case when p_source_type='activity' then 'activities' when p_source_type='project_date' then 'projects' else 'agenda' end,p_source_type,p_source_id::text,v_project,case when p_source_type='project_date' then 'Prazo reagendado' else 'Agenda atualizada' end,v_title,case when p_source_type='activity' then '/activities?activity='||p_source_id when p_source_type='project_date' then '/projects/'||v_project else '/agenda' end,auth.uid(),'agenda-move:'||p_source_type||':'||p_source_id||':'||p_starts_at||':'||v_recipient,jsonb_build_object('source','agenda','starts_at',p_starts_at,'ends_at',p_ends_at));
  end if;
  v_result:=jsonb_build_object('source_type',p_source_type,'source_id',p_source_id,'starts_at',p_starts_at,'ends_at',p_ends_at,'all_day',p_all_day);
  return v_result;
end $$;

create or replace function public.set_agenda_item_status(p_source_type text,p_source_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_project uuid;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if p_source_type='event' then
    if not public.can_access_calendar_event(p_source_id) or not public.has_permission('agenda','edit','assigned') then raise exception 'Sem permissão.'; end if;
    if p_status='cancelled' and not (public.has_permission('agenda','cancel','assigned') or public.has_permission('agenda','delete','assigned')) then raise exception 'Sem permissão para cancelar.'; end if;
    update public.calendar_events set status=p_status,completed_at=case when p_status='completed' then coalesce(completed_at,now()) else null end,cancelled_at=case when p_status='cancelled' then coalesce(cancelled_at,now()) else null end,cancelled_by=case when p_status='cancelled' then auth.uid() else null end,updated_by=auth.uid(),updated_at=now() where id=p_source_id and archived_at is null;
  elsif p_source_type='activity' then
    perform public.set_activity_status(p_source_id,p_status,false,null);
  elsif p_source_type='project_date' then
    select project_id into v_project from public.project_dates where id=p_source_id and archived_at is null;
    if v_project is null or not public.can_edit_project(v_project) or not public.has_permission('projects','change_deadline','own') then raise exception 'Sem permissão.'; end if;
    update public.project_dates set status=p_status,completed_at=case when p_status='completed' then coalesce(completed_at,now()) else null end,updated_by=auth.uid(),updated_at=now() where id=p_source_id;
  else raise exception 'Origem inválida.'; end if;
end $$;

create or replace function public.archive_calendar_event(p_event_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if not public.can_access_calendar_event(p_event_id) or not (public.has_permission('agenda','archive','assigned') or public.has_permission('agenda','delete','assigned')) then raise exception 'Sem permissão para arquivar.'; end if;
  update public.calendar_events set archived_at=now(),archived_by=auth.uid(),updated_by=auth.uid(),updated_at=now() where id=p_event_id and archived_at is null;
end $$;

create or replace function public.mark_agenda_item_viewed(p_source_type text,p_source_id uuid,p_project_id uuid default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_allowed boolean:=false;v_record_type text;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if p_source_type='event' then v_allowed:=public.can_access_calendar_event(p_source_id);v_record_type:='calendar_event';
  elsif p_source_type='activity' then v_allowed:=public.can_access_activity(p_source_id);v_record_type:='activity';
  elsif p_source_type='project_date' then v_allowed:=exists(select 1 from public.project_dates d where d.id=p_source_id and public.can_access_project(d.project_id));v_record_type:='project_date';
  end if;
  if not v_allowed then raise exception 'Sem acesso ao item.'; end if;
  insert into public.record_views(user_id,module,record_type,record_id,area,last_viewed_at) values(auth.uid(),'agenda',v_record_type,p_source_id::text,'agenda',now()) on conflict(user_id,module,record_type,record_id,area) do update set last_viewed_at=excluded.last_viewed_at;
  update public.notifications set read_at=coalesce(read_at,now()) where user_id=auth.uid() and read_at is null and archived_at is null and ((record_type=v_record_type and record_id=p_source_id::text) or (p_project_id is not null and project_id=p_project_id and module='agenda'));
end $$;

-- 5. Policies atualizadas para arquivamento lógico
create or replace function public.can_access_calendar_event(target_event_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
select exists(
 select 1 from public.calendar_events e
 where e.id=target_event_id and e.archived_at is null and (
  public.has_permission('agenda','view','all') or e.created_by=auth.uid() or e.assigned_user_id=auth.uid() or e.responsible_user_id=auth.uid()
  or (e.project_id is not null and public.can_access_project(e.project_id))
  or (e.activity_id is not null and public.can_access_activity(e.activity_id))
 )
) $$;

-- 6. Grants
revoke all on function public.save_calendar_event(uuid,jsonb) from public,anon;
revoke all on function public.create_activity_from_agenda(jsonb) from public,anon;
revoke all on function public.update_agenda_item(text,uuid,timestamptz,timestamptz,boolean) from public,anon;
revoke all on function public.set_agenda_item_status(text,uuid,text) from public,anon;
revoke all on function public.archive_calendar_event(uuid) from public,anon;
revoke all on function public.mark_agenda_item_viewed(text,uuid,uuid) from public,anon;
revoke all on function public.can_access_calendar_event(uuid) from public,anon;
grant execute on function public.save_calendar_event(uuid,jsonb),public.create_activity_from_agenda(jsonb),public.update_agenda_item(text,uuid,timestamptz,timestamptz,boolean),public.set_agenda_item_status(text,uuid,text),public.archive_calendar_event(uuid),public.mark_agenda_item_viewed(text,uuid,uuid),public.can_access_calendar_event(uuid) to authenticated;

-- 7. Versão
insert into public.system_versions(version,notes,environment)
values('3.0.7','Etapa 06: Agenda profissional com visualizações Dia, Semana e Mês, fontes unificadas sem duplicidade, arraste, duração e sincronização bidirecional com atividades e prazos.','production')
on conflict(version) do update set notes=excluded.notes,environment=excluded.environment,released_at=now();

commit;
