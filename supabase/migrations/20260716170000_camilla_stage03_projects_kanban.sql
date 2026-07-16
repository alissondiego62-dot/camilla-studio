-- Camilla Studio — Etapa 03
-- Projetos, Kanban, miniaturas, prazos, etapas e checklist operacional.
-- Migration aditiva, transacional e idempotente. Não remove registros históricos.

begin;
set local lock_timeout = '20s';
set local statement_timeout = '0';

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.projects') is null then raise exception 'Tabela public.projects não encontrada.'; end if;
  if to_regclass('public.project_history') is null then raise exception 'Tabela public.project_history não encontrada.'; end if;
  if to_regclass('public.project_stages') is null then raise exception 'Aplique primeiro a Etapa 02.'; end if;
  if to_regprocedure('public.has_permission(text,text,text)') is null then raise exception 'Funções de permissão da Etapa 02 não encontradas.'; end if;
end $$;

lock table public.projects in share row exclusive mode;

-- ---------------------------------------------------------------------------
-- 1. Permissão de dispensa/aprovação do checklist
-- ---------------------------------------------------------------------------
insert into public.permission_catalog(module,action,module_label,action_label,supports_scope,position)
values('checklists','approve','Checklists','Dispensar item obrigatório',true,156)
on conflict(module,action) do update set module_label=excluded.module_label,action_label=excluded.action_label,supports_scope=true,position=excluded.position;

insert into public.profile_permissions(profile_id,permission_profile_id,module,action,allowed,scope)
select p.id,p.id,'checklists','approve',p.code in('administrator','owner','manager'),case when p.code in('administrator','owner','manager') then 'all' else 'none' end
from public.permission_profiles p
on conflict(profile_id,module,action) do update set allowed=excluded.allowed,scope=excluded.scope,permission_profile_id=excluded.permission_profile_id;

-- ---------------------------------------------------------------------------
-- 2. Histórico ampliado e nomenclaturas
-- ---------------------------------------------------------------------------
alter table public.project_history
  add column if not exists field_name text,
  add column if not exists old_value jsonb,
  add column if not exists new_value jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create or replace function public.project_stage_name(p_stage text)
returns text language sql immutable security invoker set search_path=public,pg_temp as $$
  select case p_stage
    when 'prospecting' then 'Prospecção'
    when 'briefing' then 'Briefing'
    when 'survey' then 'Levantamento'
    when 'briefing_preliminary' then 'Estudo Preliminar'
    when 'creation' then 'Criação'
    when 'adjustments' then 'Ajustes'
    when 'approval' then 'Aprovação'
    when 'executive' then 'Executivo'
    when 'revision' then 'Revisão'
    when 'construction' then 'Obra (histórico)'
    when 'completed' then 'Finalizado'
    else coalesce(p_stage,'Não definida') end
$$;

