-- Camilla Studio 3.0.8 — Etapa 07: Cadastro completo e página individual de clientes
-- Aplicar somente após a Etapa 06 (versão 3.0.7).
begin;

-- 0. Pré-condições
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.system_versions WHERE version='3.0.7') THEN
    RAISE EXCEPTION 'A Etapa 06 (versão 3.0.7) deve ser aplicada antes da Etapa 07.';
  END IF;
  IF to_regclass('public.clients') IS NULL OR to_regclass('public.projects') IS NULL OR to_regclass('public.project_activities') IS NULL THEN
    RAISE EXCEPTION 'Estruturas obrigatórias de Clientes, Projetos ou Atividades não foram encontradas.';
  END IF;
END $$;

-- 1. Funções imutáveis de normalização
create or replace function public.only_digits(value text)
returns text language sql immutable parallel safe as $$
  select nullif(regexp_replace(coalesce(value,''),'[^0-9]','','g'),'')
$$;

create or replace function public.normalize_email(value text)
returns text language sql immutable parallel safe as $$
  select nullif(lower(trim(coalesce(value,''))),'')
$$;

-- 2. Evolução aditiva de Clientes
alter table public.clients
  add column if not exists legal_name text,
  add column if not exists trade_name text,
  add column if not exists state_registration text,
  add column if not exists municipal_registration text,
  add column if not exists whatsapp text,
  add column if not exists website text,
  add column if not exists postal_code text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists neighborhood text,
  add column if not exists primary_contact_name text,
  add column if not exists primary_contact_role text,
  add column if not exists internal_responsible_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists source_code text,
  add column if not exists segment_code text,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists archived_by uuid references auth.users(id) on delete set null;

alter table public.calendar_events
  add column if not exists client_id uuid references public.clients(id) on delete restrict;
create index if not exists calendar_events_client_range_idx on public.calendar_events(client_id,starts_at) where client_id is not null and archived_at is null;

-- Homônimos passam a ser permitidos. CPF/CNPJ preenchidos permanecem únicos.
drop index if exists public.clients_name_unique_ci;
create index if not exists clients_name_search_idx on public.clients(lower(name));
create unique index if not exists clients_cpf_unique_norm on public.clients(public.only_digits(cpf)) where public.only_digits(cpf) is not null and archived_at is null;
create unique index if not exists clients_cnpj_unique_norm on public.clients(public.only_digits(cnpj)) where public.only_digits(cnpj) is not null and archived_at is null;
create index if not exists clients_responsible_idx on public.clients(internal_responsible_user_id) where archived_at is null;
create index if not exists clients_relationship_idx on public.clients(relationship_status,source_code,segment_code) where archived_at is null;

-- 3. Contatos, observações e pagamentos parciais
create table if not exists public.client_phones(
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  label text not null default 'Outro',
  phone text not null,
  normalized_phone text not null,
  is_primary boolean not null default false,
  is_whatsapp boolean not null default false,
  position integer not null default 0,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  check(length(normalized_phone) between 8 and 20)
);
create unique index if not exists client_phones_unique_active on public.client_phones(client_id,normalized_phone) where archived_at is null;
create unique index if not exists client_phones_one_primary on public.client_phones(client_id) where is_primary and archived_at is null;
create index if not exists client_phones_search_idx on public.client_phones(normalized_phone,client_id) where archived_at is null;

create table if not exists public.client_emails(
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  label text not null default 'Outro',
  email text not null,
  normalized_email text not null,
  is_primary boolean not null default false,
  position integer not null default 0,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  check(position>=0)
);
create unique index if not exists client_emails_unique_active on public.client_emails(client_id,normalized_email) where archived_at is null;
create unique index if not exists client_emails_one_primary on public.client_emails(client_id) where is_primary and archived_at is null;
create index if not exists client_emails_search_idx on public.client_emails(normalized_email,client_id) where archived_at is null;

create table if not exists public.client_notes(
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  note_type text not null default 'general',
  content text not null check(length(trim(content)) between 1 and 10000),
  important boolean not null default false,
  pinned_at timestamptz,
  pinned_by uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null
);
create index if not exists client_notes_client_timeline_idx on public.client_notes(client_id,pinned_at desc nulls last,occurred_at desc) where archived_at is null;
create index if not exists client_notes_type_idx on public.client_notes(client_id,note_type,occurred_at desc) where archived_at is null;

create table if not exists public.financial_entry_payments(
  id uuid primary key default gen_random_uuid(),
  financial_entry_id uuid not null references public.financial_entries(id) on delete restrict,
  amount numeric(14,2) not null check(amount>0),
  paid_at timestamptz not null default now(),
  payment_method text,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null
);
create index if not exists financial_entry_payments_entry_idx on public.financial_entry_payments(financial_entry_id,paid_at desc) where archived_at is null;

-- Migração de contatos legados, quando existirem.
insert into public.client_phones(client_id,label,phone,normalized_phone,is_primary,is_whatsapp,position,created_by)
select c.id,'Principal',c.phone,public.only_digits(c.phone),true,(public.only_digits(c.phone)=public.only_digits(c.whatsapp)),0,c.created_by
from public.clients c
where public.only_digits(c.phone) is not null
on conflict(client_id,normalized_phone) where archived_at is null do nothing;

insert into public.client_emails(client_id,label,email,normalized_email,is_primary,position,created_by)
select c.id,'Principal',c.email,public.normalize_email(c.email),true,0,c.created_by
from public.clients c
where public.normalize_email(c.email) is not null
on conflict(client_id,normalized_email) where archived_at is null do nothing;

-- 4. Proteção dos vínculos contra exclusão definitiva
alter table public.projects drop constraint if exists projects_client_id_fkey;
alter table public.projects add constraint projects_client_id_fkey foreign key(client_id) references public.clients(id) on delete restrict;
alter table public.project_activities drop constraint if exists project_activities_client_id_fkey;
alter table public.project_activities add constraint project_activities_client_id_fkey foreign key(client_id) references public.clients(id) on delete restrict;
alter table public.project_files drop constraint if exists project_files_client_id_fkey;
alter table public.project_files add constraint project_files_client_id_fkey foreign key(client_id) references public.clients(id) on delete restrict;
alter table public.financial_entries drop constraint if exists financial_entries_client_id_fkey;
alter table public.financial_entries add constraint financial_entries_client_id_fkey foreign key(client_id) references public.clients(id) on delete restrict;

