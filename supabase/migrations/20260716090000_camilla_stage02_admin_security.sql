-- Camilla Studio — Etapa 02
-- Configurações, usuários, permissões, segurança, auditoria e checklists.
-- SQL consolidado, aditivo e idempotente. Não remove registros reais.
-- Execute no Supabase SQL Editor com uma conta proprietária do projeto.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Verificação mínima da base
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Tabela public.profiles não encontrada. Aplique primeiro a base do Camilla Studio.';
  end if;
  if to_regclass('public.projects') is null then
    raise exception 'Tabela public.projects não encontrada. Aplique primeiro 20260716010000_architecture_platform.sql.';
  end if;
end $$;

-- Compatibilidade segura com as telas já existentes na base da Etapa 01.
-- Mantém registros e amplia somente colunas/tabelas necessárias aos módulos ativos.
alter table public.clients
  add column if not exists person_type text,
  add column if not exists cpf text,
  add column if not exists cnpj text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists relationship_status text not null default 'active',
  add column if not exists archived_at timestamptz;

alter table public.projects
  add column if not exists main_deadline date,
  add column if not exists responsible_user_id uuid references auth.users(id) on delete set null,
  add column if not exists archived_at timestamptz;
update public.projects set main_deadline=deadline_stage_3 where main_deadline is null and deadline_stage_3 is not null;
alter table public.projects drop constraint if exists projects_stage_check;
-- Mantém todos os códigos já utilizados e acrescenta os códigos da arquitetura atual.
alter table public.projects add constraint projects_stage_check check(stage in('prospecting','briefing','survey','briefing_preliminary','creation','adjustments','approval','executive','revision','construction','completed'));
create index if not exists projects_main_deadline_idx on public.projects(main_deadline);

alter table public.calendar_events
  add column if not exists status text not null default 'scheduled',
  add column if not exists assigned_user_id uuid references auth.users(id) on delete set null,
  add column if not exists responsible_user_id uuid references auth.users(id) on delete set null;

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  category text not null default 'document',
  drive_url text not null,
  drive_file_id text,
  thumbnail_url text,
  preview_status text not null default 'pending',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.project_files
  add column if not exists thumbnail_url text,
  add column if not exists preview_status text not null default 'pending';
create index if not exists project_files_project_idx on public.project_files(project_id,created_at desc);

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  environment text not null check(environment in('personal','professional')),
  entry_type text not null check(entry_type in('income','expense','transfer','contribution','withdrawal','pro_labore','profit_distribution')),
  description text not null,
  amount numeric(14,2) not null check(amount>=0),
  competence_date date not null,
  due_date date,
  settled_at timestamptz,
  status text not null default 'pending',
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  settled_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists financial_entries_environment_due_idx on public.financial_entries(environment,due_date,status);

create table if not exists public.google_drive_settings (
  id boolean primary key default true check(id=true),
  connected boolean not null default false,
  google_account_email text,
  root_folder_name text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.google_drive_settings(id,root_folder_name) values(true,'Camilla Studio') on conflict(id) do nothing;

create table if not exists public.google_drive_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  google_account_email text not null,
  root_folder_name text,
  active boolean not null default true,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.google_drive_connections
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists google_account_email text,
  add column if not exists root_folder_name text,
  add column if not exists active boolean not null default true,
  add column if not exists last_checked_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();
create unique index if not exists google_drive_connections_user_unique on public.google_drive_connections(user_id) where user_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Perfis, equipes e estado de segurança dos usuários
-- ---------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists teams_name_unique_ci on public.teams(lower(name)) where archived_at is null;

create table if not exists public.permission_profiles (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null,
  description text,
  system boolean not null default false,
  is_system boolean not null default false,
  active boolean not null default true,
  position integer not null default 0,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.permission_profiles add column if not exists code text;
alter table public.permission_profiles add column if not exists system boolean not null default false;
alter table public.permission_profiles add column if not exists is_system boolean not null default false;
alter table public.permission_profiles add column if not exists position integer not null default 0;
alter table public.permission_profiles add column if not exists archived_at timestamptz;
alter table public.permission_profiles add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();
update public.permission_profiles
set code = lower(regexp_replace(coalesce(code,name),'[^a-zA-Z0-9]+','_','g')),
    system = system or is_system
where code is null or code = '' or system is distinct from (system or is_system);
drop index if exists public.permission_profiles_code_unique;
create unique index permission_profiles_code_unique on public.permission_profiles(code);
create unique index if not exists permission_profiles_name_unique_ci on public.permission_profiles(lower(name));

alter table public.profiles
  add column if not exists permission_profile_id uuid references public.permission_profiles(id) on delete set null,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text,
  add column if not exists last_access_at timestamptz,
  add column if not exists session_revoked_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='last_seen_at') then
    execute 'update public.profiles set last_access_at=last_seen_at where last_access_at is null and last_seen_at is not null';
  end if;
end $$;

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'member',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key(team_id,user_id)
);
create index if not exists team_members_user_idx on public.team_members(user_id);


-- Vínculos operacionais necessários para escopos por atribuição.
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'collaborator',
  is_primary boolean not null default false,
  can_edit_project boolean not null default true,
  can_manage_agenda boolean not null default true,
  can_manage_checklist boolean not null default true,
  can_manage_files boolean not null default true,
  can_comment boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(project_id,user_id)
);
create index if not exists project_members_user_idx on public.project_members(user_id);

create table if not exists public.project_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  parent_id uuid references public.project_activities(id) on delete cascade,
  title text not null,
  description text,
  group_name text not null default 'Projetos',
  responsible_user_id uuid references auth.users(id) on delete set null,
  responsible_name text,
  priority text not null default 'normal',
  due_date date,
  completed_at timestamptz,
  position integer not null default 0,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.project_activities
  add column if not exists status text not null default 'not_started',
  add column if not exists progress smallint not null default 0 check(progress between 0 and 100),
  add column if not exists archived_at timestamptz,
  add column if not exists stage text,
  add column if not exists tags text[] not null default '{}';
create index if not exists project_activities_responsible_due_idx on public.project_activities(responsible_user_id,due_date);

alter table public.calendar_events
  add column if not exists assigned_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists responsible_user_id uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

-- Converte o antigo team_name, quando disponível, sem apagar o campo legado.
do $$
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='team_name') then
    insert into public.teams(name)
    select distinct trim(team_name) from public.profiles where nullif(trim(team_name),'') is not null
    on conflict do nothing;
    insert into public.team_members(team_id,user_id)
    select t.id,p.id from public.profiles p join public.teams t on lower(t.name)=lower(trim(p.team_name))
    where nullif(trim(p.team_name),'') is not null
    on conflict do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Catálogo de permissões e matrizes
-- ---------------------------------------------------------------------------
create table if not exists public.permission_catalog (
  module text not null,
  action text not null,
  module_label text not null,
  action_label text not null,
  supports_scope boolean not null default false,
  position integer not null default 0,
  primary key(module,action)
);

create table if not exists public.profile_permissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.permission_profiles(id) on delete cascade,
  permission_profile_id uuid references public.permission_profiles(id) on delete cascade,
  module text not null,
  action text not null,
  allowed boolean not null default false,
  scope text not null default 'none' check(scope in ('none','own','assigned','team','all')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profile_permissions add column if not exists profile_id uuid references public.permission_profiles(id) on delete cascade;
alter table public.profile_permissions add column if not exists permission_profile_id uuid references public.permission_profiles(id) on delete cascade;
alter table public.profile_permissions add column if not exists scope text not null default 'none';
alter table public.profile_permissions add column if not exists updated_at timestamptz not null default now();
update public.profile_permissions set profile_id=permission_profile_id where profile_id is null and permission_profile_id is not null;
update public.profile_permissions set permission_profile_id=profile_id where permission_profile_id is null and profile_id is not null;
do $$ begin
  if exists(select 1 from public.profile_permissions where profile_id is null) then
    raise exception 'Existem permissões sem perfil vinculado. Corrija os registros antes de aplicar a Etapa 02.';
  end if;
end $$;
alter table public.profile_permissions alter column profile_id set not null;
drop index if exists public.profile_permissions_profile_module_action_unique;
alter table public.profile_permissions drop constraint if exists profile_permissions_profile_module_action_key;
alter table public.profile_permissions add constraint profile_permissions_profile_module_action_key unique(profile_id,module,action);

create table if not exists public.user_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module text not null,
  action text not null,
  allowed boolean not null,
  scope text not null default 'none' check(scope in ('none','own','assigned','team','all')),
  reason text,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,module,action)
);

