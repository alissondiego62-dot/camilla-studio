-- Camilla Studio — Etapa 04
-- Notificações, histórico central, arquivos versionados e comentários.
-- Migration aditiva, transacional e idempotente.

begin;
set local lock_timeout = '20s';
set local statement_timeout = '0';
create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.projects') is null then raise exception 'Tabela public.projects não encontrada.'; end if;
  if to_regclass('public.project_history') is null then raise exception 'Tabela public.project_history não encontrada.'; end if;
  if to_regprocedure('public.has_permission(text,text,text)') is null then raise exception 'Aplique primeiro o SQL da Etapa 02.'; end if;
  if to_regclass('public.project_dates') is null then raise exception 'Aplique primeiro o SQL da Etapa 03.'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Catálogo de permissões
-- ---------------------------------------------------------------------------
insert into public.permission_catalog(module,action,module_label,action_label,supports_scope,position) values
('notifications','view','Notificações','Visualizar',false,180),
('notifications','edit','Notificações','Gerenciar preferências próprias',false,181),
('history','view','Histórico','Visualizar',true,182),
('history','export','Histórico','Exportar',true,183),
('comments','view','Comentários','Visualizar',true,184),
('comments','create','Comentários','Criar',true,185),
('comments','edit','Comentários','Editar',true,186),
('comments','delete','Comentários','Excluir',true,187),
('comments','view_internal','Comentários','Visualizar observações internas',true,188),
('comments','create_internal','Comentários','Criar observações internas',true,189),
('files','download','Arquivos','Baixar',true,190),
('files','view_versions','Arquivos','Visualizar versões',true,191)
on conflict(module,action) do update set module_label=excluded.module_label,action_label=excluded.action_label,supports_scope=excluded.supports_scope,position=excluded.position;

insert into public.profile_permissions(profile_id,permission_profile_id,module,action,allowed,scope)
select p.id,p.id,x.module,x.action,
  case
    when x.module='notifications' then true
    when x.module='history' then true
    when x.module='comments' and x.action in('view','create') then p.code<>'viewer' or x.action='view'
    when x.module='comments' and x.action='edit' then p.code<>'viewer'
    when x.module='comments' and x.action='delete' then p.code in('administrator','owner','manager')
    when x.module='comments' and x.action in('view_internal','create_internal') then p.code in('administrator','owner','manager','architect')
    when x.module='files' and x.action in('download','view_versions') then true
    else false end,
  case
    when p.code in('administrator','owner','manager','finance') then 'all'
    when x.module='notifications' then 'own'
    else 'assigned' end
from public.permission_profiles p
cross join (values
  ('notifications','view'),('notifications','edit'),('history','view'),('history','export'),
  ('comments','view'),('comments','create'),('comments','edit'),('comments','delete'),('comments','view_internal'),('comments','create_internal'),
  ('files','download'),('files','view_versions')
) as x(module,action)
on conflict(profile_id,module,action) do update set allowed=excluded.allowed,scope=excluded.scope,permission_profile_id=excluded.permission_profile_id;

-- ---------------------------------------------------------------------------
-- 2. Central de notificações e preferências
-- ---------------------------------------------------------------------------
create table if not exists public.notification_type_catalog (
  type_code text primary key,
  module text not null,
  label text not null,
  default_enabled boolean not null default true,
  default_in_app boolean not null default true,
  default_push boolean not null default false,
  default_lead_minutes integer,
  priority text not null default 'normal' check(priority in('low','normal','high','urgent')),
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.notification_type_catalog(type_code,module,label,default_enabled,default_in_app,default_push,default_lead_minutes,priority,position) values
('new_comment','comments','Novo comentário',true,true,true,null,'normal',10),
('mention','comments','Menção em comentário',true,true,true,null,'high',20),
('important_note','comments','Nova observação importante',true,true,true,null,'high',30),
('file_added','files','Arquivo adicionado',true,true,false,null,'normal',40),
('file_replaced','files','Arquivo substituído',true,true,false,null,'normal',50),
('file_removed','files','Arquivo arquivado',true,true,false,null,'normal',60),
('agenda_created','agenda','Novo evento',true,true,true,null,'normal',70),
('agenda_changed','agenda','Alteração na agenda',true,true,true,null,'normal',80),
('deadline_changed','projects','Alteração de prazo',true,true,false,null,'normal',90),
('deadline_near','projects','Prazo próximo',true,true,true,4320,'high',100),
('deadline_overdue','projects','Prazo vencido',true,true,true,0,'urgent',110),
('status_changed','projects','Mudança de status',true,true,false,null,'normal',120),
('stage_changed','projects','Mudança de etapa',true,true,false,null,'normal',130),
('activity_assigned','activities','Atividade atribuída',true,true,true,null,'high',140),
('subactivity_assigned','activities','Subatividade atribuída',true,true,true,null,'high',150),
('activity_completed','activities','Atividade concluída',true,true,false,null,'normal',160),
('account_near_due','finance','Conta próxima do vencimento',true,true,true,4320,'high',170),
('account_overdue','finance','Conta vencida',true,true,true,0,'urgent',180),
('financial_approval','finance','Lançamento aguardando aprovação',true,true,true,null,'high',190),
('financial_changed','finance','Alteração financeira relevante',true,true,false,null,'normal',200),
('daily_summary','notifications','Resumo diário',true,false,true,null,'normal',210),
('event_reminder','agenda','Lembrete de compromisso',true,true,true,60,'high',220)
on conflict(type_code) do update set module=excluded.module,label=excluded.label,default_enabled=excluded.default_enabled,default_in_app=excluded.default_in_app,default_push=excluded.default_push,default_lead_minutes=excluded.default_lead_minutes,priority=excluded.priority,active=true,position=excluded.position,updated_at=now();

create table if not exists public.notification_profile_rules (
  permission_profile_id uuid not null references public.permission_profiles(id) on delete cascade,
  type_code text not null references public.notification_type_catalog(type_code) on delete cascade,
  enabled boolean not null default true,
  in_app boolean not null default true,
  push boolean not null default false,
  lead_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(permission_profile_id,type_code)
);

create table if not exists public.notification_user_rules (
  user_id uuid not null references auth.users(id) on delete cascade,
  type_code text not null references public.notification_type_catalog(type_code) on delete cascade,
  enabled boolean not null default true,
  in_app boolean not null default true,
  push boolean not null default false,
  lead_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,type_code)
);

alter table public.notification_preferences
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists daily_summary_enabled boolean not null default true,
  add column if not exists daily_summary_time time not null default '08:00',
  add column if not exists event_reminder_enabled boolean not null default true,
  add column if not exists reminder_minutes integer not null default 60,
  add column if not exists timezone text not null default 'America/Boa_Vista';
alter table public.notification_preferences drop constraint if exists notification_preferences_reminder_minutes_check;
alter table public.notification_preferences add constraint notification_preferences_reminder_minutes_check check(reminder_minutes between 0 and 10080);
do $$ begin
  if not exists(select 1 from pg_constraint where conname='notification_profile_rules_lead_check') then alter table public.notification_profile_rules add constraint notification_profile_rules_lead_check check(lead_minutes is null or lead_minutes between 0 and 10080); end if;
  if not exists(select 1 from pg_constraint where conname='notification_user_rules_lead_check') then alter table public.notification_user_rules add constraint notification_user_rules_lead_check check(lead_minutes is null or lead_minutes between 0 and 10080); end if;
end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  type_code text not null references public.notification_type_catalog(type_code),
  module text not null,
  record_type text,
  record_id text,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  body text,
  priority text not null default 'normal' check(priority in('low','normal','high','urgent')),
  link text,
  read_at timestamptz,
  archived_at timestamptz,
  dedupe_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists notifications_dedupe_unique on public.notifications(user_id,dedupe_key) where dedupe_key is not null;
create index if not exists notifications_user_unread_idx on public.notifications(user_id,created_at desc) where read_at is null and archived_at is null;
create index if not exists notifications_project_idx on public.notifications(project_id,created_at desc) where project_id is not null;