create or replace function public.log_project_change()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if current_setting('camilla.skip_project_history',true)='on' then return new; end if;
  if tg_op='INSERT' then
    insert into public.project_history(project_id,action_type,description,field_name,new_value,author_id,metadata)
    values(new.id,'created','Projeto criado.','project',to_jsonb(new.id),auth.uid(),jsonb_build_object('source','projects_trigger'));
    return new;
  end if;
  if old.stage is distinct from new.stage then
    insert into public.project_history(project_id,action_type,description,field_name,old_value,new_value,author_id,metadata)
    values(new.id,'stage_changed','Etapa alterada de '||public.project_stage_name(old.stage)||' para '||public.project_stage_name(new.stage)||'.','stage',to_jsonb(old.stage),to_jsonb(new.stage),auth.uid(),jsonb_build_object('source','projects_trigger'));
  end if;
  if old.status is distinct from new.status then
    insert into public.project_history(project_id,action_type,description,field_name,old_value,new_value,author_id,metadata)
    values(new.id,'status_changed','Status do projeto alterado.','status',to_jsonb(old.status),to_jsonb(new.status),auth.uid(),jsonb_build_object('source','projects_trigger'));
  end if;
  if old.responsible_user_id is distinct from new.responsible_user_id or old.responsible_name is distinct from new.responsible_name then
    insert into public.project_history(project_id,action_type,description,field_name,old_value,new_value,author_id,metadata)
    values(new.id,'responsible_changed','Responsável alterado de '||coalesce(old.responsible_name,'não atribuído')||' para '||coalesce(new.responsible_name,'não atribuído')||'.','responsible',jsonb_build_object('user_id',old.responsible_user_id,'name',old.responsible_name),jsonb_build_object('user_id',new.responsible_user_id,'name',new.responsible_name),auth.uid(),jsonb_build_object('source','projects_trigger'));
  end if;
  if old.main_deadline is distinct from new.main_deadline then
    insert into public.project_history(project_id,action_type,description,field_name,old_value,new_value,author_id,metadata)
    values(new.id,'main_deadline_changed','Prazo principal alterado de '||coalesce(to_char(old.main_deadline,'DD/MM/YYYY'),'não definido')||' para '||coalesce(to_char(new.main_deadline,'DD/MM/YYYY'),'não definido')||'.','main_deadline',to_jsonb(old.main_deadline),to_jsonb(new.main_deadline),auth.uid(),jsonb_build_object('source','projects_trigger'));
  end if;
  if old.client_id is distinct from new.client_id then
    insert into public.project_history(project_id,action_type,description,field_name,old_value,new_value,author_id,metadata)
    values(new.id,'client_changed','Cliente vinculado ao projeto foi alterado.','client_id',to_jsonb(old.client_id),to_jsonb(new.client_id),auth.uid(),jsonb_build_object('source','projects_trigger'));
  end if;
  if old.priority is distinct from new.priority then
    insert into public.project_history(project_id,action_type,description,field_name,old_value,new_value,author_id,metadata)
    values(new.id,'priority_changed','Prioridade do projeto foi alterada.','priority',to_jsonb(old.priority),to_jsonb(new.priority),auth.uid(),jsonb_build_object('source','projects_trigger'));
  end if;
  if old.name is distinct from new.name then
    insert into public.project_history(project_id,action_type,description,field_name,old_value,new_value,author_id,metadata)
    values(new.id,'name_changed','Nome do projeto foi alterado.','name',to_jsonb(old.name),to_jsonb(new.name),auth.uid(),jsonb_build_object('source','projects_trigger'));
  end if;
  if old.contract_value is distinct from new.contract_value then
    insert into public.project_history(project_id,action_type,description,field_name,old_value,new_value,author_id,metadata)
    values(new.id,'contract_value_changed','Valor contratado foi alterado.','contract_value',to_jsonb(old.contract_value),to_jsonb(new.contract_value),auth.uid(),jsonb_build_object('source','projects_trigger'));
  end if;
  return new;
end $$;

-- Preserva o texto anterior em metadados antes de corrigir nomenclaturas históricas.
update public.project_history
set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('stage03_original_description',description),
    description=regexp_replace(regexp_replace(description,'Briefing e preliminares','Estudo Preliminar','gi'),'Briefing Preliminar','Estudo Preliminar','gi')
where description ~* 'Briefing (e preliminares|Preliminar)';

update public.project_stages set name='Estudo Preliminar',active=true,archived_at=null,updated_at=now() where code='briefing_preliminary';
update public.checklist_templates set name=regexp_replace(name,'Briefing Preliminar|Briefing e preliminares','Estudo Preliminar','gi'),description=regexp_replace(coalesce(description,''),'Briefing Preliminar|Briefing e preliminares','Estudo Preliminar','gi'),updated_at=now() where coalesce(name,'') ~* 'Briefing (Preliminar|e preliminares)' or coalesce(description,'') ~* 'Briefing (Preliminar|e preliminares)';
update public.checklist_template_items set section=regexp_replace(coalesce(section,''),'Briefing Preliminar|Briefing e preliminares','Estudo Preliminar','gi'),title=regexp_replace(title,'Briefing Preliminar|Briefing e preliminares','Estudo Preliminar','gi') where coalesce(section,'') ~* 'Briefing (Preliminar|e preliminares)' or title ~* 'Briefing (Preliminar|e preliminares)';
update public.project_checklist_items set section=regexp_replace(coalesce(section,''),'Briefing Preliminar|Briefing e preliminares','Estudo Preliminar','gi'),title=regexp_replace(title,'Briefing Preliminar|Briefing e preliminares','Estudo Preliminar','gi') where coalesce(section,'') ~* 'Briefing (Preliminar|e preliminares)' or title ~* 'Briefing (Preliminar|e preliminares)';

-- Migração segura da etapa removida. O valor anterior permanece no histórico.
insert into public.project_history(project_id,action_type,description,field_name,old_value,new_value,author_id,metadata)
select p.id,'stage_migrated','Etapa Obra removida do fluxo. Projeto migrado para '||public.project_stage_name(case when p.status='completed' then 'completed' else 'revision' end)||'.','stage',to_jsonb('construction'::text),to_jsonb(case when p.status='completed' then 'completed' else 'revision' end),auth.uid(),jsonb_build_object('migration','camilla_stage03','original_stage','construction','original_status',p.status)
from public.projects p where p.stage='construction';

select set_config('camilla.skip_project_history','on',true);
update public.projects set stage=case when status='completed' then 'completed' else 'revision' end where stage='construction';
select set_config('camilla.skip_project_history','off',true);