insert into public.permission_catalog(module,action,module_label,action_label,supports_scope,position) values
('dashboard','view','Dashboard','Visualizar',false,10),
('projects','view','Projetos','Visualizar',true,20),('projects','create','Projetos','Criar',false,21),('projects','edit','Projetos','Editar',true,22),('projects','delete','Projetos','Excluir',true,23),('projects','archive','Projetos','Arquivar',true,24),('projects','reactivate','Projetos','Reativar',true,25),('projects','approve','Projetos','Aprovar',true,26),('projects','export','Projetos','Exportar',true,27),('projects','change_status','Projetos','Alterar status',true,28),('projects','change_stage','Projetos','Alterar etapa',true,29),('projects','change_deadline','Projetos','Alterar prazo',true,30),
('kanban','view','Kanban','Visualizar',true,40),('kanban','change_status','Kanban','Alterar status',true,41),('kanban','change_stage','Kanban','Alterar etapa',true,42),('kanban','change_deadline','Kanban','Alterar prazo',true,43),
('activities','view','Atividades','Visualizar',true,50),('activities','create','Atividades','Criar',false,51),('activities','edit','Atividades','Editar',true,52),('activities','delete','Atividades','Excluir',true,53),('activities','change_status','Atividades','Alterar status',true,54),('activities','change_deadline','Atividades','Alterar prazo',true,55),
('agenda','view','Agenda','Visualizar',true,60),('agenda','create','Agenda','Criar',false,61),('agenda','edit','Agenda','Editar',true,62),('agenda','delete','Agenda','Excluir',true,63),('agenda','export','Agenda','Exportar',true,64),
('clients','view','Clientes','Visualizar',true,70),('clients','create','Clientes','Criar',false,71),('clients','edit','Clientes','Editar',true,72),('clients','delete','Clientes','Excluir',true,73),('clients','archive','Clientes','Arquivar',true,74),('clients','reactivate','Clientes','Reativar',true,75),('clients','export','Clientes','Exportar',true,76),
('files','view','Arquivos','Visualizar',true,80),('files','add_file','Arquivos','Adicionar arquivo',true,81),('files','remove_file','Arquivos','Remover arquivo',true,82),('files','export','Arquivos','Exportar',true,83),
('reports','view','Relatórios','Visualizar',true,90),('reports','export','Relatórios','Exportar',true,91),('reports','view_values','Relatórios','Visualizar valores',false,92),
('finance_professional','view','Financeiro profissional','Visualizar',false,100),('finance_professional','create','Financeiro profissional','Criar',false,101),('finance_professional','edit','Financeiro profissional','Editar',false,102),('finance_professional','archive','Financeiro profissional','Arquivar',false,103),('finance_professional','view_values','Financeiro profissional','Visualizar valores',false,104),('finance_professional','settle_finance','Financeiro profissional','Realizar baixa',false,105),('finance_professional','cancel_entry','Financeiro profissional','Cancelar lançamento',false,106),('finance_professional','export','Financeiro profissional','Exportar',false,107),
('finance_personal','view','Financeiro pessoal','Visualizar',false,110),('finance_personal','create','Financeiro pessoal','Criar',false,111),('finance_personal','edit','Financeiro pessoal','Editar',false,112),('finance_personal','archive','Financeiro pessoal','Arquivar',false,113),('finance_personal','view_values','Financeiro pessoal','Visualizar valores',false,114),('finance_personal','settle_finance','Financeiro pessoal','Realizar baixa',false,115),('finance_personal','cancel_entry','Financeiro pessoal','Cancelar lançamento',false,116),('finance_personal','export','Financeiro pessoal','Exportar',false,117),
('users','view','Usuários','Visualizar',false,120),('users','create','Usuários','Criar',false,121),('users','edit','Usuários','Editar',false,122),('users','archive','Usuários','Arquivar',false,123),('users','reactivate','Usuários','Reativar',false,124),('users','manage_users','Usuários','Gerenciar usuários',false,125),
('teams','view','Equipes','Visualizar',false,130),('teams','create','Equipes','Criar',false,131),('teams','edit','Equipes','Editar',false,132),('teams','archive','Equipes','Arquivar',false,133),('teams','reactivate','Equipes','Reativar',false,134),('teams','manage_users','Equipes','Gerenciar usuários',false,135),
('settings','view','Configurações','Visualizar',false,140),('settings','manage_settings','Configurações','Gerenciar configurações',false,141),
('checklists','view','Checklists','Visualizar',true,150),('checklists','create','Checklists','Criar',false,151),('checklists','edit','Checklists','Editar',true,152),('checklists','delete','Checklists','Excluir',true,153),('checklists','archive','Checklists','Arquivar',true,154),('checklists','reactivate','Checklists','Reativar',true,155),('checklists','manage_settings','Checklists','Gerenciar configurações',false,156),
('notifications','view','Notificações','Visualizar',false,160),('notifications','edit','Notificações','Editar',false,161),('notifications','manage_settings','Notificações','Gerenciar configurações',false,162),
('integrations','view','Integrações','Visualizar',false,170),('integrations','edit','Integrações','Editar',false,171),('integrations','manage_settings','Integrações','Gerenciar configurações',false,172),
('versions','view','Versões','Visualizar',false,180),('versions','create','Versões','Criar',false,181),('versions','manage_settings','Versões','Gerenciar configurações',false,182),
('security','view','Segurança e auditoria','Visualizar',false,190),('security','export','Segurança e auditoria','Exportar',false,191),('security','manage_settings','Segurança e auditoria','Gerenciar configurações',false,192)
on conflict(module,action) do update set module_label=excluded.module_label,action_label=excluded.action_label,supports_scope=excluded.supports_scope,position=excluded.position;

insert into public.permission_profiles(code,name,description,system,is_system,active,position) values
('administrator','Administrador','Administração completa, exceto Financeiro Pessoal sem autorização individual.',true,true,true,10),
('owner','Proprietária','Acesso integral, incluindo Financeiro Pessoal.',true,true,true,20),
('manager','Gestor','Gestão operacional de projetos, agenda, clientes e relatórios.',true,true,true,30),
('finance','Financeiro','Financeiro profissional e consultas operacionais necessárias.',true,true,true,40),
('architect','Arquiteto','Projetos, atividades, eventos, arquivos e checklists atribuídos.',true,true,true,50),
('collaborator','Colaborador','Somente registros atribuídos e autorizados.',true,true,true,60),
('assistant','Assistente','Apoio operacional em registros atribuídos.',true,true,true,70),
('viewer','Somente leitura','Leitura dos registros atribuídos, sem alteração.',true,true,true,80)
on conflict(code) do update set name=excluded.name,description=excluded.description,system=true,is_system=true,active=true,position=excluded.position;

-- Matriz: proprietário recebe tudo; administrador recebe tudo exceto financeiro pessoal.
insert into public.profile_permissions(profile_id,permission_profile_id,module,action,allowed,scope)
select p.id,p.id,c.module,c.action,true,case when c.supports_scope then 'all' else 'all' end
from public.permission_profiles p cross join public.permission_catalog c where p.code='owner'
on conflict(profile_id,module,action) do update set allowed=excluded.allowed,scope=excluded.scope,permission_profile_id=excluded.permission_profile_id;

insert into public.profile_permissions(profile_id,permission_profile_id,module,action,allowed,scope)
select p.id,p.id,c.module,c.action,(c.module<>'finance_personal'),case when c.module='finance_personal' then 'none' else 'all' end
from public.permission_profiles p cross join public.permission_catalog c where p.code='administrator'
on conflict(profile_id,module,action) do update set allowed=excluded.allowed,scope=excluded.scope,permission_profile_id=excluded.permission_profile_id;

-- Perfis operacionais: primeiro redefine a matriz padrão para negar por padrão.
insert into public.profile_permissions(profile_id,permission_profile_id,module,action,allowed,scope)
select p.id,p.id,c.module,c.action,false,'none'
from public.permission_profiles p cross join public.permission_catalog c
where p.code in('manager','finance','architect','collaborator','assistant','viewer')
on conflict(profile_id,module,action) do update set allowed=false,scope='none',permission_profile_id=excluded.permission_profile_id;

