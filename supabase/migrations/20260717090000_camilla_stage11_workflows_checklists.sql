begin;

-- Etapa 11: Fluxos, catálogos e checklists por etapa

do $$
begin
  if to_regclass('public.project_stages') is null
     or to_regclass('public.project_statuses') is null
     or to_regclass('public.activity_statuses') is null
     or to_regclass('public.checklist_templates') is null
     or to_regclass('public.checklist_template_items') is null then
    raise exception 'Estruturas obrigatórias de fluxos e checklists não foram encontradas.';
  end if;
end $$;

create or replace function public.workflow_catalog_table(p_kind text)
returns text language plpgsql immutable set search_path=public,pg_temp as $$
begin
  if p_kind not in ('project_stages','project_statuses','activity_statuses') then
    raise exception 'Catálogo inválido.';
  end if;
  return p_kind;
end $$;

create or replace function public.workflow_catalog_usage(p_kind text,p_code text)
returns bigint language plpgsql stable security definer set search_path=public,pg_temp as $$
declare total bigint;
begin
  perform public.workflow_catalog_table(p_kind);
  if p_kind='project_stages' then
    select count(*) into total from public.projects where stage=p_code and archived_at is null;
  elsif p_kind='project_statuses' then
    select count(*) into total from public.projects where status=p_code and archived_at is null;
  else
    select count(*) into total from public.project_activities where status=p_code and archived_at is null and deleted_at is null;
  end if;
  return coalesce(total,0);
end $$;

create or replace function public.list_workflow_catalog(p_kind text)
returns table(id uuid,code text,name text,color text,position integer,active boolean,final boolean,archived_at timestamptz,linked_records bigint)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  perform public.workflow_catalog_table(p_kind);
  if not public.current_user_access_valid() then raise exception 'Sessão inválida.'; end if;
  if p_kind='project_stages' then
    return query select s.id,s.code,s.name,s.color,s.position,s.active,s.final,s.archived_at,public.workflow_catalog_usage(p_kind,s.code) from public.project_stages s order by s.position,s.name;
  elsif p_kind='project_statuses' then
    return query select s.id,s.code,s.name,s.color,s.position,s.active,s.final,s.archived_at,public.workflow_catalog_usage(p_kind,s.code) from public.project_statuses s order by s.position,s.name;
  else
    return query select s.id,s.code,s.name,s.color,s.position,s.active,s.final,s.archived_at,public.workflow_catalog_usage(p_kind,s.code) from public.activity_statuses s order by s.position,s.name;
  end if;
end $$;