update public.project_stages set active=false,archived_at=coalesce(archived_at,now()),name='Etapa removida (histórico)',updated_at=now() where code='construction';
update public.checklist_templates set active=false,archived_at=coalesce(archived_at,now()),updated_at=now() where coalesce(stage_code,stage)='construction';

alter table public.projects drop constraint if exists projects_stage_check;
alter table public.projects add constraint projects_stage_check check(stage in('prospecting','briefing','survey','briefing_preliminary','creation','adjustments','approval','executive','revision','completed'));

-- ---------------------------------------------------------------------------
-- 3. Datas planejadas e prazo principal
-- ---------------------------------------------------------------------------
insert into public.system_categories(module,code,name,color,active,position) values
('project_date_type','preliminary_study','Estudo preliminar','#d3c0bd',true,10),
('project_date_type','anteproject','Anteprojeto','#c9aaa1',true,20),
('project_date_type','executive_project','Projeto executivo','#9b6352',true,30),
('project_date_type','presentation','Apresentação','#8c5b4c',true,40),
('project_date_type','approval','Aprovação','#6d4a3f',true,50),
('project_date_type','partial_delivery','Entrega parcial','#765044',true,60),
('project_date_type','final_delivery','Entrega final','#52705c',true,70),
('project_date_type','meeting','Reunião','#805a4d',true,80),
('project_date_type','visit','Visita','#8b6a3d',true,90),
('project_date_type','other','Outra finalidade','#8e7c75',true,100)
on conflict(module,code) do update set name=excluded.name,color=excluded.color,active=true,position=excluded.position,archived_at=null,updated_at=now();

create table if not exists public.project_dates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  purpose_code text not null default 'other',
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  is_main_deadline boolean not null default false,
  status text not null default 'scheduled' check(status in('scheduled','in_progress','completed','cancelled')),
  completed_at timestamptz,
  activity_id uuid references public.project_activities(id) on delete set null,
  calendar_event_id uuid references public.calendar_events(id) on delete set null,
  legacy_source text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint project_dates_valid_range check(ends_at is null or ends_at>=starts_at)
);
create unique index if not exists project_dates_one_main_per_project on public.project_dates(project_id) where is_main_deadline and archived_at is null;
create unique index if not exists project_dates_legacy_source_unique on public.project_dates(project_id,legacy_source) where legacy_source is not null;
create index if not exists project_dates_project_start_idx on public.project_dates(project_id,starts_at) where archived_at is null;
create index if not exists project_dates_activity_idx on public.project_dates(activity_id) where activity_id is not null;
create index if not exists project_dates_event_idx on public.project_dates(calendar_event_id) where calendar_event_id is not null;

drop trigger if exists project_dates_set_updated_at on public.project_dates;
create trigger project_dates_set_updated_at before update on public.project_dates for each row execute function public.set_updated_at();

create or replace function public.log_project_date_change()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  row_data public.project_dates%rowtype;
  action text;
  event_description text;
  old_json jsonb;
  new_json jsonb;
begin
  if tg_op='DELETE' then
    row_data:=old;
    old_json:=to_jsonb(old);
    new_json:=null;
  elsif tg_op='INSERT' then
    row_data:=new;
    old_json:=null;
    new_json:=to_jsonb(new);
  else
    row_data:=new;
    old_json:=to_jsonb(old);
    new_json:=to_jsonb(new);
  end if;

  if current_setting('camilla.skip_project_date_history',true)='on' then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;

  action:=case when tg_op='INSERT' then 'project_date_created' when tg_op='DELETE' then 'project_date_deleted' else 'project_date_updated' end;
  event_description:=case when tg_op='INSERT' then 'Data planejada adicionada: '||new.title||'.' when tg_op='DELETE' then 'Data planejada removida: '||old.title||'.' else 'Data planejada atualizada: '||new.title||'.' end;
  insert into public.project_history(project_id,action_type,description,field_name,old_value,new_value,author_id,metadata)
  values(row_data.project_id,action,event_description,'project_date',old_json,new_json,auth.uid(),jsonb_build_object('project_date_id',row_data.id,'purpose_code',row_data.purpose_code));

  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists project_dates_history on public.project_dates;
create trigger project_dates_history after insert or update or delete on public.project_dates for each row execute function public.log_project_date_change();