-- Em seguida, aplica somente as concessões previstas para cada perfil de sistema.
with grants(profile_code,module,action,scope) as (values
('manager','dashboard','view','all'),('manager','projects','view','all'),('manager','projects','create','all'),('manager','projects','edit','all'),('manager','projects','archive','all'),('manager','projects','reactivate','all'),('manager','projects','approve','all'),('manager','projects','export','all'),('manager','projects','change_status','all'),('manager','projects','change_stage','all'),('manager','projects','change_deadline','all'),('manager','kanban','view','all'),('manager','kanban','change_status','all'),('manager','kanban','change_stage','all'),('manager','kanban','change_deadline','all'),('manager','activities','view','all'),('manager','activities','create','all'),('manager','activities','edit','all'),('manager','activities','delete','all'),('manager','activities','change_status','all'),('manager','activities','change_deadline','all'),('manager','agenda','view','all'),('manager','agenda','create','all'),('manager','agenda','edit','all'),('manager','agenda','delete','all'),('manager','agenda','export','all'),('manager','clients','view','all'),('manager','clients','create','all'),('manager','clients','edit','all'),('manager','clients','archive','all'),('manager','clients','reactivate','all'),('manager','clients','export','all'),('manager','files','view','all'),('manager','files','add_file','all'),('manager','files','remove_file','all'),('manager','files','export','all'),('manager','reports','view','all'),('manager','reports','export','all'),('manager','checklists','view','all'),('manager','checklists','create','all'),('manager','checklists','edit','all'),
('finance','dashboard','view','all'),('finance','projects','view','all'),('finance','clients','view','all'),('finance','finance_professional','view','all'),('finance','finance_professional','create','all'),('finance','finance_professional','edit','all'),('finance','finance_professional','archive','all'),('finance','finance_professional','view_values','all'),('finance','finance_professional','settle_finance','all'),('finance','finance_professional','cancel_entry','all'),('finance','finance_professional','export','all'),
('architect','dashboard','view','all'),('architect','projects','view','assigned'),('architect','projects','edit','assigned'),('architect','projects','change_status','assigned'),('architect','projects','change_stage','assigned'),('architect','projects','change_deadline','assigned'),('architect','kanban','view','assigned'),('architect','activities','view','assigned'),('architect','activities','create','assigned'),('architect','activities','edit','assigned'),('architect','activities','change_status','assigned'),('architect','activities','change_deadline','assigned'),('architect','agenda','view','assigned'),('architect','agenda','create','assigned'),('architect','agenda','edit','assigned'),('architect','files','view','assigned'),('architect','files','add_file','assigned'),('architect','files','remove_file','assigned'),('architect','checklists','view','assigned'),('architect','checklists','edit','assigned'),
('collaborator','dashboard','view','all'),('collaborator','projects','view','assigned'),('collaborator','kanban','view','assigned'),('collaborator','activities','view','assigned'),('collaborator','activities','edit','assigned'),('collaborator','activities','change_status','assigned'),('collaborator','agenda','view','assigned'),('collaborator','files','view','assigned'),('collaborator','files','add_file','assigned'),('collaborator','checklists','view','assigned'),('collaborator','checklists','edit','assigned'),
('assistant','dashboard','view','all'),('assistant','projects','view','assigned'),('assistant','kanban','view','assigned'),('assistant','activities','view','assigned'),('assistant','activities','edit','assigned'),('assistant','activities','change_status','assigned'),('assistant','agenda','view','assigned'),('assistant','agenda','create','assigned'),('assistant','files','view','assigned'),('assistant','files','add_file','assigned'),('assistant','checklists','view','assigned'),('assistant','checklists','edit','assigned'),
('viewer','dashboard','view','all'),('viewer','projects','view','assigned'),('viewer','kanban','view','assigned'),('viewer','activities','view','assigned'),('viewer','agenda','view','assigned'),('viewer','files','view','assigned'),('viewer','checklists','view','assigned')
)
insert into public.profile_permissions(profile_id,permission_profile_id,module,action,allowed,scope)
select p.id,p.id,g.module,g.action,true,g.scope from grants g join public.permission_profiles p on p.code=g.profile_code
on conflict(profile_id,module,action) do update set allowed=true,scope=excluded.scope,permission_profile_id=excluded.permission_profile_id;

-- Atribui perfis compatíveis aos usuários existentes sem alterar IDs ou o enum legado.
update public.profiles p set permission_profile_id=pp.id
from public.permission_profiles pp
where p.permission_profile_id is null and pp.code=case
  when p.role::text='admin' then 'administrator'
  when p.role::text='manager' then 'manager'
  when p.role::text='production' then 'collaborator'
  else 'viewer' end;