-- 5. Catálogos configuráveis
insert into public.system_categories(module,code,name,color,active,position) values
('client_relationship_status','active','Ativo','#52705c',true,10),
('client_relationship_status','prospect','Prospect','#8b6a3d',true,20),
('client_relationship_status','paused','Pausado','#8e7c75',true,30),
('client_relationship_status','inactive','Inativo','#765044',true,40),
('client_relationship_status','lost','Perdido','#8f4239',true,50),
('client_source','referral','Indicação','#52705c',true,10),
('client_source','instagram','Instagram','#9b6352',true,20),
('client_source','website','Site','#765044',true,30),
('client_source','returning','Cliente recorrente','#8b6a3d',true,40),
('client_source','other','Outro','#8e7c75',true,90),
('client_segment','residential','Residencial','#9b6352',true,10),
('client_segment','commercial','Comercial','#52705c',true,20),
('client_segment','corporate','Corporativo','#765044',true,30),
('client_segment','other','Outro','#8e7c75',true,90),
('client_note_type','general','Observação geral','#8e7c75',true,10),
('client_note_type','contact','Contato','#52705c',true,20),
('client_note_type','commercial','Comercial','#9b6352',true,30),
('client_note_type','technical','Técnica','#765044',true,40),
('client_note_type','financial','Financeira','#8b6a3d',true,50),
('client_note_type','document','Documento','#8e7c75',true,60),
('client_note_type','alert','Alerta','#8f4239',true,70),
('client_file_category','contract','Contrato','#52705c',true,10),
('client_file_category','proposal','Proposta','#9b6352',true,20),
('client_file_category','tax_document','Documento fiscal','#8b6a3d',true,30),
('client_file_category','registration','Documento cadastral','#765044',true,40),
('client_file_category','reference','Referência','#8e7c75',true,50),
('client_file_category','image','Imagem','#9b6352',true,60),
('client_file_category','google_drive','Google Drive','#52705c',true,70),
('client_file_category','other','Outro','#8e7c75',true,90)
on conflict(module,code) do update set name=excluded.name,color=excluded.color,active=excluded.active,position=excluded.position,archived_at=null,updated_at=now();

-- 6. Permissões
insert into public.permission_catalog(module,action,module_label,action_label,supports_scope,position) values
('clients','view_financial','Clientes','Visualizar financeiro do cliente',true,72),
('clients','manage_notes','Clientes','Gerenciar observações',true,73),
('clients','manage_contacts','Clientes','Gerenciar contatos',true,75)
on conflict(module,action) do update set module_label=excluded.module_label,action_label=excluded.action_label,supports_scope=excluded.supports_scope,position=excluded.position;

insert into public.profile_permissions(profile_id,permission_profile_id,module,action,allowed,scope)
select pp.profile_id,pp.permission_profile_id,'clients',new_action,pp.allowed,pp.scope
from public.profile_permissions pp
cross join (values('manage_notes'),('manage_contacts')) actions(new_action)
where pp.module='clients' and pp.action='edit'
on conflict(profile_id,module,action) do update set allowed=excluded.allowed,scope=excluded.scope,permission_profile_id=excluded.permission_profile_id;

insert into public.profile_permissions(profile_id,permission_profile_id,module,action,allowed,scope)
select pp.profile_id,pp.permission_profile_id,'clients','view_financial',pp.allowed,pp.scope
from public.profile_permissions pp
where pp.module='finance_professional' and pp.action='view_values'
on conflict(profile_id,module,action) do update set allowed=excluded.allowed,scope=excluded.scope,permission_profile_id=excluded.permission_profile_id;