select set_config('camilla.skip_project_date_history','on',true);
insert into public.project_dates(project_id,purpose_code,title,starts_at,all_day,is_main_deadline,status,legacy_source,created_by)
select p.id,'final_delivery','Prazo principal',(p.main_deadline::timestamp+time '17:00') at time zone 'America/Boa_Vista',true,true,'scheduled','main_deadline',p.created_by
from public.projects p where p.main_deadline is not null
on conflict(project_id,legacy_source) where legacy_source is not null do nothing;
insert into public.project_dates(project_id,purpose_code,title,starts_at,all_day,is_main_deadline,status,legacy_source,created_by)
select p.id,'partial_delivery','Entrega parcial 1',(p.deadline_stage_1::timestamp+time '17:00') at time zone 'America/Boa_Vista',true,false,'scheduled','deadline_stage_1',p.created_by
from public.projects p where p.deadline_stage_1 is not null
on conflict(project_id,legacy_source) where legacy_source is not null do nothing;
insert into public.project_dates(project_id,purpose_code,title,starts_at,all_day,is_main_deadline,status,legacy_source,created_by)
select p.id,'partial_delivery','Entrega parcial 2',(p.deadline_stage_2::timestamp+time '17:00') at time zone 'America/Boa_Vista',true,false,'scheduled','deadline_stage_2',p.created_by
from public.projects p where p.deadline_stage_2 is not null
on conflict(project_id,legacy_source) where legacy_source is not null do nothing;
insert into public.project_dates(project_id,purpose_code,title,starts_at,all_day,is_main_deadline,status,legacy_source,created_by)
select p.id,'final_delivery','Entrega final',(p.deadline_stage_3::timestamp+time '17:00') at time zone 'America/Boa_Vista',true,false,'scheduled','deadline_stage_3',p.created_by
from public.projects p where p.deadline_stage_3 is not null and p.deadline_stage_3 is distinct from p.main_deadline
on conflict(project_id,legacy_source) where legacy_source is not null do nothing;
select set_config('camilla.skip_project_date_history','off',true);