-- ---------------------------------------------------------------------------
-- 4. Configurações, catálogos, versões e categorias
-- ---------------------------------------------------------------------------
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_stages (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, color text,
  position integer not null default 0, active boolean not null default true, final boolean not null default false,
  archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.project_statuses (like public.project_stages including defaults including constraints including indexes);
create table if not exists public.activity_statuses (like public.project_stages including defaults including constraints including indexes);

create table if not exists public.system_categories (
  id uuid primary key default gen_random_uuid(), module text not null, code text not null, name text not null,
  color text, active boolean not null default true, position integer not null default 0, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(module,code)
);

create table if not exists public.system_versions (
  id uuid primary key default gen_random_uuid(), version text not null unique, released_at timestamptz not null default now(),
  notes text not null, environment text not null default 'production', created_by uuid references auth.users(id) on delete set null
);

insert into public.system_settings(key,value,description) values
('system_name','"Camilla Studio"'::jsonb,'Nome oficial do sistema'),('locale','"pt-BR"'::jsonb,'Idioma'),
('time_zone','"America/Boa_Vista"'::jsonb,'Fuso horário'),('currency','"BRL"'::jsonb,'Moeda'),
('agenda_default_view','"week"'::jsonb,'Visualização padrão da agenda'),('business_hours_start','"08:00"'::jsonb,'Início do expediente'),
('business_hours_end','"18:00"'::jsonb,'Fim do expediente'),('files_max_size_mb','50'::jsonb,'Limite de arquivo em MB')
on conflict(key) do nothing;

insert into public.project_stages(code,name,color,position,active,final) values
('prospecting','Prospecção','#d3c0bd',10,true,false),('briefing','Briefing','#c9aaa1',20,true,false),('survey','Levantamento','#b98d80',30,true,false),
('creation','Criação','#9b6352',40,true,false),('adjustments','Ajustes','#8c5b4c',50,true,false),('executive','Executivo','#765044',60,true,false),
('approval','Aprovação','#6d4a3f',70,true,false),('construction','Obra','#664238',80,true,false),('completed','Concluído','#52705c',90,true,true),
('briefing_preliminary','Briefing e preliminares','#c9aaa1',15,true,false),('revision','Revisão','#805a4d',75,true,false)
on conflict(code) do update set name=excluded.name,color=excluded.color,position=excluded.position,final=excluded.final;
insert into public.project_statuses(code,name,color,position,active,final) values
('not_started','Não iniciado','#8e7c75',10,true,false),('in_progress','Em andamento','#9b6352',20,true,false),('waiting','Em espera','#8b6a3d',30,true,false),
('waiting_client','Aguardando cliente','#8b6a3d',40,true,false),('correction','Em correção','#8f4239',50,true,false),('completed','Concluído','#52705c',60,true,true),('cancelled','Cancelado','#8f4239',70,true,true)
on conflict(code) do update set name=excluded.name,color=excluded.color,position=excluded.position,final=excluded.final;
insert into public.activity_statuses(code,name,color,position,active,final) values
('not_started','Não iniciada','#8e7c75',10,true,false),('in_progress','Em andamento','#9b6352',20,true,false),('waiting','Em espera','#8b6a3d',30,true,false),('completed','Concluída','#52705c',40,true,true),('cancelled','Cancelada','#8f4239',50,true,true)
on conflict(code) do update set name=excluded.name,color=excluded.color,position=excluded.position,final=excluded.final;
insert into public.system_versions(version,notes,environment) values
('3.0.2','Etapa 02: configurações, usuários, equipes, perfis, permissões granulares, RLS, auditoria, sessões e checklists imutáveis.','production')
on conflict(version) do update set notes=excluded.notes,environment=excluded.environment;

-- ---------------------------------------------------------------------------
-- 5. Auditoria e eventos de segurança
-- ---------------------------------------------------------------------------
create table if not exists public.security_audit_events (
  id bigint generated by default as identity primary key,
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_type text,
  target_id text,
  email_hash text,
  source_hash text,
  user_agent text,
  success boolean,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists security_audit_event_idx on public.security_audit_events(event_type,created_at desc);
create index if not exists security_audit_actor_idx on public.security_audit_events(actor_user_id,created_at desc);

-- ---------------------------------------------------------------------------
-- 6. Checklists: modelos versionados e aplicações imutáveis
-- ---------------------------------------------------------------------------
create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(), name text not null, description text, stage_code text,
  stage text, project_type text, active boolean not null default true, version integer not null default 1,
  archived_at timestamptz, created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.checklist_templates add column if not exists description text;
alter table public.checklist_templates add column if not exists stage_code text;
alter table public.checklist_templates add column if not exists stage text;
alter table public.checklist_templates add column if not exists version integer not null default 1;
alter table public.checklist_templates add column if not exists archived_at timestamptz;
update public.checklist_templates set stage_code=coalesce(stage_code,stage,'briefing') where stage_code is null;

create table if not exists public.checklist_template_items (
  id uuid primary key default gen_random_uuid(), template_id uuid not null references public.checklist_templates(id) on delete cascade,
  section text, title text not null, required boolean not null default false, position integer not null default 0,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.checklist_template_items add column if not exists created_at timestamptz not null default now();
alter table public.checklist_template_items add column if not exists updated_at timestamptz not null default now();

create table if not exists public.checklist_applications (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  template_id uuid references public.checklist_templates(id) on delete set null, template_version integer not null,
  stage_code text not null, template_name text not null, applied_by uuid references auth.users(id) on delete set null default auth.uid(),
  applied_at timestamptz not null default now(), started_at timestamptz, completed_at timestamptz,
  unique(project_id,template_id,stage_code)
);

create table if not exists public.project_checklist_items (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  stage text not null, section text not null default 'Geral', title text not null, completed_at timestamptz,
  position integer not null default 0, created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.project_checklist_items add column if not exists application_id uuid references public.checklist_applications(id) on delete cascade;
alter table public.project_checklist_items add column if not exists source_template_id uuid references public.checklist_templates(id) on delete set null;
alter table public.project_checklist_items add column if not exists template_item_id uuid references public.checklist_template_items(id) on delete set null;
alter table public.project_checklist_items add column if not exists required boolean not null default false;
alter table public.project_checklist_items add column if not exists responsible_user_id uuid references auth.users(id) on delete set null;
alter table public.project_checklist_items add column if not exists started_at timestamptz;
alter table public.project_checklist_items add column if not exists completed_by uuid references auth.users(id) on delete set null;
alter table public.project_checklist_items add column if not exists snapshot_version integer;
create unique index if not exists project_checklist_application_item_unique on public.project_checklist_items(application_id,template_item_id) where application_id is not null and template_item_id is not null;

-- ---------------------------------------------------------------------------
-- 7. Funções de permissão, sessão e escopo
-- ---------------------------------------------------------------------------
create or replace function public.scope_rank(p_scope text) returns integer language sql immutable as $$
  select case p_scope when 'all' then 4 when 'team' then 3 when 'assigned' then 2 when 'own' then 1 else 0 end
$$;

create or replace function public.current_user_access_valid()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.active=true and p.archived_at is null and p.blocked_at is null
    and (p.session_revoked_at is null or to_timestamp(coalesce((auth.jwt()->>'iat')::bigint,0)) > p.session_revoked_at))
$$;

create or replace function public.permission_scope(p_module text,p_action text)
returns text language sql stable security definer set search_path=public,pg_temp as $$
  with own_profile as (select permission_profile_id from public.profiles where id=auth.uid()),
  resolved as (
    select u.allowed,u.scope,1 priority from public.user_permission_overrides u where u.user_id=auth.uid() and u.module=p_module and u.action=p_action and (u.expires_at is null or u.expires_at>now())
    union all
    select pp.allowed,pp.scope,2 from public.profile_permissions pp join own_profile op on op.permission_profile_id=pp.profile_id where pp.module=p_module and pp.action=p_action
  ) select case when public.current_user_access_valid() then coalesce((select case when allowed then scope else 'none' end from resolved order by priority limit 1),'none') else 'none' end
$$;

create or replace function public.has_permission(p_module text,p_action text,p_min_scope text default 'own')
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.current_user_access_valid() and public.scope_rank(public.permission_scope(p_module,p_action))>=public.scope_rank(p_min_scope)
$$;

create or replace function public.current_access_context()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'valid',public.current_user_access_valid(),'profile_code',coalesce(pp.code,'viewer'),'profile_name',coalesce(pp.name,'Somente leitura'),
    'blocked_at',p.blocked_at,'session_revoked_at',p.session_revoked_at,
    'permissions',coalesce((select jsonb_agg(jsonb_build_object('module',c.module,'action',c.action,'allowed',public.has_permission(c.module,c.action,'own'),'scope',public.permission_scope(c.module,c.action)) order by c.position) from public.permission_catalog c),'[]'::jsonb)
  ) from public.profiles p left join public.permission_profiles pp on pp.id=p.permission_profile_id where p.id=auth.uid()
$$;

create or replace function public.can_access_project(target_project_id uuid)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare s text;begin s:=public.permission_scope('projects','view');if s='all' then return true;end if;if s='own' and exists(select 1 from public.projects p where p.id=target_project_id and p.created_by=auth.uid()) then return true;end if;if s in('assigned','team') and exists(select 1 from public.project_members pm where pm.project_id=target_project_id and pm.user_id=auth.uid()) then return true;end if;if s='team' and exists(select 1 from public.project_members pm join public.team_members target_tm on target_tm.user_id=pm.user_id join public.team_members own_tm on own_tm.team_id=target_tm.team_id and own_tm.user_id=auth.uid() where pm.project_id=target_project_id) then return true;end if;return false;end $$;

create or replace function public.can_edit_project(target_project_id uuid)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare s text;begin s:=public.permission_scope('projects','edit');if s='all' then return true;end if;if s='own' and exists(select 1 from public.projects p where p.id=target_project_id and p.created_by=auth.uid()) then return true;end if;if s in('assigned','team') and exists(select 1 from public.project_members pm where pm.project_id=target_project_id and pm.user_id=auth.uid() and coalesce(pm.can_edit_project,true)) then return true;end if;if s='team' and exists(select 1 from public.project_members pm join public.team_members target_tm on target_tm.user_id=pm.user_id join public.team_members own_tm on own_tm.team_id=target_tm.team_id and own_tm.user_id=auth.uid() where pm.project_id=target_project_id) then return true;end if;return false;end $$;

create or replace function public.can_access_client(target_client_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.has_permission('clients','view','all') or exists(select 1 from public.projects p where p.client_id=target_client_id and public.can_access_project(p.id))
$$;

create or replace function public.can_access_activity(target_activity_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.has_permission('activities','view','all') or exists(select 1 from public.project_activities a where a.id=target_activity_id and (a.responsible_user_id=auth.uid() or (a.project_id is not null and public.can_access_project(a.project_id))))
$$;

create or replace function public.can_access_calendar_event(target_event_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.has_permission('agenda','view','all') or exists(select 1 from public.calendar_events e where e.id=target_event_id and (e.created_by=auth.uid() or e.assigned_user_id=auth.uid() or e.responsible_user_id=auth.uid() or (e.project_id is not null and public.can_access_project(e.project_id))))
$$;

create or replace function public.can_view_finance(target_environment text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select case when target_environment='personal' then public.has_permission('finance_personal','view','own') else public.has_permission('finance_professional','view','own') end
$$;

-- Expõe somente metadados seguros das conexões; tokens permanecem inacessíveis ao cliente.
create or replace function public.get_google_drive_connection_status()
returns table(id uuid,user_id uuid,google_account_email text,root_folder_name text,active boolean,last_checked_at timestamptz)
language sql stable security definer set search_path=public,pg_temp as $$
  select c.id,c.user_id,c.google_account_email,c.root_folder_name,c.active,c.last_checked_at
  from public.google_drive_connections c
  where public.current_user_access_valid()
    and (c.user_id=auth.uid() or public.has_permission('integrations','view','all'))
$$;

create or replace function public.record_security_event(p_event_type text,p_metadata jsonb default '{}'::jsonb,p_target_type text default null,p_target_id text default null)
returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare new_id bigint;begin if auth.uid() is null then raise exception 'Autenticação obrigatória';end if;if p_event_type not in('login_success','logout') then raise exception 'Evento não permitido para registro pelo cliente.';end if;insert into public.security_audit_events(event_type,actor_user_id,target_type,target_id,success,metadata) values(p_event_type,auth.uid(),p_target_type,p_target_id,true,coalesce(p_metadata,'{}'::jsonb)) returning id into new_id;update public.profiles set last_access_at=case when p_event_type='login_success' then now() else last_access_at end,updated_at=now() where id=auth.uid();return new_id;end $$;

create or replace function public.bootstrap_first_administrator(target_user_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare admin_profile uuid;begin perform pg_advisory_xact_lock(hashtext('camilla:last-administrator'));if exists(select 1 from public.profiles p join public.permission_profiles pp on pp.id=p.permission_profile_id where pp.code in('administrator','owner') and p.active and p.blocked_at is null and p.archived_at is null) then raise exception 'Já existe um administrador ou proprietária ativo.';end if;select id into admin_profile from public.permission_profiles where code='administrator';if admin_profile is null then raise exception 'Perfil Administrador não encontrado.';end if;update public.profiles set permission_profile_id=admin_profile,active=true,blocked_at=null,archived_at=null,updated_at=now() where id=target_user_id;if not found then raise exception 'Usuário não encontrado.';end if;insert into public.security_audit_events(event_type,actor_user_id,target_type,target_id,success,metadata) values('bootstrap_first_administrator',target_user_id,'profile',target_user_id::text,true,'{}');end $$;

-- Proteção do último administrador/proprietária ativo.
create or replace function public.protect_last_administrator()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare old_code text;declare new_code text;declare remaining integer;begin perform pg_advisory_xact_lock(hashtext('camilla:last-administrator'));select code into old_code from public.permission_profiles where id=old.permission_profile_id;select code into new_code from public.permission_profiles where id=new.permission_profile_id;if old_code in('administrator','owner') and old.active and old.blocked_at is null and old.archived_at is null and (coalesce(new_code,'') not in('administrator','owner') or not new.active or new.blocked_at is not null or new.archived_at is not null) then select count(*) into remaining from public.profiles p join public.permission_profiles pp on pp.id=p.permission_profile_id where p.id<>old.id and pp.code in('administrator','owner') and p.active and p.blocked_at is null and p.archived_at is null; if remaining=0 then raise exception 'O último administrador/proprietária ativo não pode ser removido, desativado ou bloqueado.';end if;end if;return new;end $$;
drop trigger if exists profiles_protect_last_administrator on public.profiles;
create trigger profiles_protect_last_administrator before update of permission_profile_id,active,blocked_at,archived_at on public.profiles for each row execute function public.protect_last_administrator();

-- Perfis essenciais e a permissão de gerenciar usuários não podem ser removidos.
create or replace function public.protect_system_permission_profile()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if old.system or old.is_system then
    if tg_op='DELETE' then raise exception 'Perfis de sistema não podem ser excluídos.';end if;
    if new.code is distinct from old.code or not new.active or new.archived_at is not null then
      raise exception 'Código, ativação e arquivamento de perfis de sistema são protegidos.';
    end if;
  end if;
  return case when tg_op='DELETE' then old else new end;
end $$;
drop trigger if exists permission_profiles_protect_system on public.permission_profiles;
create trigger permission_profiles_protect_system before update or delete on public.permission_profiles for each row execute function public.protect_system_permission_profile();

create or replace function public.protect_core_admin_permission()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare profile_code text;declare target_module text;declare target_action text;begin
  select code into profile_code from public.permission_profiles where id=coalesce(old.profile_id,new.profile_id);
  target_module:=coalesce(old.module,new.module);target_action:=coalesce(old.action,new.action);
  if profile_code in('administrator','owner') and target_module='users' and target_action='manage_users' then
    if tg_op='DELETE' or not coalesce(new.allowed,false) then
      raise exception 'A permissão essencial de gerenciar usuários não pode ser removida dos perfis Administrador e Proprietária.';
    end if;
  end if;
  return case when tg_op='DELETE' then old else new end;
end $$;
drop trigger if exists profile_permissions_protect_admin_core on public.profile_permissions;
create trigger profile_permissions_protect_admin_core before update or delete on public.profile_permissions for each row execute function public.protect_core_admin_permission();

-- Auditoria de alterações críticas do perfil.
create or replace function public.audit_profile_security_change()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin if old.name is distinct from new.name or old.email is distinct from new.email or old.permission_profile_id is distinct from new.permission_profile_id or old.active is distinct from new.active or old.blocked_at is distinct from new.blocked_at or old.session_revoked_at is distinct from new.session_revoked_at then insert into public.security_audit_events(event_type,actor_user_id,target_type,target_id,success,metadata) values('user_admin_change',auth.uid(),'profile',new.id::text,true,jsonb_build_object('old',jsonb_build_object('name',old.name,'email',old.email,'permission_profile_id',old.permission_profile_id,'active',old.active,'blocked_at',old.blocked_at,'session_revoked_at',old.session_revoked_at),'new',jsonb_build_object('name',new.name,'email',new.email,'permission_profile_id',new.permission_profile_id,'active',new.active,'blocked_at',new.blocked_at,'session_revoked_at',new.session_revoked_at)));end if;new.updated_at=now();return new;end $$;
drop trigger if exists profiles_audit_security_change on public.profiles;
create trigger profiles_audit_security_change before update on public.profiles for each row execute function public.audit_profile_security_change();

-- Checklists: duplicação, versão e aplicação automática por etapa.
create or replace function public.duplicate_checklist_template(p_template_id uuid,p_target_stage_code text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare source public.checklist_templates%rowtype;declare new_id uuid;begin if not public.has_permission('checklists','create','own') then raise exception 'Permissão insuficiente.';end if;select * into source from public.checklist_templates where id=p_template_id;if not found then raise exception 'Modelo não encontrado.';end if;insert into public.checklist_templates(name,description,stage_code,stage,project_type,active,version,created_by) values(source.name||' — cópia',source.description,coalesce(p_target_stage_code,source.stage_code),coalesce(p_target_stage_code,source.stage),source.project_type,true,1,auth.uid()) returning id into new_id;insert into public.checklist_template_items(template_id,section,title,required,position,active) select new_id,section,title,required,position,active from public.checklist_template_items where template_id=p_template_id;insert into public.security_audit_events(event_type,actor_user_id,target_type,target_id,success,metadata) values('checklist_template_duplicated',auth.uid(),'checklist_template',new_id::text,true,jsonb_build_object('source_template_id',p_template_id,'target_stage_code',p_target_stage_code));return new_id;end $$;

create or replace function public.bump_checklist_template_version()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare target uuid;begin target:=case when tg_op='DELETE' then old.template_id else new.template_id end;update public.checklist_templates set version=version+1,updated_at=now() where id=target;if tg_op='DELETE' then return old;end if;return new;end $$;
drop trigger if exists checklist_items_bump_template_version on public.checklist_template_items;
create trigger checklist_items_bump_template_version after insert or update or delete on public.checklist_template_items for each row execute function public.bump_checklist_template_version();

create or replace function public.apply_stage_checklist_snapshot(target_project_id uuid,target_stage_code text)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare tpl record;declare app_id uuid;declare total integer:=0;declare affected integer:=0;begin for tpl in select * from public.checklist_templates where active and archived_at is null and coalesce(stage_code,stage)=target_stage_code loop insert into public.checklist_applications(project_id,template_id,template_version,stage_code,template_name,applied_by) values(target_project_id,tpl.id,tpl.version,target_stage_code,tpl.name,auth.uid()) on conflict(project_id,template_id,stage_code) do nothing returning id into app_id;if app_id is not null then insert into public.project_checklist_items(project_id,stage,section,title,position,created_by,application_id,source_template_id,template_item_id,required,snapshot_version) select target_project_id,target_stage_code,coalesce(i.section,'Geral'),i.title,i.position,auth.uid(),app_id,tpl.id,i.id,i.required,tpl.version from public.checklist_template_items i where i.template_id=tpl.id and i.active order by i.position;get diagnostics affected = row_count; total := total + affected;insert into public.security_audit_events(event_type,actor_user_id,target_type,target_id,success,metadata) values('checklist_applied',auth.uid(),'project',target_project_id::text,true,jsonb_build_object('application_id',app_id,'template_id',tpl.id,'template_version',tpl.version,'stage_code',target_stage_code));end if;app_id:=null;end loop;return total;end $$;

create or replace function public.apply_checklist_on_project_stage()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin if tg_op='INSERT' or old.stage is distinct from new.stage then perform public.apply_stage_checklist_snapshot(new.id,new.stage);end if;return new;end $$;
drop trigger if exists projects_apply_stage_checklist on public.projects;
create trigger projects_apply_stage_checklist after insert or update of stage on public.projects for each row execute function public.apply_checklist_on_project_stage();

create or replace function public.audit_project_checklist_progress()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin if old.started_at is null and new.started_at is not null then insert into public.security_audit_events(event_type,actor_user_id,target_type,target_id,success,metadata) values('checklist_item_started',auth.uid(),'project_checklist_item',new.id::text,true,jsonb_build_object('project_id',new.project_id,'responsible_user_id',new.responsible_user_id));end if;if old.completed_at is null and new.completed_at is not null then new.completed_by=coalesce(new.completed_by,auth.uid());insert into public.security_audit_events(event_type,actor_user_id,target_type,target_id,success,metadata) values('checklist_item_completed',auth.uid(),'project_checklist_item',new.id::text,true,jsonb_build_object('project_id',new.project_id,'completed_at',new.completed_at));end if;new.updated_at=now();return new;end $$;
drop trigger if exists project_checklist_audit_progress on public.project_checklist_items;
create trigger project_checklist_audit_progress before update on public.project_checklist_items for each row execute function public.audit_project_checklist_progress();

-- ---------------------------------------------------------------------------
-- 8. RLS administrativa e por registro
-- ---------------------------------------------------------------------------
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.project_members enable row level security;
alter table public.project_activities enable row level security;
alter table public.project_files enable row level security;
alter table public.financial_entries enable row level security;
alter table public.google_drive_settings enable row level security;
alter table public.google_drive_connections enable row level security;
alter table public.permission_catalog enable row level security;
alter table public.permission_profiles enable row level security;
alter table public.profile_permissions enable row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.system_settings enable row level security;
alter table public.project_stages enable row level security;
alter table public.project_statuses enable row level security;
alter table public.activity_statuses enable row level security;
alter table public.system_categories enable row level security;
alter table public.system_versions enable row level security;
alter table public.security_audit_events enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_template_items enable row level security;
alter table public.checklist_applications enable row level security;
alter table public.project_checklist_items enable row level security;
do $$ declare t text;begin
  foreach t in array array['project_deliverables','project_comments','project_history','project_revisions','project_financial_entries'] loop
    if to_regclass('public.'||t) is not null then execute format('alter table public.%I enable row level security',t);end if;
  end loop;
end $$;

-- Tabelas legadas que podem conter tokens ou URLs de sessão ficam exclusivamente no servidor.
do $$ declare r record;declare t text;begin
  foreach t in array array['google_drive_tokens','google_drive_upload_sessions'] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security',t);
      for r in select policyname from pg_policies where schemaname='public' and tablename=t loop
        execute format('drop policy if exists %I on public.%I',r.policyname,t);
      end loop;
      execute format('revoke all on public.%I from anon,authenticated',t);
    end if;
  end loop;
end $$;

-- Remove apenas políticas das tabelas que esta etapa passa a governar integralmente.
do $$ declare r record;declare t text;begin
  foreach t in array array['profiles','teams','team_members','project_members','google_drive_settings','google_drive_connections','permission_catalog','permission_profiles','profile_permissions','user_permission_overrides','system_settings','project_stages','project_statuses','activity_statuses','system_categories','system_versions','security_audit_events','checklist_templates','checklist_template_items','checklist_applications','project_checklist_items'] loop
    if to_regclass('public.'||t) is not null then for r in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy if exists %I on public.%I',r.policyname,t);end loop;end if;
  end loop;
end $$;

create policy profiles_select_authorized on public.profiles for select to authenticated using(public.current_user_access_valid() and (id=auth.uid() or public.has_permission('users','view','own')));
create policy profiles_update_admin on public.profiles for update to authenticated using(public.has_permission('users','manage_users','own')) with check(public.has_permission('users','manage_users','own'));
create policy teams_read on public.teams for select to authenticated using(public.has_permission('teams','view','own'));
create policy teams_manage on public.teams for all to authenticated using(public.has_permission('teams','manage_users','own')) with check(public.has_permission('teams','manage_users','own'));
create policy team_members_read on public.team_members for select to authenticated using(user_id=auth.uid() or public.has_permission('teams','view','own'));
create policy team_members_manage on public.team_members for all to authenticated using(public.has_permission('teams','manage_users','own')) with check(public.has_permission('teams','manage_users','own'));
create policy project_members_read on public.project_members for select to authenticated using(user_id=auth.uid() or public.can_access_project(project_id) or public.has_permission('users','manage_users','own'));
create policy project_members_manage on public.project_members for all to authenticated using(public.has_permission('users','manage_users','own') or public.can_edit_project(project_id)) with check(public.has_permission('users','manage_users','own') or public.can_edit_project(project_id));
create policy drive_settings_read on public.google_drive_settings for select to authenticated using(public.has_permission('integrations','view','own'));
create policy drive_settings_manage on public.google_drive_settings for all to authenticated using(public.has_permission('integrations','manage_settings','own')) with check(public.has_permission('integrations','manage_settings','own'));
create policy drive_connections_read on public.google_drive_connections for select to authenticated using(user_id=auth.uid() or public.has_permission('integrations','view','all'));
create policy drive_connections_manage on public.google_drive_connections for all to authenticated using(user_id=auth.uid() or public.has_permission('integrations','manage_settings','own')) with check(user_id=auth.uid() or public.has_permission('integrations','manage_settings','own'));
create policy permission_catalog_read on public.permission_catalog for select to authenticated using(public.current_user_access_valid());
create policy permission_profiles_read on public.permission_profiles for select to authenticated using(public.current_user_access_valid() and (public.has_permission('users','view','own') or id=(select permission_profile_id from public.profiles where id=auth.uid())));
create policy permission_profiles_manage on public.permission_profiles for all to authenticated using(public.has_permission('users','manage_users','own')) with check(public.has_permission('users','manage_users','own'));
create policy profile_permissions_read on public.profile_permissions for select to authenticated using(public.current_user_access_valid() and (public.has_permission('users','view','own') or profile_id=(select permission_profile_id from public.profiles where id=auth.uid())));
create policy profile_permissions_manage on public.profile_permissions for all to authenticated using(public.has_permission('users','manage_users','own')) with check(public.has_permission('users','manage_users','own'));
create policy user_permission_overrides_read on public.user_permission_overrides for select to authenticated using(user_id=auth.uid() or public.has_permission('users','manage_users','own'));
create policy user_permission_overrides_manage on public.user_permission_overrides for all to authenticated using(public.has_permission('users','manage_users','own')) with check(public.has_permission('users','manage_users','own'));
create policy system_settings_read on public.system_settings for select to authenticated using(public.has_permission('settings','view','own'));
create policy system_settings_manage on public.system_settings for all to authenticated using(public.has_permission('settings','manage_settings','own')) with check(public.has_permission('settings','manage_settings','own'));
create policy project_stages_read on public.project_stages for select to authenticated using(public.current_user_access_valid());
create policy project_stages_manage on public.project_stages for all to authenticated using(public.has_permission('settings','manage_settings','own')) with check(public.has_permission('settings','manage_settings','own'));
create policy project_statuses_read on public.project_statuses for select to authenticated using(public.current_user_access_valid());
create policy project_statuses_manage on public.project_statuses for all to authenticated using(public.has_permission('settings','manage_settings','own')) with check(public.has_permission('settings','manage_settings','own'));
create policy activity_statuses_read on public.activity_statuses for select to authenticated using(public.current_user_access_valid());
create policy activity_statuses_manage on public.activity_statuses for all to authenticated using(public.has_permission('settings','manage_settings','own')) with check(public.has_permission('settings','manage_settings','own'));
create policy system_categories_read on public.system_categories for select to authenticated using(public.has_permission('settings','view','own'));
create policy system_categories_manage on public.system_categories for all to authenticated using(public.has_permission('settings','manage_settings','own')) with check(public.has_permission('settings','manage_settings','own'));
create policy system_versions_read on public.system_versions for select to authenticated using(public.has_permission('versions','view','own'));
create policy system_versions_manage on public.system_versions for all to authenticated using(public.has_permission('versions','create','own')) with check(public.has_permission('versions','create','own'));
create policy security_audit_read on public.security_audit_events for select to authenticated using(public.has_permission('security','view','own'));
create policy checklist_templates_read on public.checklist_templates for select to authenticated using(public.has_permission('checklists','view','own'));
create policy checklist_templates_manage on public.checklist_templates for all to authenticated using(public.has_permission('checklists','manage_settings','own') or public.has_permission('checklists','edit','own')) with check(public.has_permission('checklists','manage_settings','own') or public.has_permission('checklists','edit','own'));
create policy checklist_template_items_read on public.checklist_template_items for select to authenticated using(public.has_permission('checklists','view','own'));
create policy checklist_template_items_manage on public.checklist_template_items for all to authenticated using(public.has_permission('checklists','manage_settings','own') or public.has_permission('checklists','edit','own')) with check(public.has_permission('checklists','manage_settings','own') or public.has_permission('checklists','edit','own'));
create policy checklist_applications_access on public.checklist_applications for select to authenticated using(public.can_access_project(project_id));
create policy project_checklist_select on public.project_checklist_items for select to authenticated using(public.can_access_project(project_id));
create policy project_checklist_insert on public.project_checklist_items for insert to authenticated with check(public.can_edit_project(project_id) and public.has_permission('checklists','edit','assigned'));
create policy project_checklist_update on public.project_checklist_items for update to authenticated using(public.can_edit_project(project_id) and public.has_permission('checklists','edit','assigned')) with check(public.can_edit_project(project_id) and public.has_permission('checklists','edit','assigned'));
create policy project_checklist_delete on public.project_checklist_items for delete to authenticated using(public.can_edit_project(project_id) and public.has_permission('checklists','delete','assigned'));

-- Substitui políticas abertas nas tabelas operacionais existentes.
do $$ declare r record;begin
  if to_regclass('public.projects') is not null then
    for r in select policyname from pg_policies where schemaname='public' and tablename='projects' loop execute format('drop policy if exists %I on public.projects',r.policyname);end loop;
    execute 'create policy projects_select_scope on public.projects for select to authenticated using(public.can_access_project(id))';
    execute 'create policy projects_insert_scope on public.projects for insert to authenticated with check(public.has_permission(''projects'',''create'',''own''))';
    execute 'create policy projects_update_scope on public.projects for update to authenticated using(public.can_edit_project(id)) with check(public.can_edit_project(id))';
    execute 'create policy projects_delete_scope on public.projects for delete to authenticated using(public.has_permission(''projects'',''delete'',''all''))';
  end if;
  if to_regclass('public.clients') is not null then
    for r in select policyname from pg_policies where schemaname='public' and tablename='clients' loop execute format('drop policy if exists %I on public.clients',r.policyname);end loop;
    execute 'create policy clients_select_scope on public.clients for select to authenticated using(public.can_access_client(id))';
    execute 'create policy clients_insert_scope on public.clients for insert to authenticated with check(public.has_permission(''clients'',''create'',''own''))';
    execute 'create policy clients_update_scope on public.clients for update to authenticated using(public.has_permission(''clients'',''edit'',''all'') or public.can_access_client(id)) with check(public.has_permission(''clients'',''edit'',''all'') or public.can_access_client(id))';
    execute 'create policy clients_delete_scope on public.clients for delete to authenticated using(public.has_permission(''clients'',''delete'',''all''))';
  end if;
  if to_regclass('public.project_activities') is not null then
    for r in select policyname from pg_policies where schemaname='public' and tablename='project_activities' loop execute format('drop policy if exists %I on public.project_activities',r.policyname);end loop;
    execute 'create policy activities_select_scope on public.project_activities for select to authenticated using(public.can_access_activity(id))';
    execute 'create policy activities_insert_scope on public.project_activities for insert to authenticated with check(public.has_permission(''activities'',''create'',''own'') and (project_id is null or public.can_edit_project(project_id)))';
    execute 'create policy activities_update_scope on public.project_activities for update to authenticated using(public.has_permission(''activities'',''edit'',''assigned'') and public.can_access_activity(id)) with check(public.has_permission(''activities'',''edit'',''assigned'') and public.can_access_activity(id))';
    execute 'create policy activities_delete_scope on public.project_activities for delete to authenticated using(public.has_permission(''activities'',''delete'',''assigned'') and public.can_access_activity(id))';
  end if;
  if to_regclass('public.calendar_events') is not null then
    for r in select policyname from pg_policies where schemaname='public' and tablename='calendar_events' loop execute format('drop policy if exists %I on public.calendar_events',r.policyname);end loop;
    execute 'create policy calendar_select_scope on public.calendar_events for select to authenticated using(public.can_access_calendar_event(id))';
    execute 'create policy calendar_insert_scope on public.calendar_events for insert to authenticated with check(public.has_permission(''agenda'',''create'',''own'') and (project_id is null or public.can_edit_project(project_id)))';
    execute 'create policy calendar_update_scope on public.calendar_events for update to authenticated using(public.has_permission(''agenda'',''edit'',''assigned'') and public.can_access_calendar_event(id)) with check(public.has_permission(''agenda'',''edit'',''assigned'') and public.can_access_calendar_event(id))';
    execute 'create policy calendar_delete_scope on public.calendar_events for delete to authenticated using(public.has_permission(''agenda'',''delete'',''assigned'') and public.can_access_calendar_event(id))';
  end if;
  if to_regclass('public.project_files') is not null then
    for r in select policyname from pg_policies where schemaname='public' and tablename='project_files' loop execute format('drop policy if exists %I on public.project_files',r.policyname);end loop;
    execute 'create policy project_files_select_scope on public.project_files for select to authenticated using(public.can_access_project(project_id) and public.has_permission(''files'',''view'',''assigned''))';
    execute 'create policy project_files_insert_scope on public.project_files for insert to authenticated with check(public.can_edit_project(project_id) and public.has_permission(''files'',''add_file'',''assigned''))';
    execute 'create policy project_files_update_scope on public.project_files for update to authenticated using(public.can_edit_project(project_id) and public.has_permission(''files'',''add_file'',''assigned'')) with check(public.can_edit_project(project_id) and public.has_permission(''files'',''add_file'',''assigned''))';
    execute 'create policy project_files_delete_scope on public.project_files for delete to authenticated using(public.can_edit_project(project_id) and public.has_permission(''files'',''remove_file'',''assigned''))';
  end if;
  if to_regclass('public.financial_entries') is not null then
    for r in select policyname from pg_policies where schemaname='public' and tablename='financial_entries' loop execute format('drop policy if exists %I on public.financial_entries',r.policyname);end loop;
    execute 'create policy financial_entries_select_scope on public.financial_entries for select to authenticated using(public.can_view_finance(environment))';
    execute 'create policy financial_entries_insert_scope on public.financial_entries for insert to authenticated with check((environment=''personal'' and public.has_permission(''finance_personal'',''create'',''own'')) or (environment=''professional'' and public.has_permission(''finance_professional'',''create'',''own'')))';
    execute 'create policy financial_entries_update_scope on public.financial_entries for update to authenticated using((environment=''personal'' and public.has_permission(''finance_personal'',''edit'',''own'')) or (environment=''professional'' and public.has_permission(''finance_professional'',''edit'',''own''))) with check((environment=''personal'' and public.has_permission(''finance_personal'',''edit'',''own'')) or (environment=''professional'' and public.has_permission(''finance_professional'',''edit'',''own'')))';
    execute 'create policy financial_entries_delete_scope on public.financial_entries for delete to authenticated using((environment=''personal'' and public.has_permission(''finance_personal'',''cancel_entry'',''own'')) or (environment=''professional'' and public.has_permission(''finance_professional'',''cancel_entry'',''own'')))';
  end if;
  if to_regclass('public.project_financial_entries') is not null then
    for r in select policyname from pg_policies where schemaname='public' and tablename='project_financial_entries' loop execute format('drop policy if exists %I on public.project_financial_entries',r.policyname);end loop;
    execute 'create policy project_financial_select_scope on public.project_financial_entries for select to authenticated using(public.has_permission(''finance_professional'',''view'',''own''))';
    execute 'create policy project_financial_insert_scope on public.project_financial_entries for insert to authenticated with check(public.has_permission(''finance_professional'',''create'',''own''))';
    execute 'create policy project_financial_update_scope on public.project_financial_entries for update to authenticated using(public.has_permission(''finance_professional'',''edit'',''own'')) with check(public.has_permission(''finance_professional'',''edit'',''own''))';
    execute 'create policy project_financial_delete_scope on public.project_financial_entries for delete to authenticated using(public.has_permission(''finance_professional'',''cancel_entry'',''own''))';
  end if;
  if to_regclass('public.project_deliverables') is not null then
    for r in select policyname from pg_policies where schemaname='public' and tablename='project_deliverables' loop execute format('drop policy if exists %I on public.project_deliverables',r.policyname);end loop;
    execute 'create policy project_deliverables_select_scope on public.project_deliverables for select to authenticated using(public.can_access_project(project_id))';
    execute 'create policy project_deliverables_insert_scope on public.project_deliverables for insert to authenticated with check(public.can_edit_project(project_id))';
    execute 'create policy project_deliverables_update_scope on public.project_deliverables for update to authenticated using(public.can_edit_project(project_id)) with check(public.can_edit_project(project_id))';
    execute 'create policy project_deliverables_delete_scope on public.project_deliverables for delete to authenticated using(public.can_edit_project(project_id))';
  end if;
  if to_regclass('public.project_comments') is not null then
    for r in select policyname from pg_policies where schemaname='public' and tablename='project_comments' loop execute format('drop policy if exists %I on public.project_comments',r.policyname);end loop;
    execute 'create policy project_comments_select_scope on public.project_comments for select to authenticated using(public.can_access_project(project_id))';
    execute 'create policy project_comments_insert_scope on public.project_comments for insert to authenticated with check(public.can_access_project(project_id) and coalesce(author_id,auth.uid())=auth.uid())';
    execute 'create policy project_comments_update_scope on public.project_comments for update to authenticated using(author_id=auth.uid() and public.can_access_project(project_id)) with check(author_id=auth.uid() and public.can_access_project(project_id))';
    execute 'create policy project_comments_delete_scope on public.project_comments for delete to authenticated using(author_id=auth.uid() or public.can_edit_project(project_id))';
  end if;
  if to_regclass('public.project_history') is not null then
    for r in select policyname from pg_policies where schemaname='public' and tablename='project_history' loop execute format('drop policy if exists %I on public.project_history',r.policyname);end loop;
    execute 'create policy project_history_select_scope on public.project_history for select to authenticated using(public.can_access_project(project_id))';
  end if;
  if to_regclass('public.project_revisions') is not null then
    for r in select policyname from pg_policies where schemaname='public' and tablename='project_revisions' loop execute format('drop policy if exists %I on public.project_revisions',r.policyname);end loop;
    execute 'create policy project_revisions_select_scope on public.project_revisions for select to authenticated using(public.can_access_project(project_id))';
    execute 'create policy project_revisions_insert_scope on public.project_revisions for insert to authenticated with check(public.can_edit_project(project_id))';
    execute 'create policy project_revisions_update_scope on public.project_revisions for update to authenticated using(public.can_edit_project(project_id)) with check(public.can_edit_project(project_id))';
    execute 'create policy project_revisions_delete_scope on public.project_revisions for delete to authenticated using(public.can_edit_project(project_id))';
  end if;
end $$;

-- Privilégios: anon não acessa tabelas administrativas; authenticated depende da RLS.
revoke all on public.teams,public.team_members,public.project_members,public.google_drive_settings,public.google_drive_connections,public.permission_catalog,public.permission_profiles,public.profile_permissions,public.user_permission_overrides,public.system_settings,public.project_stages,public.project_statuses,public.activity_statuses,public.system_categories,public.system_versions,public.security_audit_events,public.checklist_templates,public.checklist_template_items,public.checklist_applications,public.project_files,public.financial_entries from anon;
grant select,insert,update,delete on public.teams,public.team_members,public.project_members,public.google_drive_settings,public.permission_profiles,public.profile_permissions,public.user_permission_overrides,public.system_settings,public.project_stages,public.project_statuses,public.activity_statuses,public.system_categories,public.system_versions,public.checklist_templates,public.checklist_template_items,public.project_files,public.financial_entries to authenticated;
grant select on public.permission_catalog,public.security_audit_events,public.checklist_applications to authenticated;
grant select,insert,update,delete on public.profiles,public.projects,public.clients,public.calendar_events,public.project_activities,public.project_checklist_items to authenticated;
do $$ declare t text;begin
  foreach t in array array['project_deliverables','project_comments','project_revisions','project_financial_entries'] loop
    if to_regclass('public.'||t) is not null then execute format('grant select,insert,update,delete on public.%I to authenticated',t);end if;
  end loop;
  if to_regclass('public.project_history') is not null then execute 'grant select on public.project_history to authenticated';end if;
end $$;
revoke all on public.google_drive_connections from anon,authenticated;
do $$ begin
  if to_regclass('public.security_audit_events_id_seq') is not null then
    execute 'grant usage,select on sequence public.security_audit_events_id_seq to authenticated';
  end if;
end $$;

-- Funções SECURITY DEFINER não permanecem executáveis por PUBLIC.
revoke all on function public.current_user_access_valid() from public;
revoke all on function public.permission_scope(text,text) from public;
revoke all on function public.has_permission(text,text,text) from public;
revoke all on function public.current_access_context() from public;
revoke all on function public.can_access_project(uuid) from public;
revoke all on function public.can_edit_project(uuid) from public;
revoke all on function public.can_access_client(uuid) from public;
revoke all on function public.can_access_activity(uuid) from public;
revoke all on function public.can_access_calendar_event(uuid) from public;
revoke all on function public.can_view_finance(text) from public;
revoke all on function public.get_google_drive_connection_status() from public;
revoke all on function public.record_security_event(text,jsonb,text,text) from public;
revoke all on function public.bootstrap_first_administrator(uuid) from public;
revoke all on function public.protect_last_administrator() from public;
revoke all on function public.protect_system_permission_profile() from public;
revoke all on function public.protect_core_admin_permission() from public;
revoke all on function public.audit_profile_security_change() from public;
revoke all on function public.duplicate_checklist_template(uuid,text) from public;
revoke all on function public.bump_checklist_template_version() from public;
revoke all on function public.apply_stage_checklist_snapshot(uuid,text) from public;
revoke all on function public.apply_checklist_on_project_stage() from public;
revoke all on function public.audit_project_checklist_progress() from public;
do $$ declare signature text;begin
  foreach signature in array array['public.log_project_change()','public.log_project_file_change()','public.handle_new_camilla_user()','public.current_camilla_role()','public.is_camilla_admin()'] loop
    if to_regprocedure(signature) is not null then execute format('revoke execute on function %s from public',signature);end if;
  end loop;
end $$;
grant execute on function public.current_user_access_valid() to authenticated;
grant execute on function public.permission_scope(text,text) to authenticated;
grant execute on function public.has_permission(text,text,text) to authenticated;
grant execute on function public.current_access_context() to authenticated;
grant execute on function public.can_access_project(uuid) to authenticated;
grant execute on function public.can_edit_project(uuid) to authenticated;
grant execute on function public.can_access_client(uuid) to authenticated;
grant execute on function public.can_access_activity(uuid) to authenticated;
grant execute on function public.can_access_calendar_event(uuid) to authenticated;
grant execute on function public.can_view_finance(text) to authenticated;
grant execute on function public.get_google_drive_connection_status() to authenticated;
grant execute on function public.record_security_event(text,jsonb,text,text) to authenticated;
grant execute on function public.duplicate_checklist_template(uuid,text) to authenticated;
grant execute on function public.bootstrap_first_administrator(uuid) to service_role;

commit;