create or replace function public.save_workflow_catalog(p_kind text,p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare target_id uuid:=nullif(p_payload->>'id','')::uuid;normalized_code text:=regexp_replace(lower(trim(p_payload->>'code')),'[^a-z0-9_]+','_','g');result_id uuid;old_code text;
begin
  perform public.workflow_catalog_table(p_kind);
  if not public.has_permission('settings','manage_settings','own') then raise exception 'Permissão insuficiente.'; end if;
  if coalesce(trim(p_payload->>'name'),'')='' or normalized_code='' then raise exception 'Nome e código são obrigatórios.'; end if;
  if target_id is not null then
    if p_kind='project_stages' then select code into old_code from public.project_stages where id=target_id;
    elsif p_kind='project_statuses' then select code into old_code from public.project_statuses where id=target_id;
    else select code into old_code from public.activity_statuses where id=target_id; end if;
    if old_code is null then raise exception 'Item não encontrado.'; end if;
    if old_code<>normalized_code and public.workflow_catalog_usage(p_kind,old_code)>0 then raise exception 'O código não pode ser alterado enquanto houver registros vinculados.'; end if;
  end if;
  if p_kind='project_stages' then
    insert into public.project_stages(id,code,name,color,position,active,final,archived_at,updated_at)
    values(coalesce(target_id,gen_random_uuid()),normalized_code,trim(p_payload->>'name'),nullif(p_payload->>'color',''),coalesce((p_payload->>'position')::int,0),coalesce((p_payload->>'active')::boolean,true),coalesce((p_payload->>'final')::boolean,false),case when coalesce((p_payload->>'active')::boolean,true) then null else now() end,now())
    on conflict(id) do update set code=excluded.code,name=excluded.name,color=excluded.color,position=excluded.position,active=excluded.active,final=excluded.final,archived_at=excluded.archived_at,updated_at=now() returning id into result_id;
    if coalesce((p_payload->>'active')::boolean,true) then
      insert into public.checklist_templates(name,description,stage_code,stage,project_type,active,version,created_by)
      select trim(p_payload->>'name')||' — Checklist','Checklist padrão vinculado diretamente à etapa do Kanban.',normalized_code,normalized_code,null,true,1,auth.uid()
      where not exists(select 1 from public.checklist_templates where stage_code=normalized_code and active and archived_at is null);
    else
      update public.checklist_templates set active=false,archived_at=coalesce(archived_at,now()),updated_at=now() where stage_code=normalized_code and active;
    end if;
  elsif p_kind='project_statuses' then
    insert into public.project_statuses(id,code,name,color,position,active,final,archived_at,updated_at)
    values(coalesce(target_id,gen_random_uuid()),normalized_code,trim(p_payload->>'name'),nullif(p_payload->>'color',''),coalesce((p_payload->>'position')::int,0),coalesce((p_payload->>'active')::boolean,true),coalesce((p_payload->>'final')::boolean,false),case when coalesce((p_payload->>'active')::boolean,true) then null else now() end,now())
    on conflict(id) do update set code=excluded.code,name=excluded.name,color=excluded.color,position=excluded.position,active=excluded.active,final=excluded.final,archived_at=excluded.archived_at,updated_at=now() returning id into result_id;
  else
    insert into public.activity_statuses(id,code,name,color,position,active,final,archived_at,updated_at)
    values(coalesce(target_id,gen_random_uuid()),normalized_code,trim(p_payload->>'name'),nullif(p_payload->>'color',''),coalesce((p_payload->>'position')::int,0),coalesce((p_payload->>'active')::boolean,true),coalesce((p_payload->>'final')::boolean,false),case when coalesce((p_payload->>'active')::boolean,true) then null else now() end,now())
    on conflict(id) do update set code=excluded.code,name=excluded.name,color=excluded.color,position=excluded.position,active=excluded.active,final=excluded.final,archived_at=excluded.archived_at,updated_at=now() returning id into result_id;
  end if;
  insert into public.history_entries(module,record_type,record_id,actor_user_id,action,description,metadata,source_table,source_id)
  values('settings','workflow_catalog',result_id::text,auth.uid(),case when target_id is null then 'created' else 'updated' end,'Catálogo de fluxo atualizado.',jsonb_build_object('kind',p_kind,'code',normalized_code),p_kind,result_id::text||':'||txid_current()::text)
  on conflict(source_table,source_id) where source_table is not null and source_id is not null do nothing;
  return result_id;
end $$;

create or replace function public.reorder_workflow_catalog(p_kind text,p_ids uuid[])
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare item uuid;idx integer:=0;
begin
  perform public.workflow_catalog_table(p_kind);
  if not public.has_permission('settings','manage_settings','own') then raise exception 'Permissão insuficiente.'; end if;
  foreach item in array p_ids loop
    idx:=idx+1;
    if p_kind='project_stages' then update public.project_stages set position=idx*10,updated_at=now() where id=item;
    elsif p_kind='project_statuses' then update public.project_statuses set position=idx*10,updated_at=now() where id=item;
    else update public.activity_statuses set position=idx*10,updated_at=now() where id=item; end if;
  end loop;
end $$;

create or replace function public.set_workflow_catalog_active(p_kind text,p_id uuid,p_active boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform public.workflow_catalog_table(p_kind);
  if not public.has_permission('settings','manage_settings','own') then raise exception 'Permissão insuficiente.'; end if;
  if p_kind='project_stages' then
    update public.project_stages set active=p_active,archived_at=case when p_active then null else coalesce(archived_at,now()) end,updated_at=now() where id=p_id;
    if p_active then
      insert into public.checklist_templates(name,description,stage_code,stage,project_type,active,version,created_by)
      select s.name||' — Checklist','Checklist padrão vinculado diretamente à etapa do Kanban.',s.code,s.code,null,true,1,auth.uid() from public.project_stages s where s.id=p_id
      and not exists(select 1 from public.checklist_templates t where t.stage_code=s.code and t.active and t.archived_at is null);
    else
      update public.checklist_templates set active=false,archived_at=coalesce(archived_at,now()),updated_at=now() where stage_code=(select code from public.project_stages where id=p_id) and active;
    end if;
  elsif p_kind='project_statuses' then update public.project_statuses set active=p_active,archived_at=case when p_active then null else coalesce(archived_at,now()) end,updated_at=now() where id=p_id;
  else update public.activity_statuses set active=p_active,archived_at=case when p_active then null else coalesce(archived_at,now()) end,updated_at=now() where id=p_id; end if;
end $$;

create or replace function public.delete_workflow_catalog(p_kind text,p_id uuid,p_replacement_code text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare old_code text;used bigint;replacement_ok boolean;
begin
  perform public.workflow_catalog_table(p_kind);
  if not public.has_permission('settings','manage_settings','own') then raise exception 'Permissão insuficiente.'; end if;
  if p_kind='project_stages' then select code into old_code from public.project_stages where id=p_id;
  elsif p_kind='project_statuses' then select code into old_code from public.project_statuses where id=p_id;
  else select code into old_code from public.activity_statuses where id=p_id; end if;
  if old_code is null then raise exception 'Item não encontrado.'; end if;
  used:=public.workflow_catalog_usage(p_kind,old_code);
  if used>0 then
    if coalesce(p_replacement_code,'')='' or p_replacement_code=old_code then raise exception 'Selecione um substituto para migrar os registros vinculados.'; end if;
    if p_kind='project_stages' then select exists(select 1 from public.project_stages where code=p_replacement_code and active and archived_at is null) into replacement_ok;
    elsif p_kind='project_statuses' then select exists(select 1 from public.project_statuses where code=p_replacement_code and active and archived_at is null) into replacement_ok;
    else select exists(select 1 from public.activity_statuses where code=p_replacement_code and active and archived_at is null) into replacement_ok; end if;
    if not replacement_ok then raise exception 'Substituto inválido ou inativo.'; end if;
    if p_kind='project_stages' then
      update public.projects set stage=p_replacement_code,updated_at=now() where stage=old_code;
      update public.project_activities set stage=p_replacement_code,updated_at=now() where stage=old_code;
    elsif p_kind='project_statuses' then update public.projects set status=p_replacement_code,updated_at=now() where status=old_code;
    else update public.project_activities set status=p_replacement_code,updated_at=now() where status=old_code; end if;
  end if;
  if p_kind='project_stages' then
    update public.checklist_templates set active=false,archived_at=coalesce(archived_at,now()),updated_at=now() where coalesce(stage_code,stage)=old_code;
    delete from public.project_stages where id=p_id;
  elsif p_kind='project_statuses' then delete from public.project_statuses where id=p_id;
  else delete from public.activity_statuses where id=p_id; end if;
  insert into public.history_entries(module,record_type,record_id,actor_user_id,action,description,metadata,source_table,source_id)
  values('settings','workflow_catalog',p_id::text,auth.uid(),'deleted','Catálogo de fluxo excluído.',jsonb_build_object('kind',p_kind,'code',old_code,'replacement',p_replacement_code,'migrated_records',used),p_kind,p_id::text||':delete:'||txid_current()::text)
  on conflict(source_table,source_id) where source_table is not null and source_id is not null do nothing;
end $$;

-- Limpa os modelos antigos somente na primeira aplicação, sem apagar snapshots já aplicados.
do $$
begin
  if not exists(select 1 from public.system_versions where version='3.0.12') then
    update public.checklist_templates set active=false,archived_at=coalesce(archived_at,now()),updated_at=now() where active or archived_at is null;
    insert into public.checklist_templates(name,description,stage_code,stage,project_type,active,version,created_by)
    select s.name||' — Checklist', 'Checklist padrão vinculado diretamente à etapa do Kanban.',s.code,s.code,null,true,1,auth.uid()
    from public.project_stages s
    where s.active and s.archived_at is null;
  else
    insert into public.checklist_templates(name,description,stage_code,stage,project_type,active,version,created_by)
    select s.name||' — Checklist', 'Checklist padrão vinculado diretamente à etapa do Kanban.',s.code,s.code,null,true,1,auth.uid()
    from public.project_stages s
    where s.active and s.archived_at is null
      and not exists(select 1 from public.checklist_templates t where t.stage_code=s.code and t.active and t.archived_at is null);
  end if;
end $$;

create unique index if not exists checklist_templates_one_active_per_stage_idx on public.checklist_templates(stage_code) where active and archived_at is null;

create or replace function public.list_stage_checklists()
returns table(stage_id uuid,stage_code text,stage_name text,stage_color text,stage_position integer,template_id uuid,items jsonb)
language sql stable security definer set search_path=public,pg_temp as $$
  select s.id,s.code,s.name,s.color,s.position,t.id,
    coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'template_id',i.template_id,'title',i.title,'section',i.section,'required',i.required,'position',i.position,'active',i.active) order by i.position,i.created_at) from public.checklist_template_items i where i.template_id=t.id),'[]'::jsonb)
  from public.project_stages s
  join public.checklist_templates t on t.stage_code=s.code and t.active and t.archived_at is null
  where s.active and s.archived_at is null and public.has_permission('checklists','view','own')
  order by s.position,s.name