-- 7. Autorização integrada
create or replace function public.can_access_client(target_client_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.current_user_access_valid() and exists(select 1 from public.clients c where c.id=target_client_id) and (
    public.has_permission('clients','view','all') or
    exists(select 1 from public.clients c where c.id=target_client_id and (c.created_by=auth.uid() or c.internal_responsible_user_id=auth.uid())) or
    exists(select 1 from public.projects p where p.client_id=target_client_id and public.can_access_project(p.id)) or
    exists(select 1 from public.project_activities a where a.client_id=target_client_id and a.deleted_at is null and (a.created_by=auth.uid() or a.responsible_user_id=auth.uid() or exists(select 1 from public.activity_participants ap where ap.activity_id=a.id and ap.user_id=auth.uid())))
  )
$$;

create or replace function public.can_edit_client(target_client_id uuid)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare scope_value text; client_row public.clients%rowtype;
begin
  if not public.current_user_access_valid() then return false; end if;
  select * into client_row from public.clients where id=target_client_id;
  if not found then return false; end if;
  scope_value:=public.permission_scope('clients','edit');
  if scope_value='all' then return true; end if;
  if scope_value='own' and client_row.created_by=auth.uid() then return true; end if;
  if scope_value in('assigned','team') and (client_row.internal_responsible_user_id=auth.uid() or public.can_access_client(target_client_id)) then return true; end if;
  return false;
end $$;

create or replace function public.can_view_client_financial(target_client_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.can_access_client(target_client_id)
    and public.has_permission('clients','view_financial','own')
    and public.has_permission('finance_professional','view','own')
    and public.has_permission('finance_professional','view_values','own')
$$;

create or replace function public.can_access_calendar_event(target_event_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select public.current_user_access_valid() and exists(
  select 1 from public.calendar_events e where e.id=target_event_id and e.archived_at is null and (
   public.has_permission('agenda','view','all') or e.created_by=auth.uid() or e.assigned_user_id=auth.uid() or e.responsible_user_id=auth.uid() or
   (e.activity_id is not null and public.can_access_activity(e.activity_id)) or
   (e.project_id is not null and public.can_access_project(e.project_id)) or
   (e.client_id is not null and public.can_access_client(e.client_id))
  )
 )
$$;

create or replace function public.can_access_linked_file(p_id uuid,p_write boolean default false)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare f public.project_files%rowtype; env text; linked boolean:=false; allowed boolean:=true;
begin
  select * into f from public.project_files where id=p_id;
  if not found or not public.current_user_access_valid() then return false; end if;
  if not p_write then
    if f.project_id is not null and public.can_access_project(f.project_id) then return true; end if;
    if f.client_id is not null and public.can_access_client(f.client_id) then return true; end if;
    if f.activity_id is not null and public.can_access_activity(f.activity_id) then return true; end if;
    if f.financial_entry_id is not null then select environment into env from public.financial_entries where id=f.financial_entry_id; if public.can_view_finance(env) then return true; end if; end if;
    return false;
  end if;
  if f.project_id is not null then linked:=true;allowed:=allowed and public.can_edit_project(f.project_id);end if;
  if f.client_id is not null then linked:=true;allowed:=allowed and public.can_edit_client(f.client_id);end if;
  if f.activity_id is not null then linked:=true;allowed:=allowed and public.can_edit_activity(f.activity_id);end if;
  if f.financial_entry_id is not null then
    linked:=true;select environment into env from public.financial_entries where id=f.financial_entry_id;
    allowed:=allowed and public.can_view_finance(env) and public.has_permission(case when env='personal' then 'finance_personal' else 'finance_professional' end,'edit','own');
  end if;
  return linked and allowed;
end $$;

create or replace function public.can_access_history_entry(p_id uuid)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare row_data public.history_entries%rowtype; kind_value text; environment_value text; finance_module text; client_value uuid;
begin
  select * into row_data from public.history_entries where id=p_id;
  if not found or not public.current_user_access_valid() then return false; end if;
  client_value:=public.safe_uuid(coalesce(row_data.metadata->>'client_id',row_data.new_value->>'client_id',row_data.old_value->>'client_id'));
  if row_data.module='comments' then
    kind_value:=coalesce(row_data.new_value->>'comment_kind',row_data.old_value->>'comment_kind',row_data.metadata->>'kind','comment');
    return row_data.project_id is not null and public.can_access_project(row_data.project_id) and (kind_value<>'internal_note' or public.has_permission('comments','view_internal','own'));
  end if;
  if row_data.module='files' then return public.can_access_linked_file(public.safe_uuid(row_data.record_id),false); end if;
  if row_data.module='finance' then
    environment_value:=coalesce(row_data.metadata->>'environment',row_data.new_value->>'environment',row_data.old_value->>'environment','professional');
    finance_module:=case when environment_value='personal' then 'finance_personal' else 'finance_professional' end;
    return public.can_view_finance(environment_value)
      and public.has_permission(finance_module,'view_values','own')
      and (client_value is null or public.can_access_client(client_value));
  end if;
  if row_data.module='client_notes' then
    kind_value:=coalesce(row_data.new_value->>'note_type',row_data.old_value->>'note_type','general');
    client_value:=coalesce(client_value,public.safe_uuid(row_data.record_id));
    return client_value is not null and public.can_access_client(client_value)
      and (kind_value<>'financial' or public.can_view_client_financial(client_value));
  end if;
  if row_data.module in('clients','client_contacts') then return public.can_access_client(coalesce(client_value,public.safe_uuid(row_data.record_id))); end if;
  if row_data.module='activities' then return public.can_access_activity(public.safe_uuid(row_data.record_id)); end if;
  if row_data.module='agenda' then return public.can_access_calendar_event(public.safe_uuid(row_data.record_id)); end if;
  if row_data.module in('users','permissions','settings','security') then return public.has_permission('security','view','own') or public.has_permission('settings','manage_settings','own'); end if;
  if row_data.project_id is not null then return public.can_access_project(row_data.project_id); end if;
  if client_value is not null then return public.can_access_client(client_value); end if;
  return false;
exception when others then return false;
end $$;

-- 8. RLS
alter table public.client_phones enable row level security;
alter table public.client_emails enable row level security;
alter table public.client_notes enable row level security;
alter table public.financial_entry_payments enable row level security;

drop policy if exists client_phones_select_scope on public.client_phones;
create policy client_phones_select_scope on public.client_phones for select to authenticated using(public.can_access_client(client_id));
drop policy if exists client_phones_insert_scope on public.client_phones;
create policy client_phones_insert_scope on public.client_phones for insert to authenticated with check(public.can_edit_client(client_id) and public.has_permission('clients','manage_contacts','own'));
drop policy if exists client_phones_update_scope on public.client_phones;
create policy client_phones_update_scope on public.client_phones for update to authenticated using(public.can_edit_client(client_id) and public.has_permission('clients','manage_contacts','own')) with check(public.can_edit_client(client_id) and public.has_permission('clients','manage_contacts','own'));
drop policy if exists client_phones_delete_scope on public.client_phones;
create policy client_phones_delete_scope on public.client_phones for delete to authenticated using(false);

drop policy if exists client_emails_select_scope on public.client_emails;
create policy client_emails_select_scope on public.client_emails for select to authenticated using(public.can_access_client(client_id));
drop policy if exists client_emails_insert_scope on public.client_emails;
create policy client_emails_insert_scope on public.client_emails for insert to authenticated with check(public.can_edit_client(client_id) and public.has_permission('clients','manage_contacts','own'));
drop policy if exists client_emails_update_scope on public.client_emails;
create policy client_emails_update_scope on public.client_emails for update to authenticated using(public.can_edit_client(client_id) and public.has_permission('clients','manage_contacts','own')) with check(public.can_edit_client(client_id) and public.has_permission('clients','manage_contacts','own'));
drop policy if exists client_emails_delete_scope on public.client_emails;
create policy client_emails_delete_scope on public.client_emails for delete to authenticated using(false);

drop policy if exists client_notes_select_scope on public.client_notes;
create policy client_notes_select_scope on public.client_notes for select to authenticated using(public.can_access_client(client_id) and (note_type<>'financial' or public.can_view_client_financial(client_id)));
drop policy if exists client_notes_insert_scope on public.client_notes;
create policy client_notes_insert_scope on public.client_notes for insert to authenticated with check(public.can_edit_client(client_id) and public.has_permission('clients','manage_notes','own') and (note_type<>'financial' or public.can_view_client_financial(client_id)));
drop policy if exists client_notes_update_scope on public.client_notes;
create policy client_notes_update_scope on public.client_notes for update to authenticated using(public.can_edit_client(client_id) and public.has_permission('clients','manage_notes','own') and (note_type<>'financial' or public.can_view_client_financial(client_id))) with check(public.can_edit_client(client_id) and public.has_permission('clients','manage_notes','own') and (note_type<>'financial' or public.can_view_client_financial(client_id)));
drop policy if exists client_notes_delete_scope on public.client_notes;
create policy client_notes_delete_scope on public.client_notes for delete to authenticated using(false);

drop policy if exists financial_entry_payments_select_scope on public.financial_entry_payments;
create policy financial_entry_payments_select_scope on public.financial_entry_payments for select to authenticated using(exists(select 1 from public.financial_entries f where f.id=financial_entry_id and f.environment='professional' and public.can_view_finance(f.environment)));
drop policy if exists financial_entry_payments_insert_scope on public.financial_entry_payments;
create policy financial_entry_payments_insert_scope on public.financial_entry_payments for insert to authenticated with check(exists(select 1 from public.financial_entries f where f.id=financial_entry_id and f.environment='professional' and public.has_permission('finance_professional','settle_finance','own')));
drop policy if exists financial_entry_payments_update_scope on public.financial_entry_payments;
create policy financial_entry_payments_update_scope on public.financial_entry_payments for update to authenticated using(exists(select 1 from public.financial_entries f where f.id=financial_entry_id and f.environment='professional' and public.has_permission('finance_professional','edit','own'))) with check(exists(select 1 from public.financial_entries f where f.id=financial_entry_id and f.environment='professional' and public.has_permission('finance_professional','edit','own')));
drop policy if exists financial_entry_payments_delete_scope on public.financial_entry_payments;
create policy financial_entry_payments_delete_scope on public.financial_entry_payments for delete to authenticated using(false);

-- Clientes: exclusão direta só é possível se não houver vínculos; a interface usa arquivamento.
drop policy if exists clients_delete_scope on public.clients;
create policy clients_delete_scope on public.clients for delete to authenticated using(public.has_permission('clients','delete','all') and not exists(select 1 from public.projects p where p.client_id=clients.id) and not exists(select 1 from public.project_activities a where a.client_id=clients.id) and not exists(select 1 from public.project_files f where f.client_id=clients.id) and not exists(select 1 from public.financial_entries fe where fe.client_id=clients.id) and not exists(select 1 from public.calendar_events ce where ce.client_id=clients.id));
drop policy if exists clients_update_scope on public.clients;
create policy clients_update_scope on public.clients for update to authenticated using(public.can_edit_client(id)) with check(public.can_edit_client(id));

-- Arquivos vinculados diretamente a clientes exigem acesso de edição ao cliente específico.
drop policy if exists linked_files_insert_scope on public.project_files;
create policy linked_files_insert_scope on public.project_files for insert to authenticated with check(
  public.has_permission('files','add_file','own')
  and num_nonnulls(project_id,client_id,activity_id,financial_entry_id)>0
  and (project_id is null or public.can_edit_project(project_id))
  and (client_id is null or public.can_edit_client(client_id))
  and (activity_id is null or public.can_edit_activity(activity_id))
  and (financial_entry_id is null or exists(select 1 from public.financial_entries f where f.id=financial_entry_id and public.can_view_finance(f.environment)))
);

-- 9. Sincronização e auditoria
create or replace function public.sync_client_fields()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  new.name:=trim(new.name);
  if new.name='' then raise exception 'O nome do cliente é obrigatório.'; end if;
  if new.person_type is not null and new.person_type not in('person','company') then raise exception 'Tipo de pessoa inválido.'; end if;
  new.cpf:=nullif(trim(coalesce(new.cpf,'')),'');
  new.cnpj:=nullif(trim(coalesce(new.cnpj,'')),'');
  new.document:=coalesce(new.cnpj,new.cpf,new.document);
  new.state:=upper(nullif(trim(coalesce(new.state,'')),''));
  new.updated_at:=now();
  new.updated_by:=coalesce(auth.uid(),new.updated_by);
  return new;
end $$;
drop trigger if exists clients_sync_fields on public.clients;
create trigger clients_sync_fields before insert or update on public.clients for each row execute function public.sync_client_fields();

create or replace function public.sync_client_phone_row()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin new.updated_at:=now();new.updated_by:=coalesce(auth.uid(),new.updated_by);new.normalized_phone:=public.only_digits(new.phone);return new;end $$;
drop trigger if exists client_phones_sync_row on public.client_phones;
create trigger client_phones_sync_row before insert or update on public.client_phones for each row execute function public.sync_client_phone_row();

create or replace function public.sync_client_email_row()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin new.updated_at:=now();new.updated_by:=coalesce(auth.uid(),new.updated_by);new.normalized_email:=public.normalize_email(new.email);new.email:=trim(new.email);return new;end $$;
drop trigger if exists client_emails_sync_row on public.client_emails;
create trigger client_emails_sync_row before insert or update on public.client_emails for each row execute function public.sync_client_email_row();

create or replace function public.refresh_client_primary_contact()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare row_value jsonb;cid uuid;
begin
  row_value:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;cid:=public.safe_uuid(row_value->>'client_id');
  update public.clients c set
    phone=(select p.phone from public.client_phones p where p.client_id=cid and p.archived_at is null order by p.is_primary desc,p.position,p.created_at limit 1),
    whatsapp=(select p.phone from public.client_phones p where p.client_id=cid and p.archived_at is null and p.is_whatsapp order by p.is_primary desc,p.position,p.created_at limit 1),
    email=(select e.email from public.client_emails e where e.client_id=cid and e.archived_at is null order by e.is_primary desc,e.position,e.created_at limit 1),
    updated_at=now(),updated_by=coalesce(auth.uid(),c.updated_by)
  where c.id=cid;
  if tg_op='DELETE' then return old;else return new;end if;
end $$;
drop trigger if exists client_phones_refresh_primary on public.client_phones;
create trigger client_phones_refresh_primary after insert or update or delete on public.client_phones for each row execute function public.refresh_client_primary_contact();
drop trigger if exists client_emails_refresh_primary on public.client_emails;
create trigger client_emails_refresh_primary after insert or update or delete on public.client_emails for each row execute function public.refresh_client_primary_contact();

create or replace function public.sync_client_note_fields()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin new.updated_at:=now();new.updated_by:=coalesce(auth.uid(),new.updated_by);return new;end $$;
drop trigger if exists client_notes_sync_fields on public.client_notes;
create trigger client_notes_sync_fields before insert or update on public.client_notes for each row execute function public.sync_client_note_fields();

create or replace function public.log_client_central_history()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare row_value jsonb;record_value text;
begin
 row_value:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;record_value:=row_value->>'id';
 insert into public.history_entries(module,record_type,record_id,actor_user_id,action,old_value,new_value,description,source_table,source_id,metadata)
 values('clients','client',record_value,auth.uid(),lower(tg_op),case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end,case tg_op when 'INSERT' then 'Cliente criado.' when 'UPDATE' then case when old.archived_at is null and new.archived_at is not null then 'Cliente arquivado.' when old.archived_at is not null and new.archived_at is null then 'Cliente reativado.' else 'Dados do cliente alterados.' end else 'Cliente removido.' end,'clients',record_value||':'||txid_current()::text||':'||gen_random_uuid()::text,jsonb_build_object('client_id',record_value));
 if tg_op='DELETE' then return old;else return new;end if;
end $$;
drop trigger if exists clients_history_central on public.clients;
create trigger clients_history_central after insert or update or delete on public.clients for each row execute function public.log_client_central_history();

create or replace function public.log_client_related_history()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare row_value jsonb;client_value text;record_value text;description_value text;
begin
 row_value:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;client_value:=row_value->>'client_id';record_value:=row_value->>'id';
 description_value:=case tg_table_name when 'client_notes' then case tg_op when 'INSERT' then 'Observação do cliente criada.' when 'UPDATE' then 'Observação do cliente alterada.' else 'Observação do cliente removida.' end when 'client_phones' then 'Telefone do cliente alterado.' else 'E-mail do cliente alterado.' end;
 insert into public.history_entries(module,record_type,record_id,actor_user_id,action,old_value,new_value,description,source_table,source_id,metadata)
 values(case when tg_table_name='client_notes' then 'client_notes' else 'client_contacts' end,tg_table_name,record_value,auth.uid(),lower(tg_op),case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end,description_value,tg_table_name,record_value||':'||txid_current()::text||':'||gen_random_uuid()::text,jsonb_build_object('client_id',client_value));
 if tg_op='DELETE' then return old;else return new;end if;
end $$;
drop trigger if exists client_phones_history on public.client_phones;
create trigger client_phones_history after insert or update or delete on public.client_phones for each row execute function public.log_client_related_history();
drop trigger if exists client_emails_history on public.client_emails;
create trigger client_emails_history after insert or update or delete on public.client_emails for each row execute function public.log_client_related_history();
drop trigger if exists client_notes_history on public.client_notes;
create trigger client_notes_history after insert or update or delete on public.client_notes for each row execute function public.log_client_related_history();

-- 10. Operações transacionais
create or replace function public.save_client(p_client_id uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid:=p_client_id;v_name text:=trim(coalesce(p_payload->>'name',''));v_person text:=coalesce(nullif(p_payload->>'person_type',''),'person');v_cpf text:=nullif(trim(coalesce(p_payload->>'cpf','')),'');v_cnpj text:=nullif(trim(coalesce(p_payload->>'cnpj','')),'');item jsonb;item_id uuid;keep_phone_ids uuid[]:='{}';keep_email_ids uuid[]:='{}';
begin
 if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
 if v_name='' then raise exception 'O nome do cliente é obrigatório.'; end if;
 if v_person not in('person','company') then raise exception 'Tipo de pessoa inválido.'; end if;
 if v_cpf is not null and exists(select 1 from public.clients c where public.only_digits(c.cpf)=public.only_digits(v_cpf) and c.id is distinct from v_id and c.archived_at is null) then raise exception 'Já existe um cliente ativo com este CPF.'; end if;
 if v_cnpj is not null and exists(select 1 from public.clients c where public.only_digits(c.cnpj)=public.only_digits(v_cnpj) and c.id is distinct from v_id and c.archived_at is null) then raise exception 'Já existe um cliente ativo com este CNPJ.'; end if;
 if v_id is null then
  if not public.has_permission('clients','create','own') then raise exception 'Sem permissão para criar clientes.'; end if;
  insert into public.clients(name,legal_name,trade_name,person_type,cpf,cnpj,state_registration,municipal_registration,website,postal_code,address,address_number,address_complement,neighborhood,city,state,primary_contact_name,primary_contact_role,internal_responsible_user_id,source_code,segment_code,relationship_status,created_by,updated_by)
  values(v_name,nullif(trim(coalesce(p_payload->>'legal_name','')),''),nullif(trim(coalesce(p_payload->>'trade_name','')),''),v_person,v_cpf,v_cnpj,nullif(trim(coalesce(p_payload->>'state_registration','')),''),nullif(trim(coalesce(p_payload->>'municipal_registration','')),''),nullif(trim(coalesce(p_payload->>'website','')),''),nullif(trim(coalesce(p_payload->>'postal_code','')),''),nullif(trim(coalesce(p_payload->>'address','')),''),nullif(trim(coalesce(p_payload->>'address_number','')),''),nullif(trim(coalesce(p_payload->>'address_complement','')),''),nullif(trim(coalesce(p_payload->>'neighborhood','')),''),nullif(trim(coalesce(p_payload->>'city','')),''),nullif(trim(coalesce(p_payload->>'state','')),''),nullif(trim(coalesce(p_payload->>'primary_contact_name','')),''),nullif(trim(coalesce(p_payload->>'primary_contact_role','')),''),public.safe_uuid(p_payload->>'internal_responsible_user_id'),nullif(p_payload->>'source_code',''),nullif(p_payload->>'segment_code',''),coalesce(nullif(p_payload->>'relationship_status',''),'active'),auth.uid(),auth.uid()) returning id into v_id;
 else
  if not public.can_edit_client(v_id) then raise exception 'Sem permissão para editar o cliente.'; end if;
  update public.clients set name=v_name,legal_name=nullif(trim(coalesce(p_payload->>'legal_name','')),''),trade_name=nullif(trim(coalesce(p_payload->>'trade_name','')),''),person_type=v_person,cpf=v_cpf,cnpj=v_cnpj,state_registration=nullif(trim(coalesce(p_payload->>'state_registration','')),''),municipal_registration=nullif(trim(coalesce(p_payload->>'municipal_registration','')),''),website=nullif(trim(coalesce(p_payload->>'website','')),''),postal_code=nullif(trim(coalesce(p_payload->>'postal_code','')),''),address=nullif(trim(coalesce(p_payload->>'address','')),''),address_number=nullif(trim(coalesce(p_payload->>'address_number','')),''),address_complement=nullif(trim(coalesce(p_payload->>'address_complement','')),''),neighborhood=nullif(trim(coalesce(p_payload->>'neighborhood','')),''),city=nullif(trim(coalesce(p_payload->>'city','')),''),state=nullif(trim(coalesce(p_payload->>'state','')),''),primary_contact_name=nullif(trim(coalesce(p_payload->>'primary_contact_name','')),''),primary_contact_role=nullif(trim(coalesce(p_payload->>'primary_contact_role','')),''),internal_responsible_user_id=public.safe_uuid(p_payload->>'internal_responsible_user_id'),source_code=nullif(p_payload->>'source_code',''),segment_code=nullif(p_payload->>'segment_code',''),relationship_status=coalesce(nullif(p_payload->>'relationship_status',''),relationship_status),updated_by=auth.uid() where id=v_id;
 end if;
 if public.has_permission('clients','manage_contacts','own') or public.can_edit_client(v_id) then
  update public.client_phones set is_primary=false,updated_by=auth.uid() where client_id=v_id and archived_at is null;
  for item in select value from jsonb_array_elements(coalesce(p_payload->'phones','[]'::jsonb)) loop
   if public.only_digits(item->>'phone') is null then continue; end if;
   item_id:=public.safe_uuid(item->>'id');if item_id is null then item_id:=gen_random_uuid();end if;keep_phone_ids:=array_append(keep_phone_ids,item_id);
   insert into public.client_phones(id,client_id,label,phone,normalized_phone,is_primary,is_whatsapp,position,created_by,updated_by,archived_at,archived_by)
   values(item_id,v_id,coalesce(nullif(trim(item->>'label'),''),'Outro'),trim(item->>'phone'),public.only_digits(item->>'phone'),coalesce((item->>'is_primary')::boolean,false),coalesce((item->>'is_whatsapp')::boolean,false),coalesce((item->>'position')::integer,0),auth.uid(),auth.uid(),null,null)
   on conflict(id) do update set label=excluded.label,phone=excluded.phone,normalized_phone=excluded.normalized_phone,is_primary=excluded.is_primary,is_whatsapp=excluded.is_whatsapp,position=excluded.position,updated_by=auth.uid(),archived_at=null,archived_by=null;
  end loop;
  update public.client_phones set archived_at=now(),archived_by=auth.uid(),is_primary=false where client_id=v_id and archived_at is null and not(id=any(keep_phone_ids));
  update public.client_emails set is_primary=false,updated_by=auth.uid() where client_id=v_id and archived_at is null;
  for item in select value from jsonb_array_elements(coalesce(p_payload->'emails','[]'::jsonb)) loop
   if public.normalize_email(item->>'email') is null then continue; end if;
   item_id:=public.safe_uuid(item->>'id');if item_id is null then item_id:=gen_random_uuid();end if;keep_email_ids:=array_append(keep_email_ids,item_id);
   insert into public.client_emails(id,client_id,label,email,normalized_email,is_primary,position,created_by,updated_by,archived_at,archived_by)
   values(item_id,v_id,coalesce(nullif(trim(item->>'label'),''),'Outro'),trim(item->>'email'),public.normalize_email(item->>'email'),coalesce((item->>'is_primary')::boolean,false),coalesce((item->>'position')::integer,0),auth.uid(),auth.uid(),null,null)
   on conflict(id) do update set label=excluded.label,email=excluded.email,normalized_email=excluded.normalized_email,is_primary=excluded.is_primary,position=excluded.position,updated_by=auth.uid(),archived_at=null,archived_by=null;
  end loop;
  update public.client_emails set archived_at=now(),archived_by=auth.uid(),is_primary=false where client_id=v_id and archived_at is null and not(id=any(keep_email_ids));
 end if;
 update public.clients c set phone=(select p.phone from public.client_phones p where p.client_id=v_id and p.archived_at is null order by p.is_primary desc,p.position limit 1),whatsapp=(select p.phone from public.client_phones p where p.client_id=v_id and p.archived_at is null and p.is_whatsapp order by p.is_primary desc,p.position limit 1),email=(select e.email from public.client_emails e where e.client_id=v_id and e.archived_at is null order by e.is_primary desc,e.position limit 1),updated_at=now(),updated_by=auth.uid() where c.id=v_id;
 return v_id;
end $$;

create or replace function public.archive_client(p_client_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin if auth.uid() is null or not public.can_edit_client(p_client_id) or not public.has_permission('clients','archive','own') then raise exception 'Sem permissão para arquivar.';end if;update public.clients set archived_at=coalesce(archived_at,now()),archived_by=auth.uid(),relationship_status=case when relationship_status='active' then 'inactive' else relationship_status end,updated_by=auth.uid() where id=p_client_id;end $$;

create or replace function public.reactivate_client(p_client_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin if auth.uid() is null or not public.has_permission('clients','reactivate','own') then raise exception 'Sem permissão para reativar.';end if;update public.clients set archived_at=null,archived_by=null,relationship_status=case when relationship_status='inactive' then 'active' else relationship_status end,updated_by=auth.uid() where id=p_client_id and public.can_access_client(id);if not found then raise exception 'Cliente não encontrado ou sem acesso.';end if;end $$;

create or replace function public.delete_client_safely(p_client_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare links integer;
begin
 if auth.uid() is null or not public.has_permission('clients','delete','all') then raise exception 'Sem permissão para excluir.';end if;
 select (select count(*) from public.projects where client_id=p_client_id)+(select count(*) from public.project_activities where client_id=p_client_id)+(select count(*) from public.project_files where client_id=p_client_id)+(select count(*) from public.financial_entries where client_id=p_client_id)+(select count(*) from public.calendar_events where client_id=p_client_id) into links;
 if links>0 then raise exception 'O cliente possui vínculos e não pode ser excluído definitivamente. Arquive-o.';end if;
 delete from public.client_phones where client_id=p_client_id;delete from public.client_emails where client_id=p_client_id;delete from public.client_notes where client_id=p_client_id;delete from public.clients where id=p_client_id;
end $$;

create or replace function public.save_client_note(p_note_id uuid,p_client_id uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid:=p_note_id;v_type text:=coalesce(nullif(p_payload->>'note_type',''),'general');
begin
 if auth.uid() is null or not public.can_edit_client(p_client_id) or not public.has_permission('clients','manage_notes','own') then raise exception 'Sem permissão para registrar observações.';end if;
 if v_type='financial' and not public.can_view_client_financial(p_client_id) then raise exception 'Sem permissão para observações financeiras.';end if;
 if trim(coalesce(p_payload->>'content',''))='' then raise exception 'A observação não pode ficar vazia.';end if;
 if v_id is null then insert into public.client_notes(client_id,note_type,content,important,occurred_at,created_by,updated_by) values(p_client_id,v_type,trim(p_payload->>'content'),coalesce((p_payload->>'important')::boolean,false),coalesce(nullif(p_payload->>'occurred_at','')::timestamptz,now()),auth.uid(),auth.uid()) returning id into v_id;
 else update public.client_notes set note_type=v_type,content=trim(p_payload->>'content'),important=coalesce((p_payload->>'important')::boolean,false),occurred_at=coalesce(nullif(p_payload->>'occurred_at','')::timestamptz,occurred_at),updated_by=auth.uid() where id=v_id and client_id=p_client_id and archived_at is null;if not found then raise exception 'Observação não encontrada.';end if;end if;
 return v_id;
end $$;

create or replace function public.archive_client_note(p_note_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare cid uuid;begin select client_id into cid from public.client_notes where id=p_note_id;if cid is null or not public.can_edit_client(cid) or not public.has_permission('clients','manage_notes','own') then raise exception 'Sem permissão.';end if;update public.client_notes set archived_at=now(),archived_by=auth.uid(),updated_by=auth.uid() where id=p_note_id;end $$;

create or replace function public.pin_client_note(p_note_id uuid,p_pinned boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare cid uuid;begin select client_id into cid from public.client_notes where id=p_note_id;if cid is null or not public.can_edit_client(cid) or not public.has_permission('clients','manage_notes','own') then raise exception 'Sem permissão.';end if;update public.client_notes set pinned_at=case when p_pinned then now() else null end,pinned_by=case when p_pinned then auth.uid() else null end,updated_by=auth.uid() where id=p_note_id and archived_at is null;end $$;

-- 11. Agenda enriquecida com Cliente
create or replace view public.agenda_items with(security_invoker=true) as
select
 'event:'||e.id::text as item_key,'event'::text as source_type,e.id as source_id,e.title,e.notes as description,
 e.starts_at,coalesce(e.ends_at,e.starts_at+case when e.all_day then interval '1 day' else interval '1 hour' end) as ends_at,
 e.all_day,e.status,e.event_type as item_type,e.project_id,p.name as project_name,e.activity_id,
 coalesce(e.responsible_user_id,e.assigned_user_id) as responsible_user_id,pr.name as responsible_name,e.location,
 case e.event_type when 'meeting' then '#9b6352' when 'visit' then '#52705c' when 'presentation' then '#765044' when 'personal' then '#8b6a3d' else '#8e7c75' end as color,
 (public.has_permission('agenda','edit','assigned') and public.can_access_calendar_event(e.id)) as editable,e.created_at,e.updated_at,
 coalesce(e.client_id,p.client_id,a.client_id) as client_id,cl.name as client_name
from public.calendar_events e
left join public.projects p on p.id=e.project_id
left join public.project_activities a on a.id=e.activity_id
left join public.clients cl on cl.id=coalesce(e.client_id,p.client_id,a.client_id)
left join public.profiles pr on pr.id=coalesce(e.responsible_user_id,e.assigned_user_id)
where e.archived_at is null
union all
select
 'activity:'||a.id::text,'activity'::text,a.id,a.title,a.description,coalesce(a.starts_at,a.due_at),
 case when a.all_day then coalesce(a.due_at,a.starts_at)+interval '1 day' when a.starts_at is not null and a.due_at is not null then greatest(a.due_at,a.starts_at+interval '15 minutes') when a.due_at is not null then a.due_at+interval '15 minutes' else a.starts_at+interval '1 hour' end,
 a.all_day,a.status,case when a.parent_id is null then 'activity' else 'subactivity' end,a.project_id,p.name,a.id,
 a.responsible_user_id,coalesce(a.responsible_name,pr.name),null::text,coalesce(s.color,'#9b6352'),public.can_edit_activity(a.id),a.created_at,a.updated_at,
 coalesce(a.client_id,p.client_id),cl.name
from public.project_activities a
left join public.projects p on p.id=a.project_id
left join public.clients cl on cl.id=coalesce(a.client_id,p.client_id)
left join public.profiles pr on pr.id=a.responsible_user_id
left join public.activity_statuses s on s.code=a.status
where a.deleted_at is null and a.archived_at is null and coalesce(a.starts_at,a.due_at) is not null
union all
select
 'project_date:'||d.id::text,'project_date'::text,d.id,d.title,d.description,d.starts_at,
 coalesce(d.ends_at,d.starts_at+case when d.all_day then interval '1 day' else interval '1 hour' end),
 d.all_day,d.status,'project_deadline'::text,d.project_id,p.name,d.activity_id,
 p.responsible_user_id,coalesce(p.responsible_name,pr.name),null::text,
 coalesce(c.color,case when d.is_main_deadline then '#8f4239' else '#8b6a3d' end),
 (public.can_edit_project(d.project_id) and public.has_permission('projects','change_deadline','own')),d.created_at,d.updated_at,
 p.client_id,cl.name
from public.project_dates d
join public.projects p on p.id=d.project_id
left join public.clients cl on cl.id=p.client_id
left join public.profiles pr on pr.id=p.responsible_user_id
left join public.system_categories c on c.module='project_date_type' and c.code=d.purpose_code and c.archived_at is null
where d.archived_at is null and d.activity_id is null and d.calendar_event_id is null;
revoke all on public.agenda_items from anon;grant select on public.agenda_items to authenticated;

create or replace function public.save_calendar_event(p_event_id uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid:=p_event_id;v_start timestamptz;v_end timestamptz;v_project uuid;v_activity uuid;v_client uuid;v_status text;v_all_day boolean;
begin
 if auth.uid() is null then raise exception 'Sessão inválida.'; end if;
 v_start:=nullif(p_payload->>'starts_at','')::timestamptz;v_end:=nullif(p_payload->>'ends_at','')::timestamptz;v_project:=public.safe_uuid(p_payload->>'project_id');v_activity:=public.safe_uuid(p_payload->>'activity_id');v_client:=public.safe_uuid(p_payload->>'client_id');v_status:=coalesce(nullif(p_payload->>'status',''),'scheduled');v_all_day:=coalesce((p_payload->>'all_day')::boolean,false);
 if trim(coalesce(p_payload->>'title',''))='' or v_start is null then raise exception 'Título e início são obrigatórios.'; end if;if v_end is not null and v_end<v_start then raise exception 'O fim não pode ser anterior ao início.'; end if;
 if v_project is not null and not public.can_access_project(v_project) then raise exception 'Sem acesso ao projeto.'; end if;if v_activity is not null and not public.can_access_activity(v_activity) then raise exception 'Sem acesso à atividade.'; end if;if v_client is not null and not public.can_access_client(v_client) then raise exception 'Sem acesso ao cliente.';end if;
 if v_id is null then
  if not public.has_permission('agenda','create','own') then raise exception 'Permissão insuficiente para criar eventos.'; end if;
  insert into public.calendar_events(project_id,activity_id,client_id,title,event_type,starts_at,ends_at,all_day,location,notes,status,responsible_user_id,assigned_user_id,created_by,updated_by,completed_at,cancelled_at,cancelled_by) values(v_project,v_activity,v_client,trim(p_payload->>'title'),coalesce(nullif(p_payload->>'event_type',''),'meeting'),v_start,v_end,v_all_day,nullif(trim(coalesce(p_payload->>'location','')),''),nullif(trim(coalesce(p_payload->>'notes','')),''),v_status,public.safe_uuid(p_payload->>'responsible_user_id'),public.safe_uuid(p_payload->>'responsible_user_id'),auth.uid(),auth.uid(),case when v_status='completed' then now() end,case when v_status='cancelled' then now() end,case when v_status='cancelled' then auth.uid() end) returning id into v_id;
 else
  if not public.can_access_calendar_event(v_id) or not public.has_permission('agenda','edit','assigned') then raise exception 'Permissão insuficiente para editar o evento.'; end if;
  update public.calendar_events set project_id=v_project,activity_id=v_activity,client_id=v_client,title=trim(p_payload->>'title'),event_type=coalesce(nullif(p_payload->>'event_type',''),'meeting'),starts_at=v_start,ends_at=v_end,all_day=v_all_day,location=nullif(trim(coalesce(p_payload->>'location','')),''),notes=nullif(trim(coalesce(p_payload->>'notes','')),''),status=v_status,responsible_user_id=public.safe_uuid(p_payload->>'responsible_user_id'),assigned_user_id=public.safe_uuid(p_payload->>'responsible_user_id'),updated_by=auth.uid(),updated_at=now(),completed_at=case when v_status='completed' then coalesce(completed_at,now()) else null end,cancelled_at=case when v_status='cancelled' then coalesce(cancelled_at,now()) else null end,cancelled_by=case when v_status='cancelled' then auth.uid() else null end where id=v_id and archived_at is null;if not found then raise exception 'Evento não encontrado.';end if;
 end if;return v_id;
end $$;

create or replace function public.create_activity_from_agenda(p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
begin if auth.uid() is null then raise exception 'Sessão inválida.';end if;if not public.has_permission('activities','create','own') then raise exception 'Permissão insuficiente para criar atividades.';end if;return public.save_activity(null,p_payload||jsonb_build_object('due_date',case when nullif(p_payload->>'due_at','') is null then null else ((p_payload->>'due_at')::timestamptz at time zone 'America/Boa_Vista')::date end));end $$;

-- Policies da Agenda incluem cliente direto
drop policy if exists calendar_insert_scope on public.calendar_events;
create policy calendar_insert_scope on public.calendar_events for insert to authenticated with check(public.has_permission('agenda','create','own') and ((project_id is null) or public.can_edit_project(project_id)) and ((activity_id is null) or public.can_edit_activity(activity_id)) and ((client_id is null) or public.can_access_client(client_id)));
drop policy if exists calendar_update_scope on public.calendar_events;
create policy calendar_update_scope on public.calendar_events for update to authenticated using(public.has_permission('agenda','edit','assigned') and public.can_access_calendar_event(id)) with check(public.has_permission('agenda','edit','assigned') and ((client_id is null) or public.can_access_client(client_id)));

-- 12. Views de diretório e financeiro
create or replace view public.client_directory_view with(security_invoker=true) as
select c.*,
 (select count(*) from public.projects p where p.client_id=c.id)::integer as total_projects,
 (select count(*) from public.projects p where p.client_id=c.id and p.archived_at is null and p.status not in('completed','cancelled'))::integer as active_projects,
 (select count(*) from public.project_activities a where a.client_id=c.id and a.deleted_at is null and a.archived_at is null and a.status not in('completed','cancelled'))::integer as pending_activities,
 (select count(*) from public.project_activities a where a.client_id=c.id and a.deleted_at is null and a.archived_at is null and a.status not in('completed','cancelled') and coalesce(a.due_at,(a.due_date::text||' 23:59:59')::timestamp at time zone 'America/Boa_Vista')<now())::integer as overdue_activities,
 (select max(n.occurred_at) from public.client_notes n where n.client_id=c.id and n.note_type='contact' and n.archived_at is null) as last_contact_at,
 (select min(ai.starts_at) from public.agenda_items ai where ai.client_id=c.id and ai.starts_at>=now() and ai.status<>'cancelled') as next_commitment_at,
 lower(concat_ws(' ',c.name,c.legal_name,c.trade_name,c.cpf,public.only_digits(c.cpf),c.cnpj,public.only_digits(c.cnpj),c.phone,c.whatsapp,c.email,(select string_agg(p.normalized_phone,' ') from public.client_phones p where p.client_id=c.id and p.archived_at is null),(select string_agg(e.normalized_email,' ') from public.client_emails e where e.client_id=c.id and e.archived_at is null))) as search_text
from public.clients c;
revoke all on public.client_directory_view from anon;grant select on public.client_directory_view to authenticated;

create or replace function public.search_clients(p_query text default null,p_filters jsonb default '{}'::jsonb,p_limit integer default 100,p_offset integer default 0)
returns setof public.client_directory_view language sql stable security invoker set search_path=public,pg_temp as $$
 select d.* from public.client_directory_view d
 where (coalesce((p_filters->>'include_archived')::boolean,false) or d.archived_at is null)
   and (nullif(p_filters->>'person_type','') is null or d.person_type=p_filters->>'person_type')
   and (nullif(p_filters->>'relationship_status','') is null or d.relationship_status=p_filters->>'relationship_status')
   and (nullif(p_filters->>'source_code','') is null or d.source_code=p_filters->>'source_code')
   and (nullif(p_filters->>'segment_code','') is null or d.segment_code=p_filters->>'segment_code')
   and (public.safe_uuid(p_filters->>'responsible_user_id') is null or d.internal_responsible_user_id=public.safe_uuid(p_filters->>'responsible_user_id'))
   and (nullif(trim(coalesce(p_query,'')),'') is null or d.search_text like '%'||lower(trim(p_query))||'%' or d.search_text like '%'||coalesce(public.only_digits(p_query),'#')||'%')
 order by d.archived_at nulls first,d.name
 limit least(greatest(coalesce(p_limit,100),1),500) offset greatest(coalesce(p_offset,0),0)
$$;

create or replace view public.client_financial_entries_view with(security_invoker=true) as
select f.id,coalesce(f.client_id,p.client_id) as client_id,f.description,f.entry_type,f.amount::numeric as amount,f.due_date,f.settled_at,f.status,f.project_id,p.name as project_name,
 case when f.status='paid' and not exists(select 1 from public.financial_entry_payments fp where fp.financial_entry_id=f.id and fp.archived_at is null) then f.amount::numeric else coalesce((select sum(fp.amount) from public.financial_entry_payments fp where fp.financial_entry_id=f.id and fp.archived_at is null),0) end as paid_amount,
 greatest(f.amount::numeric-case when f.status='paid' and not exists(select 1 from public.financial_entry_payments fp where fp.financial_entry_id=f.id and fp.archived_at is null) then f.amount::numeric else coalesce((select sum(fp.amount) from public.financial_entry_payments fp where fp.financial_entry_id=f.id and fp.archived_at is null),0) end,0) as open_amount
from public.financial_entries f left join public.projects p on p.id=f.project_id
where f.environment='professional' and f.archived_at is null and coalesce(f.client_id,p.client_id) is not null;
revoke all on public.client_financial_entries_view from public,anon,authenticated;

create or replace view public.client_financial_summary_view with(security_invoker=true) as
select e.client_id,
 coalesce(sum(e.amount) filter(where e.entry_type='income'),0) as expected_revenue,
 coalesce(sum(e.paid_amount) filter(where e.entry_type='income'),0) as received_revenue,
 coalesce(sum(e.open_amount) filter(where e.entry_type='income'),0) as receivable,
 coalesce(sum(e.open_amount) filter(where e.entry_type='income'),0) as open_amount,
 coalesce(sum(e.open_amount) filter(where e.entry_type='income' and e.due_date<current_date),0) as overdue_amount,
 coalesce(sum(e.paid_amount) filter(where e.entry_type='income' and e.paid_amount>0 and e.open_amount>0),0) as partial_payments,
 coalesce(sum(e.amount) filter(where e.entry_type='income'),0) as total_billed,
 coalesce(avg(e.amount) filter(where e.entry_type='income'),0) as average_ticket,
 max(coalesce(e.settled_at,(select max(fp.paid_at) from public.financial_entry_payments fp where fp.financial_entry_id=e.id and fp.archived_at is null))) as last_payment_at
from public.client_financial_entries_view e group by e.client_id;
revoke all on public.client_financial_summary_view from public,anon,authenticated;

create or replace function public.get_client_financial_workspace(p_client_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare summary_value jsonb; entries_value jsonb;
begin
  if auth.uid() is null or not public.can_view_client_financial(p_client_id) then
    raise exception 'Sem permissão para visualizar os valores financeiros deste cliente.';
  end if;
  select to_jsonb(s)-'client_id' into summary_value
  from public.client_financial_summary_view s where s.client_id=p_client_id;
  select coalesce(jsonb_agg(to_jsonb(e) order by e.due_date desc nulls last,e.id),'[]'::jsonb) into entries_value
  from public.client_financial_entries_view e where e.client_id=p_client_id;
  return coalesce(summary_value,'{}'::jsonb)||jsonb_build_object('entries',coalesce(entries_value,'[]'::jsonb));
end $$;

create or replace function public.get_client_indicators(p_client_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;begin if not public.can_access_client(p_client_id) then raise exception 'Sem acesso ao cliente.';end if;select jsonb_build_object('total_projects',d.total_projects,'active_projects',d.active_projects,'pending_activities',d.pending_activities,'overdue_activities',d.overdue_activities,'last_contact_at',d.last_contact_at,'next_commitment_at',d.next_commitment_at,'open_amount',case when public.can_view_client_financial(p_client_id) then coalesce(f.open_amount,0) else null end) into result from public.client_directory_view d left join public.client_financial_summary_view f on f.client_id=d.id where d.id=p_client_id;return coalesce(result,'{}'::jsonb);end $$;

-- 13. Grants e exposição Data API
grant select,insert,update,delete on public.client_phones,public.client_emails,public.client_notes,public.financial_entry_payments to authenticated;
revoke all on function public.only_digits(text),public.normalize_email(text),public.can_access_client(uuid),public.can_edit_client(uuid),public.can_view_client_financial(uuid),public.save_client(uuid,jsonb),public.archive_client(uuid),public.reactivate_client(uuid),public.delete_client_safely(uuid),public.save_client_note(uuid,uuid,jsonb),public.archive_client_note(uuid),public.pin_client_note(uuid,boolean),public.search_clients(text,jsonb,integer,integer),public.get_client_financial_workspace(uuid),public.get_client_indicators(uuid) from public,anon;
grant execute on function public.only_digits(text),public.normalize_email(text),public.can_access_client(uuid),public.can_edit_client(uuid),public.can_view_client_financial(uuid),public.save_client(uuid,jsonb),public.archive_client(uuid),public.reactivate_client(uuid),public.delete_client_safely(uuid),public.save_client_note(uuid,uuid,jsonb),public.archive_client_note(uuid),public.pin_client_note(uuid,boolean),public.search_clients(text,jsonb,integer,integer),public.get_client_financial_workspace(uuid),public.get_client_indicators(uuid) to authenticated;
revoke all on function public.save_calendar_event(uuid,jsonb),public.create_activity_from_agenda(jsonb),public.can_access_calendar_event(uuid),public.can_access_linked_file(uuid,boolean),public.can_access_history_entry(uuid) from public,anon;
grant execute on function public.save_calendar_event(uuid,jsonb),public.create_activity_from_agenda(jsonb),public.can_access_calendar_event(uuid),public.can_access_linked_file(uuid,boolean),public.can_access_history_entry(uuid) to authenticated;

-- 14. Versão
insert into public.system_versions(version,notes,environment)
values('3.0.8','Etapa 07: cadastro completo, ficha individual de clientes, contatos, observações, relações, pesquisa, arquivos, agenda e financeiro profissional autorizado.','production')
on conflict(version) do update set notes=excluded.notes,environment=excluded.environment,released_at=now();

commit;