alter table public.notification_deliveries
  drop constraint if exists notification_deliveries_notification_type_check,
  alter column event_id drop not null,
  alter column sent_at drop not null,
  alter column sent_at drop default,
  add column if not exists notification_id uuid references public.notifications(id) on delete cascade,
  add column if not exists channel text not null default 'push',
  add column if not exists status text not null default 'pending',
  add column if not exists error_message text,
  add column if not exists attempted_at timestamptz;
create unique index if not exists notification_deliveries_central_unique on public.notification_deliveries(subscription_id,notification_id,channel) where notification_id is not null;
do $$ begin
  if not exists(select 1 from pg_constraint where conname='notification_deliveries_type_catalog_fkey') then
    alter table public.notification_deliveries add constraint notification_deliveries_type_catalog_fkey foreign key(notification_type) references public.notification_type_catalog(type_code) on update cascade;
  end if;
end $$;

create or replace function public.user_has_permission(p_user uuid,p_module text,p_action text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.profiles active_profile where active_profile.id=p_user and active_profile.active and active_profile.blocked_at is null and active_profile.archived_at is null)
    and coalesce(
      (select o.allowed from public.user_permission_overrides o where o.user_id=p_user and o.module=p_module and o.action=p_action and (o.expires_at is null or o.expires_at>now()) limit 1),
      (select pp.allowed from public.profiles pr join public.profile_permissions pp on pp.profile_id=pr.permission_profile_id where pr.id=p_user and pp.module=p_module and pp.action=p_action limit 1),
      false
    )
$$;

create or replace function public.user_permission_scope(p_user uuid,p_module text,p_action text)
returns text language sql stable security definer set search_path=public,pg_temp as $$
  select case when exists(select 1 from public.profiles p where p.id=p_user and p.active and p.blocked_at is null and p.archived_at is null) then
    coalesce(
      (select case when o.allowed then o.scope else 'none' end from public.user_permission_overrides o where o.user_id=p_user and o.module=p_module and o.action=p_action and (o.expires_at is null or o.expires_at>now()) limit 1),
      (select case when pp.allowed then pp.scope else 'none' end from public.profiles pr join public.profile_permissions pp on pp.profile_id=pr.permission_profile_id where pr.id=p_user and pp.module=p_module and pp.action=p_action limit 1),
      'none'
    ) else 'none' end
$$;

create or replace function public.user_can_access_project(p_user uuid,p_project uuid)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare scope_value text;
begin
  scope_value:=public.user_permission_scope(p_user,'projects','view');
  if scope_value='all' then return true; end if;
  if scope_value='own' and exists(select 1 from public.projects p where p.id=p_project and p.created_by=p_user) then return true; end if;
  if scope_value in('assigned','team') and exists(select 1 from public.projects p where p.id=p_project and p.responsible_user_id=p_user) then return true; end if;
  if scope_value in('assigned','team') and exists(select 1 from public.project_members pm where pm.project_id=p_project and pm.user_id=p_user) then return true; end if;
  if scope_value='team' and exists(
    select 1 from public.project_members pm
    join public.team_members target_tm on target_tm.user_id=pm.user_id
    join public.team_members own_tm on own_tm.team_id=target_tm.team_id and own_tm.user_id=p_user
    where pm.project_id=p_project
  ) then return true; end if;
  return false;
end $$;

create or replace function public.notification_rule_for_user(p_user uuid,p_type text)
returns table(enabled boolean,in_app boolean,push boolean,lead_minutes integer)
language sql stable security definer set search_path=public,pg_temp as $$
  select
    coalesce(ur.enabled,prr.enabled,c.default_enabled),
    coalesce(ur.in_app,prr.in_app,c.default_in_app),
    coalesce(ur.push,prr.push,c.default_push),
    coalesce(ur.lead_minutes,prr.lead_minutes,c.default_lead_minutes)
  from public.notification_type_catalog c
  left join public.profiles p on p.id=p_user
  left join public.notification_profile_rules prr on prr.permission_profile_id=p.permission_profile_id and prr.type_code=c.type_code
  left join public.notification_user_rules ur on ur.user_id=p_user and ur.type_code=c.type_code
  where c.type_code=p_type and c.active
$$;

create or replace function public.current_notification_rules()
returns table(type_code text,label text,module text,enabled boolean,in_app boolean,push boolean,lead_minutes integer)
language sql stable security definer set search_path=public,pg_temp as $$
  select c.type_code,c.label,c.module,r.enabled,r.in_app,r.push,r.lead_minutes
  from public.notification_type_catalog c
  cross join lateral public.notification_rule_for_user(auth.uid(),c.type_code) r
  order by c.position,c.label
$$;