$$;

create or replace function public.save_stage_checklist_item(p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare result_id uuid;target_id uuid:=nullif(p_payload->>'id','')::uuid;template_id uuid:=(p_payload->>'template_id')::uuid;
begin
  if not (public.has_permission('checklists','edit','own') or public.has_permission('checklists','create','own')) then raise exception 'Permissão insuficiente.'; end if;
  if not exists(select 1 from public.checklist_templates t join public.project_stages s on s.code=t.stage_code where t.id=template_id and t.active and t.archived_at is null and s.active and s.archived_at is null) then raise exception 'Checklist da etapa não está ativo.'; end if;
  insert into public.checklist_template_items(id,template_id,title,section,required,position,active,updated_at)
  values(coalesce(target_id,gen_random_uuid()),template_id,trim(p_payload->>'title'),nullif(trim(p_payload->>'section'),''),coalesce((p_payload->>'required')::boolean,true),coalesce((p_payload->>'position')::int,0),coalesce((p_payload->>'active')::boolean,true),now())
  on conflict(id) do update set title=excluded.title,section=excluded.section,required=excluded.required,position=excluded.position,active=excluded.active,updated_at=now()
  returning id into result_id;
  return result_id;
end $$;

create or replace function public.archive_stage_checklist_item(p_item_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.has_permission('checklists','edit','own') then raise exception 'Permissão insuficiente.'; end if;
  update public.checklist_template_items set active=false,updated_at=now() where id=p_item_id;
end $$;

create or replace function public.reorder_stage_checklist_items(p_items jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb;
begin
  if not public.has_permission('checklists','edit','own') then raise exception 'Permissão insuficiente.'; end if;
  for item in select * from jsonb_array_elements(p_items) loop update public.checklist_template_items set position=(item->>'position')::int,updated_at=now() where id=(item->>'id')::uuid; end loop;
end $$;

create or replace function public.copy_stage_checklist_item(p_item_id uuid,p_target_stage_code text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare target_template uuid;new_id uuid;
begin
  if not public.has_permission('checklists','create','own') then raise exception 'Permissão insuficiente.'; end if;
  select id into target_template from public.checklist_templates where stage_code=p_target_stage_code and active and archived_at is null limit 1;
  if target_template is null then raise exception 'Etapa de destino sem checklist ativo.'; end if;
  insert into public.checklist_template_items(template_id,title,section,required,position,active)
  select target_template,title,section,required,coalesce((select max(position)+10 from public.checklist_template_items where template_id=target_template),10),true from public.checklist_template_items where id=p_item_id returning id into new_id;
  return new_id;
end $$;

revoke all on function public.workflow_catalog_table(text) from public,anon;
revoke all on function public.workflow_catalog_usage(text,text) from public,anon;
revoke all on function public.list_workflow_catalog(text) from public,anon;
revoke all on function public.save_workflow_catalog(text,jsonb) from public,anon;
revoke all on function public.reorder_workflow_catalog(text,uuid[]) from public,anon;
revoke all on function public.set_workflow_catalog_active(text,uuid,boolean) from public,anon;
revoke all on function public.delete_workflow_catalog(text,uuid,text) from public,anon;
revoke all on function public.list_stage_checklists() from public,anon;
revoke all on function public.save_stage_checklist_item(jsonb) from public,anon;
revoke all on function public.archive_stage_checklist_item(uuid) from public,anon;
revoke all on function public.reorder_stage_checklist_items(jsonb) from public,anon;
revoke all on function public.copy_stage_checklist_item(uuid,text) from public,anon;
grant execute on function public.list_workflow_catalog(text),public.save_workflow_catalog(text,jsonb),public.reorder_workflow_catalog(text,uuid[]),public.set_workflow_catalog_active(text,uuid,boolean),public.delete_workflow_catalog(text,uuid,text),public.list_stage_checklists(),public.save_stage_checklist_item(jsonb),public.archive_stage_checklist_item(uuid),public.reorder_stage_checklist_items(jsonb),public.copy_stage_checklist_item(uuid,text) to authenticated;

insert into public.system_versions(version,notes,environment)
values('3.0.12','Etapa 11: fluxos dinâmicos sincronizados, exclusão segura, ordenação e checklists por etapa.','production')
on conflict(version) do update set notes=excluded.notes,environment=excluded.environment,released_at=now();

commit;