create or replace function public.save_project_date(p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;declare v_project_id uuid;declare v_is_main boolean;declare v_start timestamptz;declare v_row public.project_dates%rowtype;
begin
  v_id:=nullif(p_payload->>'id','')::uuid;
  v_project_id:=nullif(p_payload->>'project_id','')::uuid;
  if v_project_id is null then raise exception 'Projeto obrigatório.'; end if;
  if not public.can_access_project(v_project_id) or not public.has_permission('projects','change_deadline','own') then raise exception 'Permissão insuficiente para alterar prazos.'; end if;
  v_start:=(p_payload->>'starts_at')::timestamptz;
  v_is_main:=coalesce((p_payload->>'is_main_deadline')::boolean,false);
  if v_is_main then update public.project_dates set is_main_deadline=false,updated_by=auth.uid(),updated_at=now() where project_id=v_project_id and is_main_deadline and archived_at is null and (v_id is null or id<>v_id); end if;
  if v_id is null then
    insert into public.project_dates(project_id,purpose_code,title,description,starts_at,ends_at,all_day,is_main_deadline,status,activity_id,calendar_event_id,created_by,updated_by)
    values(v_project_id,coalesce(nullif(p_payload->>'purpose_code',''),'other'),trim(p_payload->>'title'),nullif(trim(coalesce(p_payload->>'description','')),''),v_start,nullif(p_payload->>'ends_at','')::timestamptz,coalesce((p_payload->>'all_day')::boolean,false),v_is_main,coalesce(nullif(p_payload->>'status',''),'scheduled'),nullif(p_payload->>'activity_id','')::uuid,nullif(p_payload->>'calendar_event_id','')::uuid,auth.uid(),auth.uid()) returning * into v_row;
  else
    update public.project_dates set purpose_code=coalesce(nullif(p_payload->>'purpose_code',''),'other'),title=trim(p_payload->>'title'),description=nullif(trim(coalesce(p_payload->>'description','')),''),starts_at=v_start,ends_at=nullif(p_payload->>'ends_at','')::timestamptz,all_day=coalesce((p_payload->>'all_day')::boolean,false),is_main_deadline=v_is_main,status=coalesce(nullif(p_payload->>'status',''),'scheduled'),activity_id=nullif(p_payload->>'activity_id','')::uuid,calendar_event_id=nullif(p_payload->>'calendar_event_id','')::uuid,updated_by=auth.uid(),updated_at=now()
    where id=v_id and project_id=v_project_id and archived_at is null returning * into v_row;
    if not found then raise exception 'Data não encontrada.'; end if;
  end if;
  update public.projects set main_deadline=(select (d.starts_at at time zone 'America/Boa_Vista')::date from public.project_dates d where d.project_id=v_project_id and d.is_main_deadline and d.archived_at is null limit 1) where id=v_project_id;
  return v_row.id;
end $$;

create or replace function public.archive_project_date(p_date_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_project uuid;declare was_main boolean;
begin
  select project_id,is_main_deadline into v_project,was_main from public.project_dates where id=p_date_id and archived_at is null;
  if v_project is null then raise exception 'Data não encontrada.'; end if;
  if not public.can_access_project(v_project) or not public.has_permission('projects','change_deadline','own') then raise exception 'Permissão insuficiente.'; end if;
  update public.project_dates set archived_at=now(),is_main_deadline=false,updated_by=auth.uid(),updated_at=now() where id=p_date_id;
  if was_main then update public.projects set main_deadline=null where id=v_project; end if;
end $$;

create or replace function public.create_activity_from_project_date(p_date_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.project_dates%rowtype;declare new_id uuid;
begin
  select * into d from public.project_dates where id=p_date_id and archived_at is null;
  if not found then raise exception 'Data não encontrada.'; end if;
  if not public.can_access_project(d.project_id) or not public.has_permission('activities','create','own') then raise exception 'Permissão insuficiente.'; end if;
  if d.activity_id is not null then return d.activity_id; end if;
  insert into public.project_activities(project_id,title,description,status,priority,due_date,created_by) values(d.project_id,d.title,d.description,'not_started','normal',(d.starts_at at time zone 'America/Boa_Vista')::date,auth.uid()) returning id into new_id;
  update public.project_dates set activity_id=new_id,updated_by=auth.uid(),updated_at=now() where id=d.id;
  return new_id;
end $$;

create or replace function public.create_calendar_event_from_project_date(p_date_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.project_dates%rowtype;declare new_id uuid;
begin
  select * into d from public.project_dates where id=p_date_id and archived_at is null;
  if not found then raise exception 'Data não encontrada.'; end if;
  if not public.can_access_project(d.project_id) or not public.has_permission('agenda','create','own') then raise exception 'Permissão insuficiente.'; end if;
  if d.calendar_event_id is not null then return d.calendar_event_id; end if;
  insert into public.calendar_events(project_id,title,event_type,starts_at,ends_at,notes,status,created_by) values(d.project_id,d.title,case d.purpose_code when 'meeting' then 'meeting' when 'visit' then 'site_visit' when 'approval' then 'approval' when 'presentation' then 'presentation' else 'delivery' end,d.starts_at,d.ends_at,d.description,'scheduled',auth.uid()) returning id into new_id;
  update public.project_dates set calendar_event_id=new_id,updated_by=auth.uid(),updated_at=now() where id=d.id;
  return new_id;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Miniatura privada do projeto
-- ---------------------------------------------------------------------------
create table if not exists public.project_thumbnails (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  bucket_id text not null default 'project-thumbnails',
  object_path text not null,
  mime_type text not null check(mime_type in('image/png','image/jpeg','image/webp')),
  file_size bigint not null check(file_size>0 and file_size<=8388608),
  version integer not null default 1,
  active boolean not null default true,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references auth.users(id) on delete set null,
  unique(bucket_id,object_path)
);
create unique index if not exists project_thumbnails_one_active on public.project_thumbnails(project_id) where active and removed_at is null;
create index if not exists project_thumbnails_project_version_idx on public.project_thumbnails(project_id,version desc);
drop trigger if exists project_thumbnails_set_updated_at on public.project_thumbnails;
create trigger project_thumbnails_set_updated_at before update on public.project_thumbnails for each row execute function public.set_updated_at();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('project-thumbnails','project-thumbnails',false,8388608,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.project_id_from_storage_path(p_name text)
returns uuid language plpgsql immutable security invoker set search_path=public,pg_temp as $$
declare segment text;begin segment:=split_part(p_name,'/',1);if segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return segment::uuid;end if;return null;end $$;

create or replace function public.activate_project_thumbnail(p_project_id uuid,p_bucket_id text,p_object_path text,p_mime_type text,p_file_size bigint)
returns public.project_thumbnails language plpgsql security definer set search_path=public,storage,pg_temp as $$
declare new_row public.project_thumbnails;declare next_version integer;
begin
  if not public.can_access_project(p_project_id) or not public.has_permission('files','add_file','own') then raise exception 'Permissão insuficiente para adicionar miniatura.'; end if;
  if p_bucket_id<>'project-thumbnails' or public.project_id_from_storage_path(p_object_path) is distinct from p_project_id then raise exception 'Caminho de arquivo inválido.'; end if;
  if p_mime_type not in('image/png','image/jpeg','image/webp') or p_file_size<=0 or p_file_size>8388608 then raise exception 'Arquivo inválido.'; end if;
  perform pg_advisory_xact_lock(hashtext('camilla:thumbnail:'||p_project_id::text));
  select coalesce(max(version),0)+1 into next_version from public.project_thumbnails where project_id=p_project_id;
  update public.project_thumbnails set active=false,updated_at=now() where project_id=p_project_id and active and removed_at is null;
  insert into public.project_thumbnails(project_id,bucket_id,object_path,mime_type,file_size,version,active,uploaded_by) values(p_project_id,p_bucket_id,p_object_path,p_mime_type,p_file_size,next_version,true,auth.uid()) returning * into new_row;
  update public.projects set cover_url='storage://'||p_bucket_id||'/'||p_object_path where id=p_project_id;
  insert into public.project_history(project_id,action_type,description,field_name,new_value,author_id,metadata) values(p_project_id,'thumbnail_changed','Miniatura do projeto atualizada.','thumbnail',to_jsonb(new_row.id),auth.uid(),jsonb_build_object('version',next_version,'mime_type',p_mime_type,'file_size',p_file_size,'object_path',p_object_path));
  return new_row;
end $$;

create or replace function public.remove_project_thumbnail(p_thumbnail_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare row_data public.project_thumbnails%rowtype;
begin
  select * into row_data from public.project_thumbnails where id=p_thumbnail_id and active and removed_at is null;
  if not found then raise exception 'Miniatura ativa não encontrada.'; end if;
  if not public.can_access_project(row_data.project_id) or not public.has_permission('files','remove_file','own') then raise exception 'Permissão insuficiente para remover miniatura.'; end if;
  update public.project_thumbnails set active=false,removed_at=now(),removed_by=auth.uid(),updated_at=now() where id=p_thumbnail_id;
  update public.projects set cover_url=null where id=row_data.project_id and cover_url='storage://'||row_data.bucket_id||'/'||row_data.object_path;
  insert into public.project_history(project_id,action_type,description,field_name,old_value,author_id,metadata) values(row_data.project_id,'thumbnail_removed','Miniatura do projeto removida.','thumbnail',to_jsonb(row_data.id),auth.uid(),jsonb_build_object('version',row_data.version,'object_path',row_data.object_path));
end $$;

-- ---------------------------------------------------------------------------
-- 5. Movimentação transacional e checklist operacional
-- ---------------------------------------------------------------------------
create or replace function public.update_project_workflow(p_project_id uuid,p_patch jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare current_row public.projects%rowtype;declare target_stage text;declare target_status text;declare target_user uuid;declare target_name text;
begin
  select * into current_row from public.projects where id=p_project_id for update;
  if not found or not public.can_access_project(p_project_id) then raise exception 'Projeto não encontrado ou sem acesso.'; end if;
  target_stage:=case when p_patch ? 'stage' then nullif(p_patch->>'stage','') else current_row.stage end;
  target_status:=case when p_patch ? 'status' then nullif(p_patch->>'status','') else current_row.status end;
  target_user:=case when p_patch ? 'responsible_user_id' then nullif(p_patch->>'responsible_user_id','')::uuid else current_row.responsible_user_id end;
  target_name:=case when p_patch ? 'responsible_name' then nullif(p_patch->>'responsible_name','') else current_row.responsible_name end;
  if target_stage is distinct from current_row.stage then
    if not public.has_permission('projects','change_stage','own') and not public.has_permission('kanban','change_stage','own') then raise exception 'Permissão insuficiente para alterar etapa.'; end if;
    if target_stage='construction' or not exists(select 1 from public.project_stages where code=target_stage and active and archived_at is null) then raise exception 'Etapa inválida ou inativa.'; end if;
  end if;
  if target_status is distinct from current_row.status then
    if not public.has_permission('projects','change_status','own') and not public.has_permission('kanban','change_status','own') then raise exception 'Permissão insuficiente para alterar status.'; end if;
    if target_status is null or not exists(select 1 from public.project_statuses where code=target_status and active and archived_at is null) then raise exception 'Status inválido ou inativo.'; end if;
  end if;
  if target_user is distinct from current_row.responsible_user_id and not public.has_permission('projects','edit','own') then raise exception 'Permissão insuficiente para alterar responsável.'; end if;
  if target_user is not null then select name into target_name from public.profiles where id=target_user and active and blocked_at is null and archived_at is null;if target_name is null then raise exception 'Responsável inválido ou inativo.';end if;end if;
  update public.projects set stage=target_stage,status=target_status,responsible_user_id=target_user,responsible_name=target_name where id=p_project_id returning * into current_row;
  return to_jsonb(current_row);
end $$;

alter table public.project_checklist_items
  add column if not exists waived_at timestamptz,
  add column if not exists waived_by uuid references auth.users(id) on delete set null,
  add column if not exists waiver_reason text;

create or replace function public.update_project_checklist_item(p_item_id uuid,p_action text,p_reason text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare item public.project_checklist_items%rowtype;
begin
  select * into item from public.project_checklist_items where id=p_item_id for update;
  if not found then raise exception 'Item não encontrado.'; end if;
  if not public.can_access_project(item.project_id) or not public.has_permission('checklists','edit','own') then raise exception 'Permissão insuficiente.'; end if;
  if p_action='complete' then
    update public.project_checklist_items set started_at=coalesce(started_at,now()),completed_at=now(),completed_by=auth.uid(),waived_at=null,waived_by=null,waiver_reason=null where id=p_item_id;
  elsif p_action='reopen' then
    update public.project_checklist_items set completed_at=null,completed_by=null,waived_at=null,waived_by=null,waiver_reason=null where id=p_item_id;
  elsif p_action='waive' then
    if not item.required then raise exception 'Somente itens obrigatórios precisam de dispensa.'; end if;
    if not public.has_permission('checklists','approve','own') then raise exception 'Permissão insuficiente para dispensar item obrigatório.'; end if;
    if length(trim(coalesce(p_reason,'')))<5 then raise exception 'Justificativa obrigatória com pelo menos 5 caracteres.'; end if;
    update public.project_checklist_items set started_at=coalesce(started_at,now()),completed_at=null,completed_by=null,waived_at=now(),waived_by=auth.uid(),waiver_reason=trim(p_reason) where id=p_item_id;
  else raise exception 'Ação inválida.'; end if;
  insert into public.project_history(project_id,action_type,description,field_name,old_value,new_value,author_id,metadata)
  values(item.project_id,'checklist_item_'||p_action,case when p_action='waive' then 'Item obrigatório dispensado com justificativa: '||item.title||'.' when p_action='complete' then 'Item do checklist concluído: '||item.title||'.' else 'Item do checklist reaberto: '||item.title||'.' end,'checklist_item',to_jsonb(item),jsonb_build_object('action',p_action,'reason',p_reason),auth.uid(),jsonb_build_object('checklist_item_id',item.id,'stage',item.stage,'required',item.required));
end $$;

create or replace function public.enforce_required_checklist_before_completion()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare check_stage text;declare pending_count integer;
begin
  if (new.stage='completed' and old.stage is distinct from new.stage) or (new.status='completed' and old.status is distinct from new.status) then
    check_stage:=case when new.stage='completed' then old.stage else new.stage end;
    select count(*) into pending_count from public.project_checklist_items where project_id=new.id and stage=check_stage and required and completed_at is null and waived_at is null;
    if pending_count>0 then raise exception 'Existem % item(ns) obrigatório(s) pendente(s) no checklist da etapa %.',pending_count,public.project_stage_name(check_stage);end if;
  end if;
  return new;
end $$;
drop trigger if exists projects_enforce_required_checklist on public.projects;
create trigger projects_enforce_required_checklist before update of stage,status on public.projects for each row execute function public.enforce_required_checklist_before_completion();

-- ---------------------------------------------------------------------------
-- 6. Visão agregada do Kanban, respeitando a RLS das tabelas de origem
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
  (select count(*) from public.project_files f where f.project_id=p.id) as files_count,
  (select count(*) from public.project_comments cm where cm.project_id=p.id) as comments_count,
  (select count(*) from public.calendar_events e where e.project_id=p.id) as agenda_count,
  (select count(*) from public.project_history h where h.project_id=p.id) as history_count,
  (select max(f.created_at) from public.project_files f where f.project_id=p.id) as latest_file_at,
  (select max(cm.created_at) from public.project_comments cm where cm.project_id=p.id) as latest_comment_at,
  (select max(e.updated_at) from public.calendar_events e where e.project_id=p.id) as latest_agenda_at,
  (select max(h.created_at) from public.project_history h where h.project_id=p.id) as latest_history_at
from public.projects p
left join public.clients c on c.id=p.client_id
left join public.profiles r on r.id=p.responsible_user_id
left join public.project_stages s on s.code=p.stage
left join lateral (select pt.bucket_id,pt.object_path from public.project_thumbnails pt where pt.project_id=p.id and pt.active and pt.removed_at is null order by pt.version desc limit 1) t on true
where p.archived_at is null and p.stage<>'construction';

-- ---------------------------------------------------------------------------
-- 7. RLS e Storage
-- ---------------------------------------------------------------------------
alter table public.project_dates enable row level security;
alter table public.project_thumbnails enable row level security;

do $$ declare r record;begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='project_dates' loop execute format('drop policy if exists %I on public.project_dates',r.policyname);end loop;
  for r in select policyname from pg_policies where schemaname='public' and tablename='project_thumbnails' loop execute format('drop policy if exists %I on public.project_thumbnails',r.policyname);end loop;
end $$;
create policy project_dates_select_scope on public.project_dates for select to authenticated using(public.can_access_project(project_id));
create policy project_dates_insert_scope on public.project_dates for insert to authenticated with check(public.can_access_project(project_id) and public.has_permission('projects','change_deadline','own'));
create policy project_dates_update_scope on public.project_dates for update to authenticated using(public.can_access_project(project_id) and public.has_permission('projects','change_deadline','own')) with check(public.can_access_project(project_id) and public.has_permission('projects','change_deadline','own'));
create policy project_thumbnails_select_scope on public.project_thumbnails for select to authenticated using(public.can_access_project(project_id));
create policy project_thumbnails_insert_scope on public.project_thumbnails for insert to authenticated with check(public.can_access_project(project_id) and public.has_permission('files','add_file','own'));
create policy project_thumbnails_update_scope on public.project_thumbnails for update to authenticated using(public.can_access_project(project_id) and (public.has_permission('files','add_file','own') or public.has_permission('files','remove_file','own'))) with check(public.can_access_project(project_id));

-- Policies do bucket privado. Upsert exige SELECT + INSERT + UPDATE.
do $$ declare r record;begin
  for r in select policyname from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'camilla_project_thumbnail_%' loop execute format('drop policy if exists %I on storage.objects',r.policyname);end loop;
end $$;
create policy camilla_project_thumbnail_select on storage.objects for select to authenticated using(bucket_id='project-thumbnails' and public.can_access_project(public.project_id_from_storage_path(name)) and exists(select 1 from public.project_thumbnails pt where pt.bucket_id=storage.objects.bucket_id and pt.object_path=storage.objects.name and pt.active and pt.removed_at is null));
create policy camilla_project_thumbnail_insert on storage.objects for insert to authenticated with check(bucket_id='project-thumbnails' and public.can_access_project(public.project_id_from_storage_path(name)) and public.has_permission('files','add_file','own'));
create policy camilla_project_thumbnail_update on storage.objects for update to authenticated using(bucket_id='project-thumbnails' and public.can_access_project(public.project_id_from_storage_path(name)) and public.has_permission('files','add_file','own')) with check(bucket_id='project-thumbnails' and public.can_access_project(public.project_id_from_storage_path(name)) and public.has_permission('files','add_file','own'));
create policy camilla_project_thumbnail_delete on storage.objects for delete to authenticated using(bucket_id='project-thumbnails' and public.can_access_project(public.project_id_from_storage_path(name)) and public.has_permission('files','remove_file','own'));

revoke all on public.project_dates,public.project_thumbnails from anon,authenticated;
grant select,update on public.project_dates to authenticated;
grant select on public.project_thumbnails to authenticated;
grant select on public.project_kanban_view to authenticated;

revoke all on function public.project_stage_name(text) from public;
revoke all on function public.project_id_from_storage_path(text) from public;
revoke all on function public.save_project_date(jsonb) from public;
revoke all on function public.archive_project_date(uuid) from public;
revoke all on function public.create_activity_from_project_date(uuid) from public;
revoke all on function public.create_calendar_event_from_project_date(uuid) from public;
revoke all on function public.activate_project_thumbnail(uuid,text,text,text,bigint) from public;
revoke all on function public.remove_project_thumbnail(uuid) from public;
revoke all on function public.update_project_workflow(uuid,jsonb) from public;
revoke all on function public.update_project_checklist_item(uuid,text,text) from public;
revoke all on function public.log_project_change() from public;
revoke all on function public.log_project_date_change() from public;
revoke all on function public.enforce_required_checklist_before_completion() from public;

grant execute on function public.project_stage_name(text) to authenticated;
grant execute on function public.project_id_from_storage_path(text) to authenticated;
grant execute on function public.save_project_date(jsonb) to authenticated;
grant execute on function public.archive_project_date(uuid) to authenticated;
grant execute on function public.create_activity_from_project_date(uuid) to authenticated;
grant execute on function public.create_calendar_event_from_project_date(uuid) to authenticated;
grant execute on function public.activate_project_thumbnail(uuid,text,text,text,bigint) to authenticated;
grant execute on function public.remove_project_thumbnail(uuid) to authenticated;
grant execute on function public.update_project_workflow(uuid,jsonb) to authenticated;
grant execute on function public.update_project_checklist_item(uuid,text,text) to authenticated;

insert into public.system_settings(key,value,description) values
('project_thumbnail_max_size_mb','8'::jsonb,'Limite da miniatura de projeto em MB'),
('project_thumbnail_bucket','"project-thumbnails"'::jsonb,'Bucket privado das miniaturas'),
('project_deadline_warning_days','7'::jsonb,'Dias para destacar prazo próximo')
on conflict(key) do update set value=excluded.value,description=excluded.description,updated_at=now();

insert into public.system_versions(version,notes,environment)
values('3.0.4','Etapa 03: Projetos, Kanban responsivo, miniaturas privadas, datas planejadas, prazo principal, histórico ampliado e checklist operacional.','production')
on conflict(version) do update set notes=excluded.notes,environment=excluded.environment,released_at=now();

commit;