create or replace function public.save_current_notification_rules(p_rules jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  for item in select value from jsonb_array_elements(coalesce(p_rules,'[]'::jsonb)) loop
    insert into public.notification_user_rules(user_id,type_code,enabled,in_app,push,lead_minutes,updated_at)
    values(auth.uid(),item->>'type_code',coalesce((item->>'enabled')::boolean,true),coalesce((item->>'in_app')::boolean,true),coalesce((item->>'push')::boolean,false),nullif(item->>'lead_minutes','')::integer,now())
    on conflict(user_id,type_code) do update set enabled=excluded.enabled,in_app=excluded.in_app,push=excluded.push,lead_minutes=excluded.lead_minutes,updated_at=now();
  end loop;
end $$;

create or replace function public.enqueue_notification(
  p_user uuid,p_type text,p_module text,p_record_type text,p_record_id text,p_project_id uuid,
  p_title text,p_body text,p_link text,p_actor uuid,p_dedupe_key text,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare rule record; result_id uuid; priority_value text;
begin
  if p_user is null or p_user=p_actor then return null; end if;
  if not exists(select 1 from public.profiles where id=p_user and active and blocked_at is null and archived_at is null) then return null; end if;
  select * into rule from public.notification_rule_for_user(p_user,p_type);
  if rule.enabled is distinct from true or rule.in_app is distinct from true then return null; end if;
  select priority into priority_value from public.notification_type_catalog where type_code=p_type;
  insert into public.notifications(user_id,actor_user_id,type_code,module,record_type,record_id,project_id,title,body,priority,link,dedupe_key,metadata)
  values(p_user,p_actor,p_type,p_module,p_record_type,p_record_id,p_project_id,p_title,p_body,coalesce(priority_value,'normal'),p_link,p_dedupe_key,coalesce(p_metadata,'{}'::jsonb))
  on conflict(user_id,dedupe_key) where dedupe_key is not null do nothing returning id into result_id;
  return result_id;
end $$;

create or replace function public.project_notification_recipients(p_project uuid,p_actor uuid default null)
returns table(user_id uuid) language sql stable security definer set search_path=public,pg_temp as $$
  select distinct x.user_id from (
    select responsible_user_id as user_id from public.projects where id=p_project
    union all select created_by from public.projects where id=p_project
    union all select pm.user_id from public.project_members pm where pm.project_id=p_project
  ) x join public.profiles p on p.id=x.user_id
  where x.user_id is not null and x.user_id is distinct from p_actor and p.active and p.blocked_at is null and p.archived_at is null
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.notifications set read_at=coalesce(read_at,now()) where id=p_notification_id and user_id=auth.uid();
end $$;

create or replace function public.mark_all_notifications_read(p_module text default null)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare affected integer;
begin
  update public.notifications set read_at=coalesce(read_at,now()) where user_id=auth.uid() and read_at is null and archived_at is null and (p_module is null or module=p_module);
  get diagnostics affected=row_count; return affected;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Visualizações e indicadores individuais
-- ---------------------------------------------------------------------------
create table if not exists public.record_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  record_type text not null,
  record_id text not null,
  area text not null,
  last_viewed_at timestamptz not null default now(),
  primary key(user_id,module,record_type,record_id,area)
);
create index if not exists record_views_record_idx on public.record_views(record_type,record_id,area,last_viewed_at);

create or replace function public.mark_record_view(p_module text,p_record_type text,p_record_id text,p_area text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare area_module text;
begin
  if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
  if p_record_type='project' and not public.can_access_project(p_record_id::uuid) then raise exception 'Sem acesso ao projeto.'; end if;
  insert into public.record_views(user_id,module,record_type,record_id,area,last_viewed_at)
  values(auth.uid(),p_module,p_record_type,p_record_id,p_area,now())
  on conflict(user_id,module,record_type,record_id,area) do update set last_viewed_at=excluded.last_viewed_at;
  area_module:=case p_area when 'comments' then 'comments' when 'files' then 'files' when 'agenda' then 'agenda' when 'history' then 'projects' else p_module end;
  if p_area='comments' and p_record_type='project' then
    insert into public.comment_reads(comment_id,user_id,read_at)
    select c.id,auth.uid(),now() from public.project_comments c where c.project_id=p_record_id::uuid and c.deleted_at is null
    on conflict(comment_id,user_id) do update set read_at=excluded.read_at;
  end if;
  update public.notifications set read_at=coalesce(read_at,now())
  where user_id=auth.uid() and read_at is null and archived_at is null and module=area_module
    and ((project_id is not null and project_id::text=p_record_id) or (record_type=p_record_type and record_id=p_record_id));
end $$;

-- ---------------------------------------------------------------------------
-- 4. Histórico central e imutável
-- ---------------------------------------------------------------------------
create table if not exists public.history_entries (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  record_type text not null,
  record_id text not null,
  project_id uuid references public.projects(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  field_name text,
  old_value jsonb,
  new_value jsonb,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  source_table text,
  source_id text,
  created_at timestamptz not null default now()
);
create unique index if not exists history_entries_source_unique on public.history_entries(source_table,source_id) where source_table is not null and source_id is not null;
create index if not exists history_entries_project_idx on public.history_entries(project_id,created_at desc) where project_id is not null;
create index if not exists history_entries_module_idx on public.history_entries(module,created_at desc);

insert into public.history_entries(module,record_type,record_id,project_id,actor_user_id,action,field_name,old_value,new_value,description,metadata,source_table,source_id,created_at)
select 'projects','project',h.project_id::text,h.project_id,h.author_id,h.action_type,h.field_name,h.old_value,h.new_value,h.description,coalesce(h.metadata,'{}'::jsonb),'project_history',h.id::text,h.created_at
from public.project_history h
on conflict(source_table,source_id) where source_table is not null and source_id is not null do nothing;

create or replace function public.sync_project_history_entry()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare recipient record; type_value text;
begin
  insert into public.history_entries(module,record_type,record_id,project_id,actor_user_id,action,field_name,old_value,new_value,description,metadata,source_table,source_id,created_at)
  values('projects','project',new.project_id::text,new.project_id,new.author_id,new.action_type,new.field_name,new.old_value,new.new_value,new.description,coalesce(new.metadata,'{}'::jsonb),'project_history',new.id::text,new.created_at)
  on conflict(source_table,source_id) where source_table is not null and source_id is not null do nothing;
  type_value:=case new.action_type when 'stage_changed' then 'stage_changed' when 'stage_migrated' then 'stage_changed' when 'status_changed' then 'status_changed' when 'main_deadline_changed' then 'deadline_changed' when 'project_date_created' then 'deadline_changed' when 'project_date_updated' then 'deadline_changed' else null end;
  if type_value is not null then
    for recipient in select * from public.project_notification_recipients(new.project_id,new.author_id) loop
      perform public.enqueue_notification(recipient.user_id,type_value,'projects','project',new.project_id::text,new.project_id,
        case type_value when 'stage_changed' then 'Etapa do projeto alterada' when 'status_changed' then 'Status do projeto alterado' else 'Prazo do projeto alterado' end,
        new.description,'/projects/'||new.project_id||case when type_value='deadline_changed' then '?section=dates' else '' end,new.author_id,
        type_value||':'||new.id||':'||recipient.user_id,jsonb_build_object('history_id',new.id));
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists project_history_sync_central on public.project_history;
create trigger project_history_sync_central after insert on public.project_history for each row execute function public.sync_project_history_entry();

create or replace function public.can_access_history_entry(p_id uuid)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare row_data public.history_entries%rowtype; kind_value text; environment_value text;
begin
  select * into row_data from public.history_entries where id=p_id;
  if not found or not public.current_user_access_valid() then return false; end if;
  if row_data.module='comments' then
    kind_value:=coalesce(row_data.new_value->>'comment_kind',row_data.old_value->>'comment_kind',row_data.metadata->>'kind','comment');
    return row_data.project_id is not null and public.can_access_project(row_data.project_id)
      and (kind_value<>'internal_note' or public.has_permission('comments','view_internal','own'));
  end if;
  if row_data.module='files' then return public.can_access_linked_file(row_data.record_id::uuid,false); end if;
  if row_data.module='finance' then
    environment_value:=coalesce(row_data.metadata->>'environment',row_data.new_value->>'environment',row_data.old_value->>'environment','professional');
    return public.can_view_finance(environment_value);
  end if;
  if row_data.module='clients' then return public.can_access_client(row_data.record_id::uuid); end if;
  if row_data.module='activities' then return public.can_access_activity(row_data.record_id::uuid); end if;
  if row_data.module='agenda' then return public.can_access_calendar_event(row_data.record_id::uuid); end if;
  if row_data.module in('users','permissions','settings','security') then return public.has_permission('security','view','own') or public.has_permission('settings','manage_settings','own'); end if;
  if row_data.project_id is not null then return public.can_access_project(row_data.project_id); end if;
  return false;
exception when invalid_text_representation then return false;
end $$;

-- Registra o autor da última alteração na agenda para contadores individuais.
alter table public.calendar_events add column if not exists updated_by uuid references auth.users(id) on delete set null;
create or replace function public.set_calendar_event_updated_by()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  new.updated_by:=coalesce(auth.uid(),new.updated_by);
  return new;
end $$;
drop trigger if exists calendar_events_set_updated_by on public.calendar_events;
create trigger calendar_events_set_updated_by before insert or update on public.calendar_events for each row execute function public.set_calendar_event_updated_by();

-- Auditoria genérica de módulos relacionados
create or replace function public.log_client_central_history()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.history_entries(module,record_type,record_id,actor_user_id,action,old_value,new_value,description,source_table,source_id)
  values('clients','client',coalesce(new.id,old.id)::text,auth.uid(),lower(tg_op),case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end,
    case tg_op when 'INSERT' then 'Cliente criado.' when 'UPDATE' then 'Dados do cliente alterados.' else 'Cliente removido.' end,'clients',coalesce(new.id,old.id)::text||':'||txid_current()::text);
  return coalesce(new,old);
end $$;
drop trigger if exists clients_history_central on public.clients;
create trigger clients_history_central after insert or update or delete on public.clients for each row execute function public.log_client_central_history();

create or replace function public.log_activity_central_history()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare recipient uuid; type_value text;
begin
  insert into public.history_entries(module,record_type,record_id,project_id,actor_user_id,action,old_value,new_value,description,source_table,source_id)
  values('activities',case when coalesce(new.parent_id,old.parent_id) is null then 'activity' else 'subactivity' end,coalesce(new.id,old.id)::text,coalesce(new.project_id,old.project_id),auth.uid(),lower(tg_op),case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end,
    case tg_op when 'INSERT' then 'Atividade criada.' when 'UPDATE' then 'Atividade alterada.' else 'Atividade removida.' end,'project_activities',coalesce(new.id,old.id)::text||':'||txid_current()::text);
  if tg_op='INSERT' and new.responsible_user_id is not null then type_value:=case when new.parent_id is null then 'activity_assigned' else 'subactivity_assigned' end; recipient:=new.responsible_user_id;
  elsif tg_op='UPDATE' and old.responsible_user_id is distinct from new.responsible_user_id and new.responsible_user_id is not null then type_value:=case when new.parent_id is null then 'activity_assigned' else 'subactivity_assigned' end; recipient:=new.responsible_user_id;
  elsif tg_op='UPDATE' and old.status is distinct from new.status and new.status='completed' then type_value:='activity_completed'; recipient:=coalesce((select responsible_user_id from public.projects where id=new.project_id),new.created_by); end if;
  if type_value is not null then perform public.enqueue_notification(recipient,type_value,'activities','activity',new.id::text,new.project_id,new.title,case when type_value='activity_completed' then 'A atividade foi concluída.' else 'Uma atividade foi atribuída a você.' end,'/projects/'||new.project_id||'?section=activities',auth.uid(),type_value||':'||new.id||':'||recipient,'{}'::jsonb); end if;
  return coalesce(new,old);
end $$;
drop trigger if exists project_activities_history_notify on public.project_activities;
create trigger project_activities_history_notify after insert or update or delete on public.project_activities for each row execute function public.log_activity_central_history();

create or replace function public.log_calendar_central_history()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare recipient record; type_value text;
begin
  insert into public.history_entries(module,record_type,record_id,project_id,actor_user_id,action,old_value,new_value,description,source_table,source_id)
  values('agenda','calendar_event',coalesce(new.id,old.id)::text,coalesce(new.project_id,old.project_id),auth.uid(),lower(tg_op),case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end,
    case tg_op when 'INSERT' then 'Evento criado.' when 'UPDATE' then 'Evento da agenda alterado.' else 'Evento removido.' end,'calendar_events',coalesce(new.id,old.id)::text||':'||txid_current()::text);
  if tg_op<>'DELETE' then
    type_value:=case when tg_op='INSERT' then 'agenda_created' else 'agenda_changed' end;
    for recipient in
      select distinct destination.user_id from (
        select new.responsible_user_id as user_id
        union all select new.assigned_user_id
        union all select r.user_id from public.project_notification_recipients(new.project_id,auth.uid()) r where new.project_id is not null
      ) destination
      join public.profiles p on p.id=destination.user_id
      where destination.user_id is not null and destination.user_id is distinct from auth.uid()
        and p.active and p.blocked_at is null and p.archived_at is null
    loop
      perform public.enqueue_notification(recipient.user_id,type_value,'agenda','calendar_event',new.id::text,new.project_id,new.title,
        case when tg_op='INSERT' then 'Um novo evento foi criado.' else 'Um evento foi alterado.' end,
        '/agenda',auth.uid(),type_value||':'||new.id||':'||new.updated_at||':'||recipient.user_id,'{}'::jsonb);
    end loop;
  end if;
  return coalesce(new,old);
end $$;
drop trigger if exists calendar_events_history_notify on public.calendar_events;
create trigger calendar_events_history_notify after insert or update or delete on public.calendar_events for each row execute function public.log_calendar_central_history();

create or replace function public.log_financial_central_history()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare recipient record; type_value text;
begin
  insert into public.history_entries(module,record_type,record_id,project_id,actor_user_id,action,old_value,new_value,description,metadata,source_table,source_id)
  values('finance','financial_entry',coalesce(new.id,old.id)::text,coalesce(new.project_id,old.project_id),auth.uid(),lower(tg_op),case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end,
    case tg_op when 'INSERT' then 'Lançamento financeiro criado.' when 'UPDATE' then 'Lançamento financeiro alterado.' else 'Lançamento financeiro removido.' end,
    jsonb_build_object('environment',coalesce(new.environment,old.environment)),'financial_entries',coalesce(new.id,old.id)::text||':'||txid_current()::text);
  if tg_op<>'DELETE' then
    type_value:=case when new.status='awaiting_approval' then 'financial_approval' else 'financial_changed' end;
    for recipient in select p.id from public.profiles p where p.active and p.blocked_at is null and p.archived_at is null and public.user_has_permission(p.id,case when new.environment='personal' then 'finance_personal' else 'finance_professional' end,'view') loop
      perform public.enqueue_notification(recipient.id,type_value,'finance','financial_entry',new.id::text,new.project_id,case when type_value='financial_approval' then 'Lançamento aguardando aprovação' else 'Alteração financeira' end,new.description,'/finance',auth.uid(),type_value||':'||new.id||':'||new.updated_at||':'||recipient.id,jsonb_build_object('environment',new.environment));
    end loop;
  end if;
  return coalesce(new,old);
end $$;
drop trigger if exists financial_entries_history_notify on public.financial_entries;
create trigger financial_entries_history_notify after insert or update or delete on public.financial_entries for each row execute function public.log_financial_central_history();

create or replace function public.log_admin_central_history()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  module_value text;
  record_value text;
  description_value text;
  row_value jsonb;
begin
  -- NEW/OLD possuem tipos diferentes em cada tabela. Converter a linha para
  -- JSONB evita acessar campos inexistentes em tabelas com chaves diferentes,
  -- cuja chave primária é key.
  row_value:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  module_value:=case tg_table_name when 'profiles' then 'users' when 'profile_permissions' then 'permissions' when 'user_permission_overrides' then 'permissions' else 'settings' end;
  record_value:=case when tg_table_name='system_settings' then row_value->>'key' else row_value->>'id' end;
  if record_value is null then
    raise exception 'Não foi possível identificar o registro de auditoria da tabela %.',tg_table_name;
  end if;
  description_value:=case tg_table_name when 'profiles' then 'Cadastro de usuário alterado.' when 'profile_permissions' then 'Permissão de perfil alterada.' when 'user_permission_overrides' then 'Permissão individual alterada.' else 'Configuração do sistema alterada.' end;
  insert into public.history_entries(module,record_type,record_id,actor_user_id,action,old_value,new_value,description,source_table,source_id)
  values(module_value,tg_table_name,record_value,auth.uid(),lower(tg_op),case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end,description_value,tg_table_name,record_value||':'||txid_current()::text)
  on conflict(source_table,source_id) where source_table is not null and source_id is not null do nothing;
  return coalesce(new,old);
end $$;
drop trigger if exists profiles_history_central on public.profiles;
create trigger profiles_history_central after insert or update or delete on public.profiles for each row execute function public.log_admin_central_history();
drop trigger if exists profile_permissions_history_central on public.profile_permissions;
create trigger profile_permissions_history_central after insert or update or delete on public.profile_permissions for each row execute function public.log_admin_central_history();
drop trigger if exists user_permission_overrides_history_central on public.user_permission_overrides;
create trigger user_permission_overrides_history_central after insert or update or delete on public.user_permission_overrides for each row execute function public.log_admin_central_history();
drop trigger if exists system_settings_history_central on public.system_settings;
create trigger system_settings_history_central after insert or update or delete on public.system_settings for each row execute function public.log_admin_central_history();

-- ---------------------------------------------------------------------------
-- 5. Comentários, respostas, menções e leitura
-- ---------------------------------------------------------------------------
alter table public.project_comments
  add column if not exists parent_comment_id uuid references public.project_comments(id) on delete set null,
  add column if not exists comment_kind text not null default 'comment',
  add column if not exists important boolean not null default false,
  add column if not exists edited_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

do $$ begin
  if not exists(select 1 from pg_constraint where conname='project_comments_kind_check') then
    alter table public.project_comments add constraint project_comments_kind_check check(comment_kind in('comment','internal_note'));
  end if;
end $$;
create index if not exists project_comments_project_created_idx on public.project_comments(project_id,created_at);
create index if not exists project_comments_parent_idx on public.project_comments(parent_comment_id) where parent_comment_id is not null;

create table if not exists public.comment_mentions (
  comment_id uuid not null references public.project_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(comment_id,user_id)
);
create table if not exists public.comment_reads (
  comment_id uuid not null references public.project_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key(comment_id,user_id)
);

create or replace function public.save_project_comment(p_project_id uuid,p_comment text,p_parent_id uuid default null,p_kind text default 'comment',p_important boolean default false,p_mentions uuid[] default '{}'::uuid[],p_comment_id uuid default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare result_id uuid; existing public.project_comments%rowtype; mention_user uuid; recipient record; edit_window integer;
begin
  if auth.uid() is null or not public.can_access_project(p_project_id) then raise exception 'Sem acesso ao projeto.'; end if;
  if length(trim(coalesce(p_comment,'')))=0 or length(p_comment)>5000 then raise exception 'Comentário inválido.'; end if;
  if p_kind not in('comment','internal_note') then raise exception 'Tipo de comentário inválido.'; end if;
  if p_kind='internal_note' and not public.has_permission('comments','create_internal','own') then raise exception 'Sem permissão para observação interna.'; end if;
  if p_parent_id is not null and not exists(select 1 from public.project_comments where id=p_parent_id and project_id=p_project_id and deleted_at is null) then raise exception 'Comentário pai inválido.'; end if;
  if p_comment_id is null then
    if not (public.has_permission('comments','create','own') or public.can_edit_project(p_project_id)) then raise exception 'Sem permissão para comentar.'; end if;
    insert into public.project_comments(project_id,parent_comment_id,author_id,comment,comment_kind,important)
    values(p_project_id,p_parent_id,auth.uid(),trim(p_comment),p_kind,p_important) returning id into result_id;
  else
    select * into existing from public.project_comments where id=p_comment_id and project_id=p_project_id and deleted_at is null for update;
    if not found then raise exception 'Comentário não encontrado.'; end if;
    select coalesce((value#>>'{}')::integer,15) into edit_window from public.system_settings where key='comment_edit_window_minutes';
    edit_window:=coalesce(edit_window,15);
    if existing.author_id=auth.uid() then
      if now()>existing.created_at+make_interval(mins=>edit_window) and not public.has_permission('comments','edit','all') then raise exception 'O prazo de edição expirou.'; end if;
    elsif not public.has_permission('comments','edit','all') then
      raise exception 'Sem permissão para editar o comentário.';
    end if;
    update public.project_comments set comment=trim(p_comment),important=p_important,edited_at=now(),updated_at=now() where id=p_comment_id returning id into result_id;
    delete from public.comment_mentions where comment_id=result_id;
  end if;
  foreach mention_user in array coalesce(p_mentions,'{}'::uuid[]) loop
    if mention_user<>auth.uid()
      and public.user_can_access_project(mention_user,p_project_id)
      and (p_kind<>'internal_note' or public.user_has_permission(mention_user,'comments','view_internal')) then
      insert into public.comment_mentions(comment_id,user_id) values(result_id,mention_user) on conflict do nothing;
    end if;
  end loop;
  if p_comment_id is null then
    for recipient in select * from public.project_notification_recipients(p_project_id,auth.uid()) loop
      if not (recipient.user_id=any(coalesce(p_mentions,'{}'::uuid[])))
        and (p_kind='comment' or public.user_has_permission(recipient.user_id,'comments','view_internal')) then
        perform public.enqueue_notification(recipient.user_id,case when p_kind='internal_note' and p_important then 'important_note' else 'new_comment' end,
          'comments','comment',result_id::text,p_project_id,
          case when p_kind='internal_note' then 'Nova observação interna' else 'Novo comentário' end,
          left(trim(p_comment),240),'/projects/'||p_project_id||'?section=comments',auth.uid(),
          'comment:'||result_id||':'||recipient.user_id,jsonb_build_object('important',p_important,'kind',p_kind));
      end if;
    end loop;
  end if;
  return result_id;
end $$;

create or replace function public.delete_project_comment(p_comment_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare row_data public.project_comments%rowtype;
begin
  select * into row_data from public.project_comments where id=p_comment_id and deleted_at is null for update;
  if not found then return; end if;
  if not public.can_access_project(row_data.project_id) then raise exception 'Sem acesso ao projeto.'; end if;
  if row_data.author_id<>auth.uid() and not public.has_permission('comments','delete','all') then raise exception 'Sem permissão para excluir.'; end if;
  update public.project_comments set deleted_at=now(),deleted_by=auth.uid(),updated_at=now() where id=p_comment_id;
end $$;

create or replace function public.log_comment_history_notify()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare action_value text; description_value text;
begin
  action_value:=case when tg_op='INSERT' then 'comment_created' when new.deleted_at is not null and old.deleted_at is null then 'comment_deleted' else 'comment_updated' end;
  description_value:=case action_value when 'comment_created' then case when new.comment_kind='internal_note' then 'Observação interna criada.' else 'Comentário criado.' end when 'comment_deleted' then 'Comentário removido.' else 'Comentário editado.' end;
  insert into public.history_entries(module,record_type,record_id,project_id,actor_user_id,action,old_value,new_value,description,source_table,source_id)
  values('comments','comment',new.id::text,new.project_id,auth.uid(),action_value,case when tg_op='UPDATE' then to_jsonb(old) end,to_jsonb(new),description_value,'project_comments',new.id::text||':'||new.updated_at::text)
  on conflict(source_table,source_id) where source_table is not null and source_id is not null do nothing;
  return new;
end $$;
drop trigger if exists project_comments_history_notify on public.project_comments;
create trigger project_comments_history_notify after insert or update on public.project_comments for each row execute function public.log_comment_history_notify();

create or replace function public.notify_comment_mention()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare cm public.project_comments%rowtype;
begin
  select * into cm from public.project_comments where id=new.comment_id;
  perform public.enqueue_notification(new.user_id,'mention','comments','comment',cm.id::text,cm.project_id,'Você foi mencionado',left(cm.comment,240),'/projects/'||cm.project_id||'?section=comments',cm.author_id,'mention:'||cm.id||':'||new.user_id,'{}'::jsonb);
  return new;
end $$;
drop trigger if exists comment_mentions_notify on public.comment_mentions;
create trigger comment_mentions_notify after insert on public.comment_mentions for each row execute function public.notify_comment_mention();

-- ---------------------------------------------------------------------------
-- 6. Arquivos, vínculos, Storage e versões
-- ---------------------------------------------------------------------------
alter table public.project_files
  alter column project_id drop not null,
  alter column drive_url drop not null,
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists activity_id uuid references public.project_activities(id) on delete set null,
  add column if not exists financial_entry_id uuid references public.financial_entries(id) on delete set null,
  add column if not exists origin text not null default 'google_drive',
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists version integer not null default 1,
  add column if not exists version_group_id uuid,
  add column if not exists replaces_file_id uuid references public.project_files(id) on delete set null,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null,
  add column if not exists download_allowed boolean not null default true;

do $$ begin
  if not exists(select 1 from pg_constraint where conname='project_files_origin_check') then alter table public.project_files add constraint project_files_origin_check check(origin in('supabase_storage','google_drive','external_link')); end if;
  if not exists(select 1 from pg_constraint where conname='project_files_relation_check') then alter table public.project_files add constraint project_files_relation_check check(num_nonnulls(project_id,client_id,activity_id,financial_entry_id)>=1); end if;
  if not exists(select 1 from pg_constraint where conname='project_files_storage_check') then alter table public.project_files add constraint project_files_storage_check check((origin='supabase_storage' and storage_bucket is not null and storage_path is not null) or (origin<>'supabase_storage' and drive_url is not null)); end if;
end $$;
create index if not exists project_files_client_idx on public.project_files(client_id,created_at desc) where client_id is not null;
create index if not exists project_files_activity_idx on public.project_files(activity_id,created_at desc) where activity_id is not null;
create index if not exists project_files_financial_idx on public.project_files(financial_entry_id,created_at desc) where financial_entry_id is not null;
update public.project_files set version_group_id=coalesce(version_group_id,id) where version_group_id is null;
alter table public.project_files alter column version_group_id set not null;
do $$ begin
  if not exists(select 1 from pg_constraint where conname='project_files_version_group_fkey') then
    alter table public.project_files add constraint project_files_version_group_fkey foreign key(version_group_id) references public.project_files(id) on delete restrict deferrable initially deferred;
  end if;
end $$;
create index if not exists project_files_replaces_idx on public.project_files(replaces_file_id,version desc) where replaces_file_id is not null;
create unique index if not exists project_files_group_version_unique on public.project_files(version_group_id,version);

create or replace function public.can_access_linked_file(p_id uuid,p_write boolean default false)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare f public.project_files%rowtype; env text;
begin
  select * into f from public.project_files where id=p_id;
  if not found or not public.current_user_access_valid() then return false; end if;
  if f.project_id is not null then return case when p_write then public.can_edit_project(f.project_id) else public.can_access_project(f.project_id) end; end if;
  if f.client_id is not null then return public.has_permission('clients',case when p_write then 'edit' else 'view' end,'own'); end if;
  if f.activity_id is not null then return public.can_access_activity(f.activity_id) and (not p_write or public.has_permission('activities','edit','own')); end if;
  if f.financial_entry_id is not null then select environment into env from public.financial_entries where id=f.financial_entry_id; return public.can_view_finance(env) and (not p_write or public.has_permission(case when env='personal' then 'finance_personal' else 'finance_professional' end,'edit','own')); end if;
  return false;
end $$;

create or replace function public.safe_uuid(p_value text)
returns uuid language plpgsql immutable security invoker set search_path=public,pg_temp as $$ begin return p_value::uuid; exception when invalid_text_representation then return null; end $$;
create or replace function public.can_access_linked_entity(p_entity text,p_id uuid,p_write boolean default false)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare env text;
begin
  if p_id is null then return false; end if;
  if p_entity='projects' then return case when p_write then public.can_edit_project(p_id) else public.can_access_project(p_id) end; end if;
  if p_entity='clients' then return public.has_permission('clients',case when p_write then 'edit' else 'view' end,'own'); end if;
  if p_entity='activities' then return public.can_access_activity(p_id) and (not p_write or public.has_permission('activities','edit','own')); end if;
  if p_entity='financial' then select environment into env from public.financial_entries where id=p_id; return public.can_view_finance(env) and (not p_write or public.has_permission(case when env='personal' then 'finance_personal' else 'finance_professional' end,'edit','own')); end if;
  return false;
end $$;

create or replace function public.log_file_history_notify()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  project_value uuid; activity_project uuid; recipient record;
  type_value text; action_value text; description_value text; actor_value uuid; link_value text;
begin
  project_value:=coalesce(new.project_id,old.project_id);
  actor_value:=coalesce(auth.uid(),new.updated_by,new.created_by,old.updated_by,old.created_by);
  if tg_op='INSERT' then
    type_value:=case when new.replaces_file_id is null then 'file_added' else 'file_replaced' end;
    action_value:=type_value;
    description_value:=case when new.replaces_file_id is null then 'Arquivo adicionado: ' else 'Arquivo substituído: ' end||new.name;
  elsif new.archived_at is not null and old.archived_at is null then
    type_value:='file_removed'; action_value:='file_removed'; description_value:='Arquivo arquivado: '||new.name;
  else
    type_value:=null; action_value:='file_updated'; description_value:='Dados do arquivo atualizados: '||new.name;
  end if;
  insert into public.history_entries(module,record_type,record_id,project_id,actor_user_id,action,old_value,new_value,description,source_table,source_id)
  values('files','file',new.id::text,project_value,actor_value,action_value,case when tg_op='UPDATE' then to_jsonb(old) end,to_jsonb(new),description_value,'project_files',new.id::text||':'||new.updated_at::text)
  on conflict(source_table,source_id) where source_table is not null and source_id is not null do nothing;
  if type_value is null then return new; end if;

  if project_value is not null then
    link_value:='/projects/'||project_value||'?section=files';
    for recipient in select * from public.project_notification_recipients(project_value,actor_value) loop
      if public.user_has_permission(recipient.user_id,'files','view') then
        perform public.enqueue_notification(recipient.user_id,type_value,'files','file',new.id::text,project_value,
          case type_value when 'file_added' then 'Arquivo adicionado' when 'file_replaced' then 'Arquivo substituído' else 'Arquivo arquivado' end,
          new.name,link_value,actor_value,type_value||':'||new.id||':'||new.version||':'||recipient.user_id,
          jsonb_build_object('file_id',new.id,'version',new.version));
      end if;
    end loop;
  elsif new.activity_id is not null then
    select project_id into activity_project from public.project_activities where id=new.activity_id;
    link_value:=case when activity_project is null then '/activities' else '/projects/'||activity_project||'?section=activities' end;
    for recipient in
      select distinct destination.user_id from (
        select responsible_user_id as user_id from public.project_activities where id=new.activity_id
        union all select r.user_id from public.project_notification_recipients(activity_project,actor_value) r where activity_project is not null
      ) destination where destination.user_id is not null
    loop
      if recipient.user_id is distinct from actor_value and public.user_has_permission(recipient.user_id,'files','view') then
        perform public.enqueue_notification(recipient.user_id,type_value,'files','file',new.id::text,activity_project,'Arquivo relacionado à atividade',new.name,link_value,actor_value,type_value||':'||new.id||':'||new.version||':'||recipient.user_id,jsonb_build_object('activity_id',new.activity_id));
      end if;
    end loop;
  elsif new.financial_entry_id is not null then
    for recipient in
      select p.id as user_id from public.profiles p join public.financial_entries f on f.id=new.financial_entry_id
      where p.active and p.blocked_at is null and p.archived_at is null
        and public.user_has_permission(p.id,case when f.environment='personal' then 'finance_personal' else 'finance_professional' end,'view')
        and public.user_has_permission(p.id,'files','view')
    loop
      perform public.enqueue_notification(recipient.user_id,type_value,'files','file',new.id::text,null,'Arquivo financeiro alterado',new.name,'/finance',actor_value,type_value||':'||new.id||':'||new.version||':'||recipient.user_id,jsonb_build_object('financial_entry_id',new.financial_entry_id));
    end loop;
  elsif new.client_id is not null then
    for recipient in select p.id as user_id from public.profiles p where p.active and p.blocked_at is null and p.archived_at is null and public.user_has_permission(p.id,'clients','view') and public.user_has_permission(p.id,'files','view') loop
      perform public.enqueue_notification(recipient.user_id,type_value,'files','file',new.id::text,null,'Arquivo de cliente alterado',new.name,'/clients',actor_value,type_value||':'||new.id||':'||new.version||':'||recipient.user_id,jsonb_build_object('client_id',new.client_id));
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists project_files_history on public.project_files;
drop trigger if exists project_files_history_notify on public.project_files;
create trigger project_files_history_notify after insert or update on public.project_files for each row execute function public.log_file_history_notify();

insert into storage.buckets(id,name,public,file_size_limit) values('linked-files','linked-files',false,52428800)
on conflict(id) do update set public=false,file_size_limit=52428800;

-- ---------------------------------------------------------------------------
-- 7. Alertas agendados de prazos
-- ---------------------------------------------------------------------------
create or replace function public.generate_due_notifications(p_now timestamptz default now())
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare
  row_data record; recipient record; rule_data record;
  created_count integer:=0; result_id uuid;
  day_key text:=to_char(p_now at time zone 'America/Boa_Vista','YYYY-MM-DD');
  type_value text; due_at timestamptz;
begin
  for row_data in
    select d.id,d.project_id,d.title,d.starts_at,d.created_by
    from public.project_dates d
    where d.archived_at is null and d.completed_at is null and d.status not in('completed','cancelled')
      and d.starts_at <= p_now+interval '7 days'
  loop
    for recipient in select * from public.project_notification_recipients(row_data.project_id,null) loop
      type_value:=case when row_data.starts_at<p_now then 'deadline_overdue' else 'deadline_near' end;
      select * into rule_data from public.notification_rule_for_user(recipient.user_id,type_value);
      if rule_data.enabled is distinct from true or rule_data.in_app is distinct from true then continue; end if;
      if type_value='deadline_near' and row_data.starts_at>p_now+make_interval(mins=>coalesce(rule_data.lead_minutes,4320)) then continue; end if;
      result_id:=public.enqueue_notification(
        recipient.user_id,type_value,'projects','project_date',row_data.id::text,row_data.project_id,
        case when type_value='deadline_overdue' then 'Prazo vencido' else 'Prazo próximo' end,
        row_data.title,'/projects/'||row_data.project_id||'?section=dates',null,
        type_value||':'||row_data.id||':'||day_key||':'||recipient.user_id,
        jsonb_build_object('starts_at',row_data.starts_at)
      );
      if result_id is not null then created_count:=created_count+1; end if;
    end loop;
  end loop;

  for row_data in
    select f.id,f.environment,f.description,f.due_date,f.project_id
    from public.financial_entries f
    where f.archived_at is null and f.settled_at is null and f.due_date is not null
      and f.due_date<=((p_now at time zone 'America/Boa_Vista')::date+7)
  loop
    due_at:=((row_data.due_date::text||' 23:59:59')::timestamp at time zone 'America/Boa_Vista');
    type_value:=case when row_data.due_date<(p_now at time zone 'America/Boa_Vista')::date then 'account_overdue' else 'account_near_due' end;
    for recipient in
      select p.id from public.profiles p
      where p.active and p.blocked_at is null and p.archived_at is null
        and public.user_has_permission(p.id,case when row_data.environment='personal' then 'finance_personal' else 'finance_professional' end,'view')
    loop
      select * into rule_data from public.notification_rule_for_user(recipient.id,type_value);
      if rule_data.enabled is distinct from true or rule_data.in_app is distinct from true then continue; end if;
      if type_value='account_near_due' and due_at>p_now+make_interval(mins=>coalesce(rule_data.lead_minutes,4320)) then continue; end if;
      result_id:=public.enqueue_notification(
        recipient.id,type_value,'finance','financial_entry',row_data.id::text,row_data.project_id,
        case when type_value='account_overdue' then 'Conta vencida' else 'Conta próxima do vencimento' end,
        row_data.description,'/finance',null,
        'finance_due:'||row_data.id||':'||day_key||':'||recipient.id,
        jsonb_build_object('environment',row_data.environment,'due_date',row_data.due_date)
      );
      if result_id is not null then created_count:=created_count+1; end if;
    end loop;
  end loop;
  return created_count;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Kanban com contadores individuais de não visualizados
-- ---------------------------------------------------------------------------
create or replace view public.project_kanban_view with (security_invoker=true) as
select
  p.id,p.code,p.name,p.project_type,p.stage,p.status,p.priority,p.main_deadline,p.responsible_user_id,
  coalesce(r.name,p.responsible_name) as responsible_name,p.cover_url,p.client_id,c.name as client_name,p.updated_at,
  coalesce(s.position,999) as stage_position,
  t.bucket_id as thumbnail_bucket,t.object_path as thumbnail_path,
  coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'purpose_code',d.purpose_code,'title',d.title,'starts_at',d.starts_at,'status',d.status,'completed_at',d.completed_at,'updated_at',d.updated_at,'is_main_deadline',d.is_main_deadline) order by d.is_main_deadline desc,d.starts_at) from public.project_dates d where d.project_id=p.id and d.archived_at is null),'[]'::jsonb) as planned_dates,
  (select count(*) from public.project_checklist_items ci where ci.project_id=p.id and ci.stage=p.stage) as checklist_total,
  (select count(*) from public.project_checklist_items ci where ci.project_id=p.id and ci.stage=p.stage and (ci.completed_at is not null or ci.waived_at is not null)) as checklist_completed,
  (select count(*) from public.project_files f where f.project_id=p.id and f.archived_at is null) as files_count,
  (select count(*) from public.project_comments cm where cm.project_id=p.id and cm.deleted_at is null and (cm.comment_kind='comment' or public.has_permission('comments','view_internal','own'))) as comments_count,
  (select count(*) from public.calendar_events e where e.project_id=p.id) as agenda_count,
  (select count(*) from public.project_history h where h.project_id=p.id) as history_count,
  (select max(greatest(f.created_at,f.updated_at)) from public.project_files f where f.project_id=p.id and f.archived_at is null) as latest_file_at,
  (select max(cm.created_at) from public.project_comments cm where cm.project_id=p.id and cm.deleted_at is null) as latest_comment_at,
  (select max(e.updated_at) from public.calendar_events e where e.project_id=p.id) as latest_agenda_at,
  (select max(h.created_at) from public.project_history h where h.project_id=p.id) as latest_history_at,
  (select count(*) from public.project_files f where f.project_id=p.id and f.archived_at is null and coalesce(f.updated_by,f.created_by) is distinct from auth.uid() and greatest(f.created_at,f.updated_at)>coalesce((select rv.last_viewed_at from public.record_views rv where rv.user_id=auth.uid() and rv.module='projects' and rv.record_type='project' and rv.record_id=p.id::text and rv.area='files'),'-infinity'::timestamptz)) as unread_files_count,
  (select count(*) from public.project_comments cm where cm.project_id=p.id and cm.deleted_at is null and cm.author_id is distinct from auth.uid() and (cm.comment_kind='comment' or public.has_permission('comments','view_internal','own')) and cm.created_at>coalesce((select rv.last_viewed_at from public.record_views rv where rv.user_id=auth.uid() and rv.module='projects' and rv.record_type='project' and rv.record_id=p.id::text and rv.area='comments'),'-infinity'::timestamptz)) as unread_comments_count,
  (select count(*) from public.calendar_events e where e.project_id=p.id and coalesce(e.updated_by,e.created_by) is distinct from auth.uid() and e.updated_at>coalesce((select rv.last_viewed_at from public.record_views rv where rv.user_id=auth.uid() and rv.module='projects' and rv.record_type='project' and rv.record_id=p.id::text and rv.area='agenda'),'-infinity'::timestamptz)) as unread_agenda_count,
  (select count(*) from public.project_history h where h.project_id=p.id and h.author_id is distinct from auth.uid() and h.created_at>coalesce((select rv.last_viewed_at from public.record_views rv where rv.user_id=auth.uid() and rv.module='projects' and rv.record_type='project' and rv.record_id=p.id::text and rv.area='history'),'-infinity'::timestamptz)) as unread_history_count
from public.projects p
left join public.clients c on c.id=p.client_id
left join public.profiles r on r.id=p.responsible_user_id
left join public.project_stages s on s.code=p.stage
left join lateral (select pt.bucket_id,pt.object_path from public.project_thumbnails pt where pt.project_id=p.id and pt.active and pt.removed_at is null order by pt.version desc limit 1) t on true
where p.archived_at is null and p.stage<>'construction';

-- ---------------------------------------------------------------------------
-- 9. RLS, grants e Realtime
-- ---------------------------------------------------------------------------
do $$ declare table_name text; policy_name text; begin
  foreach table_name in array array['notifications','notification_type_catalog','notification_profile_rules','notification_user_rules','record_views','history_entries','comment_mentions','comment_reads'] loop
    execute format('alter table public.%I enable row level security',table_name);
    for policy_name in select p.policyname from pg_policies p where p.schemaname='public' and p.tablename=table_name loop execute format('drop policy if exists %I on public.%I',policy_name,table_name); end loop;
  end loop;
end $$;

create policy notifications_select_own on public.notifications for select to authenticated using(user_id=auth.uid());
create policy notification_catalog_read on public.notification_type_catalog for select to authenticated using(active);
create policy notification_profile_rules_read on public.notification_profile_rules for select to authenticated using(public.has_permission('settings','manage_settings','own'));
create policy notification_profile_rules_manage on public.notification_profile_rules for all to authenticated using(public.has_permission('settings','manage_settings','own')) with check(public.has_permission('settings','manage_settings','own'));
create policy notification_user_rules_own on public.notification_user_rules for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy record_views_own on public.record_views for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy history_entries_select_scope on public.history_entries for select to authenticated using(public.can_access_history_entry(id));
create policy comment_mentions_select_scope on public.comment_mentions for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.project_comments c where c.id=comment_id and public.can_access_project(c.project_id)));
create policy comment_reads_own on public.comment_reads for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

-- Recria as políticas de comentários para ocultar notas internas e impedir edição direta.
do $$ declare r record; begin for r in select policyname from pg_policies where schemaname='public' and tablename='project_comments' loop execute format('drop policy if exists %I on public.project_comments',r.policyname); end loop; end $$;
create policy project_comments_select_scope on public.project_comments for select to authenticated using(public.can_access_project(project_id) and (comment_kind='comment' or public.has_permission('comments','view_internal','own')));

-- Recria as políticas de arquivos para todos os vínculos.
do $$ declare r record; begin for r in select policyname from pg_policies where schemaname='public' and tablename='project_files' loop execute format('drop policy if exists %I on public.project_files',r.policyname); end loop; end $$;
create policy linked_files_select_scope on public.project_files for select to authenticated using(public.can_access_linked_file(id,false) and public.has_permission('files','view','own'));
create policy linked_files_insert_scope on public.project_files for insert to authenticated with check(public.has_permission('files','add_file','own') and (
  (project_id is not null and public.can_edit_project(project_id)) or
  (client_id is not null and public.has_permission('clients','edit','own')) or
  (activity_id is not null and public.can_access_activity(activity_id)) or
  (financial_entry_id is not null and exists(select 1 from public.financial_entries f where f.id=financial_entry_id and public.can_view_finance(f.environment)))
));
create policy linked_files_update_scope on public.project_files for update to authenticated using(public.can_access_linked_file(id,true) and (public.has_permission('files','add_file','own') or public.has_permission('files','remove_file','own'))) with check(public.can_access_linked_file(id,true));
create policy linked_files_delete_scope on public.project_files for delete to authenticated using(public.can_access_linked_file(id,true) and public.has_permission('files','remove_file','own'));

-- Storage: caminho entity/uuid/file-uuid/nome
do $$ declare r record; begin for r in select policyname from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'camilla_linked_files_%' loop execute format('drop policy if exists %I on storage.objects',r.policyname); end loop; end $$;
create policy camilla_linked_files_select on storage.objects for select to authenticated using(bucket_id='linked-files' and public.can_access_linked_entity((storage.foldername(name))[1],public.safe_uuid((storage.foldername(name))[2]),false));
create policy camilla_linked_files_insert on storage.objects for insert to authenticated with check(bucket_id='linked-files' and public.has_permission('files','add_file','own') and public.can_access_linked_entity((storage.foldername(name))[1],public.safe_uuid((storage.foldername(name))[2]),true));
create policy camilla_linked_files_update on storage.objects for update to authenticated using(bucket_id='linked-files' and public.has_permission('files','add_file','own') and public.can_access_linked_entity((storage.foldername(name))[1],public.safe_uuid((storage.foldername(name))[2]),true)) with check(bucket_id='linked-files' and public.can_access_linked_entity((storage.foldername(name))[1],public.safe_uuid((storage.foldername(name))[2]),true));
create policy camilla_linked_files_delete on storage.objects for delete to authenticated using(bucket_id='linked-files' and public.has_permission('files','remove_file','own') and public.can_access_linked_entity((storage.foldername(name))[1],public.safe_uuid((storage.foldername(name))[2]),true));

-- Expõe somente os objetos necessários à Data API; RLS permanece obrigatória.
revoke all on public.notifications,public.notification_type_catalog,public.notification_profile_rules,public.notification_user_rules,public.record_views,public.history_entries,public.comment_mentions,public.comment_reads from anon,authenticated;
grant select on public.notifications to authenticated;
grant select on public.notification_type_catalog to authenticated;
grant select,insert,update,delete on public.notification_user_rules,public.record_views,public.comment_reads to authenticated;
grant select,insert,update,delete on public.notification_profile_rules to authenticated;
grant select on public.history_entries,public.comment_mentions to authenticated;
grant select,insert,update,delete on public.project_files to authenticated;
grant select on public.project_comments to authenticated;
grant select on public.project_kanban_view to authenticated;

-- Realtime somente para notificações do destinatário, protegidas pela RLS.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then alter publication supabase_realtime add table public.notifications; end if;
end $$;

-- Funções privilegiadas: remove execução pública e concede apenas o necessário.
do $$ declare sig text; begin
  foreach sig in array array[
    'public.user_has_permission(uuid,text,text)','public.user_permission_scope(uuid,text,text)','public.user_can_access_project(uuid,uuid)','public.notification_rule_for_user(uuid,text)','public.current_notification_rules()','public.save_current_notification_rules(jsonb)',
    'public.enqueue_notification(uuid,text,text,text,text,uuid,text,text,text,uuid,text,jsonb)','public.project_notification_recipients(uuid,uuid)',
    'public.mark_notification_read(uuid)','public.mark_all_notifications_read(text)','public.mark_record_view(text,text,text,text)','public.can_access_history_entry(uuid)',
    'public.save_project_comment(uuid,text,uuid,text,boolean,uuid[],uuid)','public.delete_project_comment(uuid)','public.can_access_linked_file(uuid,boolean)',
    'public.safe_uuid(text)','public.can_access_linked_entity(text,uuid,boolean)','public.generate_due_notifications(timestamptz)'
  ] loop execute 'revoke all on function '||sig||' from public,anon,authenticated'; end loop;
end $$;
grant execute on function public.current_notification_rules() to authenticated;
grant execute on function public.save_current_notification_rules(jsonb) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read(text) to authenticated;
grant execute on function public.mark_record_view(text,text,text,text) to authenticated;
grant execute on function public.can_access_history_entry(uuid) to authenticated;
grant execute on function public.save_project_comment(uuid,text,uuid,text,boolean,uuid[],uuid) to authenticated;
grant execute on function public.delete_project_comment(uuid) to authenticated;
grant execute on function public.safe_uuid(text) to authenticated;
grant execute on function public.can_access_linked_entity(text,uuid,boolean) to authenticated;
grant execute on function public.can_access_linked_file(uuid,boolean) to authenticated;
grant execute on function public.generate_due_notifications(timestamptz) to service_role;

-- Trigger functions não são endpoints da aplicação.
revoke all on function public.sync_project_history_entry() from public,anon,authenticated;
revoke all on function public.set_calendar_event_updated_by() from public,anon,authenticated;
revoke all on function public.log_client_central_history() from public,anon,authenticated;
revoke all on function public.log_activity_central_history() from public,anon,authenticated;
revoke all on function public.log_calendar_central_history() from public,anon,authenticated;
revoke all on function public.log_financial_central_history() from public,anon,authenticated;
revoke all on function public.log_admin_central_history() from public,anon,authenticated;
revoke all on function public.log_comment_history_notify() from public,anon,authenticated;
revoke all on function public.notify_comment_mention() from public,anon,authenticated;
revoke all on function public.log_file_history_notify() from public,anon,authenticated;

insert into public.system_settings(key,value,description) values
('comment_edit_window_minutes','15'::jsonb,'Prazo para edição de comentário pelo autor, em minutos'),
('notification_deadline_days','3'::jsonb,'Antecedência padrão para alertas de prazo'),
('notification_daily_summary_time','"08:00"'::jsonb,'Horário padrão do resumo diário'),
('linked_file_max_size_mb','50'::jsonb,'Limite de arquivos vinculados em MB')
on conflict(key) do update set value=excluded.value,description=excluded.description,updated_at=now();

insert into public.system_versions(version,notes,environment)
values('3.0.5','Etapa 04: central de notificações, histórico unificado, indicadores individuais, comentários com respostas e menções e arquivos versionados.','production')
on conflict(version) do update set notes=excluded.notes,environment=excluded.environment,released_at=now();

commit;
