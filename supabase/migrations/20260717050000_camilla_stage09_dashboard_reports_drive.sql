-- Camilla Studio 3.0.10 — Etapa 09: Dashboard, Relatórios Gerais e Google Drive
begin;

-- 0. Pré-condições
DO $$
DECLARE version_ok boolean := false;
BEGIN
  IF to_regclass('public.system_versions') IS NULL THEN
    RAISE EXCEPTION 'A tabela public.system_versions não foi encontrada. Aplique as etapas anteriores no projeto Camilla correto.';
  END IF;
  EXECUTE 'select exists(select 1 from public.system_versions where version = ''3.0.9'')' INTO version_ok;
  IF NOT version_ok THEN
    RAISE EXCEPTION 'A Etapa 08 (versão 3.0.9) deve ser aplicada antes da Etapa 09.';
  END IF;
  IF to_regclass('public.projects') IS NULL OR to_regclass('public.project_activities') IS NULL OR to_regclass('public.history_entries') IS NULL OR to_regclass('public.permission_catalog') IS NULL THEN
    RAISE EXCEPTION 'Estruturas obrigatórias de projetos, atividades, histórico ou permissões não foram encontradas.';
  END IF;
END $$;

-- 1. Permissões adicionais
insert into public.permission_catalog(module,action,module_label,action_label,supports_scope,position) values
('dashboard','view_team','Dashboard','Visualizar dados da equipe',true,136),
('dashboard','view_financial','Dashboard','Visualizar indicadores financeiros',false,137),
('reports','view_history','Relatórios','Visualizar histórico operacional',true,138),
('reports','view_productivity','Relatórios','Visualizar produtividade',true,139),
('integrations','connect_drive','Integrações','Conectar Google Drive',false,140),
('integrations','disconnect_drive','Integrações','Desconectar Google Drive',false,141),
('integrations','test_drive','Integrações','Testar Google Drive',false,142),
('files','upload_drive','Arquivos','Enviar ao Google Drive',true,143),
('files','share_drive','Arquivos','Compartilhar no Google Drive',true,144),
('files','revoke_drive_share','Arquivos','Revogar compartilhamento do Drive',true,145),
('files','refresh_drive_metadata','Arquivos','Atualizar metadados do Drive',true,146)
on conflict(module,action) do update set module_label=excluded.module_label,action_label=excluded.action_label,supports_scope=excluded.supports_scope,position=excluded.position;

-- Proprietária e administradores recebem as ações operacionais; acesso financeiro continua dependendo dos módulos financeiros.
insert into public.profile_permissions(profile_id,permission_profile_id,module,action,allowed,scope)
select p.id,p.id,c.module,c.action,true,'all'
from public.permission_profiles p join public.permission_catalog c on c.action in('view_team','view_financial','view_history','view_productivity','connect_drive','disconnect_drive','test_drive','upload_drive','share_drive','revoke_drive_share','refresh_drive_metadata')
where p.code in('owner','administrator')
on conflict(profile_id,module,action) do update set allowed=true,scope='all',updated_at=now();
insert into public.profile_permissions(profile_id,permission_profile_id,module,action,allowed,scope)
select p.id,p.id,c.module,c.action,true,case when c.supports_scope then 'assigned' else 'all' end
from public.permission_profiles p join public.permission_catalog c on c.action in('view_team','view_history','view_productivity','upload_drive','share_drive','revoke_drive_share','refresh_drive_metadata')
where p.code in('manager','architect')
on conflict(profile_id,module,action) do update set allowed=true,scope=excluded.scope,updated_at=now();

-- 2. Auditoria de exportação
create table if not exists public.report_export_audit(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  report_code text not null,
  export_format text not null check(export_format in('csv','pdf')),
  filters jsonb not null default '{}'::jsonb,
  row_count integer not null default 0 check(row_count>=0),
  created_at timestamptz not null default now()
);
create index if not exists report_export_audit_user_created_idx on public.report_export_audit(user_id,created_at desc);
alter table public.report_export_audit enable row level security;
drop policy if exists report_export_audit_select_scope on public.report_export_audit;
create policy report_export_audit_select_scope on public.report_export_audit for select to authenticated using(user_id=auth.uid() or public.has_permission('reports','view_history','all'));
drop policy if exists report_export_audit_insert_block on public.report_export_audit;
create policy report_export_audit_insert_block on public.report_export_audit for insert to authenticated with check(false);

-- 3. Google Drive: metadados públicos e credenciais privadas
alter table public.google_drive_settings
  add column if not exists default_share_role text not null default 'reader',
  add column if not exists allow_public_sharing boolean not null default false,
  add column if not exists last_connection_test_at timestamptz,
  add column if not exists last_connection_error text,
  add column if not exists connected_by uuid references auth.users(id) on delete set null,
  add column if not exists connected_at timestamptz,
  add column if not exists root_folder_id text;

alter table public.google_drive_connections
  add column if not exists drive_user_id text,
  add column if not exists root_folder_id text,
  add column if not exists scopes text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists connection_status text not null default 'disconnected',
  add column if not exists last_error text,
  add column if not exists disconnected_at timestamptz;
create unique index if not exists google_drive_connections_user_active_unique on public.google_drive_connections(user_id) where active;

alter table public.project_files
  add column if not exists drive_connection_id uuid references public.google_drive_connections(id) on delete set null,
  add column if not exists drive_web_view_link text,
  add column if not exists drive_web_content_link text,
  add column if not exists drive_revision_id text,
  add column if not exists drive_checksum text,
  add column if not exists drive_last_synced_at timestamptz,
  add column if not exists drive_sync_error text,
  add column if not exists drive_uploaded_at timestamptz;
create index if not exists project_files_drive_connection_idx on public.project_files(drive_connection_id) where drive_connection_id is not null;
create unique index if not exists project_files_drive_file_unique on public.project_files(drive_connection_id,drive_file_id) where drive_connection_id is not null and drive_file_id is not null and archived_at is null;

create table if not exists public.google_drive_operations(
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.google_drive_connections(id) on delete set null,
  operation_type text not null check(operation_type in('oauth','test','upload','refresh','share','revoke_share','disconnect')),
  status text not null default 'pending' check(status in('pending','processing','completed','failed','cancelled')),
  related_file_id uuid references public.project_files(id) on delete set null,
  relation_type text,
  relation_id text,
  drive_file_id text,
  error_code text,
  error_message text,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists google_drive_operations_user_created_idx on public.google_drive_operations(requested_by,created_at desc);

create table if not exists public.google_drive_shares(
  id uuid primary key default gen_random_uuid(),
  project_file_id uuid not null references public.project_files(id) on delete restrict,
  drive_permission_id text not null,
  share_type text not null default 'user' check(share_type in('user','group','domain','anyone')),
  email_address text,
  role text not null check(role in('reader','commenter','writer')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  unique(project_file_id,drive_permission_id)
);
create index if not exists google_drive_shares_file_idx on public.google_drive_shares(project_file_id,created_at desc);

alter table public.google_drive_operations enable row level security;
alter table public.google_drive_shares enable row level security;
drop policy if exists drive_operations_select_scope on public.google_drive_operations;
create policy drive_operations_select_scope on public.google_drive_operations for select to authenticated using(requested_by=auth.uid() or public.has_permission('integrations','view','all'));
drop policy if exists drive_operations_write_block on public.google_drive_operations;
create policy drive_operations_write_block on public.google_drive_operations for all to authenticated using(false) with check(false);
drop policy if exists drive_shares_select_scope on public.google_drive_shares;
create policy drive_shares_select_scope on public.google_drive_shares for select to authenticated using(public.can_access_linked_file(project_file_id,false));
drop policy if exists drive_shares_write_block on public.google_drive_shares;
create policy drive_shares_write_block on public.google_drive_shares for all to authenticated using(false) with check(false);

create schema if not exists integration_private;
revoke all on schema integration_private from public,anon,authenticated;
create table if not exists integration_private.google_drive_credentials(
  connection_id uuid primary key references public.google_drive_connections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  encrypted_payload text not null,
  iv text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists integration_private.google_drive_oauth_states(
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  return_to text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
revoke all on all tables in schema integration_private from public,anon,authenticated;

insert into public.system_settings(key,value,description) values
('google_drive_oauth_configured','false'::jsonb,'Indica que os secrets OAuth do Google Drive foram configurados nas Edge Functions.'),
('dashboard_deadline_warning_days','7'::jsonb,'Quantidade de dias para destacar projetos próximos do prazo.'),
('dashboard_upcoming_limit','8'::jsonb,'Quantidade máxima de compromissos futuros exibidos no Dashboard.'),
('reports_default_page_size','100'::jsonb,'Quantidade padrão de registros por página nos relatórios.')
on conflict(key) do update set description=excluded.description,updated_at=now();

-- 4. Funções auxiliares de relatório
create or replace function public.stage09_safe_date(value text, fallback date) returns date language plpgsql immutable as $$
begin
  if nullif(trim(coalesce(value,'')),'') is null then return fallback; end if;
  return value::date;
exception when others then return fallback;
end $$;

create or replace function public.register_report_export(p_report_code text,p_export_format text,p_filters jsonb default '{}'::jsonb,p_row_count integer default 0)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare new_id uuid;
begin
  if auth.uid() is null or not public.has_permission('reports','export','own') then raise exception 'Sem permissão para exportar relatórios.'; end if;
  if p_export_format not in('csv','pdf') then raise exception 'Formato de exportação inválido.'; end if;
  insert into public.report_export_audit(user_id,report_code,export_format,filters,row_count) values(auth.uid(),p_report_code,p_export_format,coalesce(p_filters,'{}'::jsonb),greatest(coalesce(p_row_count,0),0)) returning id into new_id;
  insert into public.history_entries(module,record_type,record_id,actor_user_id,action,description,metadata,source_table,source_id)
  values('reports','report_export',new_id::text,auth.uid(),'export','Relatório exportado.',jsonb_build_object('report_code',p_report_code,'format',p_export_format,'row_count',p_row_count),'report_export_audit',new_id::text);
  return new_id;
end $$;

create or replace function public.get_report_filter_options() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
select jsonb_build_object(
 'projects',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'label',p.code||' — '||p.name) order by p.code) from public.projects p where p.archived_at is null and public.can_access_project(p.id)),'[]'::jsonb),
 'clients',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'label',c.name) order by c.name) from public.clients c where c.archived_at is null and public.can_access_client(c.id)),'[]'::jsonb),
 'responsible',coalesce((select jsonb_agg(jsonb_build_object('id',pr.id,'label',pr.name) order by pr.name) from public.profiles pr where pr.active and pr.archived_at is null and (public.has_permission('users','view','all') or pr.id=auth.uid())),'[]'::jsonb),
 'stages',coalesce((select jsonb_agg(jsonb_build_object('id',s.code,'label',s.name) order by s.position) from public.project_stages s where s.active and s.archived_at is null),'[]'::jsonb),
 'statuses',coalesce((select jsonb_agg(jsonb_build_object('id',s.code,'label',s.name) order by s.position) from public.project_statuses s where s.active and s.archived_at is null),'[]'::jsonb),
 'modules',coalesce((select jsonb_agg(jsonb_build_object('id',x.module,'label',x.module) order by x.module) from (select distinct h.module from public.history_entries h where public.can_access_history_entry(h.id)) x),'[]'::jsonb)
)
$$;

-- 5. Dashboard consolidado e permission-aware
create or replace function public.get_dashboard_workspace(p_filters jsonb default '{}'::jsonb,p_include_financial boolean default false)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare
  today_value date := (now() at time zone 'America/Boa_Vista')::date;
  start_value date := public.stage09_safe_date(p_filters->>'start_date',date_trunc('month',(now() at time zone 'America/Boa_Vista'))::date);
  end_value date := public.stage09_safe_date(p_filters->>'end_date',(date_trunc('month',(now() at time zone 'America/Boa_Vista'))+interval '1 month - 1 day')::date);
  responsible_value uuid := public.safe_uuid(p_filters->>'responsible_user_id');
  project_value uuid := public.safe_uuid(p_filters->>'project_id');
  client_value uuid := public.safe_uuid(p_filters->>'client_id');
  warning_days integer := coalesce((select (value #>> '{}')::integer from public.system_settings where key='dashboard_deadline_warning_days'),7);
  upcoming_limit integer := coalesce((select (value #>> '{}')::integer from public.system_settings where key='dashboard_upcoming_limit'),8);
  financial_visible boolean := false;
  result jsonb;
begin
  if auth.uid() is null or not public.has_permission('dashboard','view','own') then raise exception 'Sem permissão para visualizar o Dashboard.'; end if;
  financial_visible:=p_include_financial and public.has_permission('dashboard','view_financial','own') and public.can_access_finance_environment('professional',null,'view_values');
  with ap as(
    select p.*,coalesce(ps.name,p.stage) stage_name,coalesce(pst.name,p.status) status_name,c.name client_name,coalesce(pr.name,p.responsible_name,'Sem responsável') responsible_label
    from public.projects p left join public.project_stages ps on ps.code=p.stage left join public.project_statuses pst on pst.code=p.status left join public.clients c on c.id=p.client_id left join public.profiles pr on pr.id=p.responsible_user_id
    where p.archived_at is null and public.can_access_project(p.id)
      and (project_value is null or p.id=project_value) and (client_value is null or p.client_id=client_value) and (responsible_value is null or p.responsible_user_id=responsible_value)
  ), aa as(
    select a.*,coalesce(s.name,a.status) status_name,p.name project_name,c.name client_name,coalesce(pr.name,a.responsible_name,'Sem responsável') responsible_label
    from public.project_activities a left join public.activity_statuses s on s.code=a.status left join public.projects p on p.id=a.project_id left join public.clients c on c.id=coalesce(a.client_id,p.client_id) left join public.profiles pr on pr.id=a.responsible_user_id
    where a.archived_at is null and a.deleted_at is null and public.can_access_activity(a.id)
      and (project_value is null or a.project_id=project_value) and (client_value is null or coalesce(a.client_id,p.client_id)=client_value) and (responsible_value is null or a.responsible_user_id=responsible_value)
  ), ag as(
    select ai.* from public.agenda_items ai
    where ai.starts_at is not null
      and (project_value is null or ai.project_id=project_value) and (client_value is null or ai.client_id=client_value) and (responsible_value is null or ai.responsible_user_id=responsible_value)
      and ((ai.source_type='event' and public.can_access_calendar_event(ai.source_id)) or (ai.source_type='activity' and public.can_access_activity(ai.source_id)) or (ai.source_type='project_date' and public.can_access_project(ai.project_id)))
  ), fin as(
    select f.* from public.financial_entry_balance_view f where financial_visible and f.environment='professional' and f.archived_at is null and public.can_access_finance_environment(f.environment,f.owner_user_id,'view')
      and (project_value is null or f.project_id=project_value) and (client_value is null or f.client_id=client_value)
  )
  select jsonb_build_object(
    'generated_at',now(),
    'filters',jsonb_build_object('start_date',start_value,'end_date',end_value,'responsible_user_id',coalesce(responsible_value::text,''),'project_id',coalesce(project_value::text,''),'client_id',coalesce(client_value::text,'')),
    'metrics',jsonb_build_array(
      jsonb_build_object('code','projects_active','label','Projetos ativos','value',(select count(*) from ap where stage<>'completed' and status<>'cancelled'),'tone','info','href','/projects'),
      jsonb_build_object('code','projects_late','label','Projetos atrasados','value',(select count(*) from ap where main_deadline<today_value and stage<>'completed' and status<>'cancelled'),'tone','danger','href','/projects'),
      jsonb_build_object('code','projects_near','label','Próximos do prazo','value',(select count(*) from ap where main_deadline between today_value and today_value+warning_days and stage<>'completed' and status<>'cancelled'),'tone','warning','href','/projects'),
      jsonb_build_object('code','activities_today','label','Atividades de hoje','value',(select count(*) from aa where coalesce(due_at::date,due_date)=today_value and status not in('completed','cancelled')),'tone','info','href','/activities'),
      jsonb_build_object('code','activities_late','label','Atividades atrasadas','value',(select count(*) from aa where coalesce(due_at::date,due_date)<today_value and status not in('completed','cancelled')),'tone','danger','href','/activities'),
      jsonb_build_object('code','activities_week','label','Atividades da semana','value',(select count(*) from aa where coalesce(starts_at::date,due_at::date,due_date) between today_value and today_value+6 and status<>'cancelled'),'tone','neutral','href','/activities'),
      jsonb_build_object('code','agenda_today','label','Agenda do dia','value',(select count(*) from ag where starts_at::date=today_value and status<>'cancelled'),'tone','neutral','href','/agenda'),
      jsonb_build_object('code','pending_checklists','label','Checklist obrigatório','value',(select count(*) from public.project_checklist_items ci join ap p on p.id=ci.project_id where ci.required and ci.completed_at is null and ci.waived_at is null),'tone','warning','href','/projects'),
      jsonb_build_object('code','unread_notifications','label','Alertas não lidos','value',(select count(*) from public.notifications n where n.user_id=auth.uid() and n.read_at is null and n.archived_at is null),'tone','warning','href','/notifications')
    ),
    'projects_by_stage',coalesce((select jsonb_agg(row_value order by count_value desc) from(select jsonb_build_object('code',stage,'label',stage_name,'color',max(ps.color),'count',count(*)) row_value,count(*) count_value from ap left join public.project_stages ps on ps.code=ap.stage where stage<>'completed' group by stage,stage_name) q),'[]'::jsonb),
    'projects_by_responsible',coalesce((select jsonb_agg(jsonb_build_object('code',coalesce(responsible_user_id::text,'none'),'label',responsible_label,'count',total) order by total desc) from(select responsible_user_id,responsible_label,count(*) total from ap where stage<>'completed' group by responsible_user_id,responsible_label) q),'[]'::jsonb),
    'activities_by_status',coalesce((select jsonb_agg(jsonb_build_object('code',status,'label',status_name,'color',color,'count',total) order by total desc) from(select aa.status,aa.status_name,max(s.color) color,count(*) total from aa left join public.activity_statuses s on s.code=aa.status group by aa.status,aa.status_name) q),'[]'::jsonb),
    'activities_by_responsible',coalesce((select jsonb_agg(jsonb_build_object('code',coalesce(responsible_user_id::text,'none'),'label',responsible_label,'count',total) order by total desc) from(select responsible_user_id,responsible_label,count(*) total from aa where status<>'cancelled' group by responsible_user_id,responsible_label) q),'[]'::jsonb),
    'agenda_today',coalesce((select jsonb_agg(jsonb_build_object('id',item_key,'title',title,'subtitle',coalesce(project_name,client_name,item_type),'status',status,'date',starts_at,'href',case source_type when 'activity' then '/activities?activity='||source_id else '/agenda?item='||item_key end) order by starts_at) from ag where starts_at::date=today_value and status<>'cancelled'),'[]'::jsonb),
    'upcoming_commitments',coalesce((select jsonb_agg(item order by starts_at) from(select starts_at,jsonb_build_object('id',item_key,'title',title,'subtitle',coalesce(project_name,client_name,item_type),'status',status,'date',starts_at,'href',case source_type when 'activity' then '/activities?activity='||source_id else '/agenda?item='||item_key end) item from ag where starts_at>now() and status<>'cancelled' order by starts_at limit upcoming_limit) q),'[]'::jsonb),
    'recent_clients',coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',name,'subtitle',movement,'date',last_movement,'href','/clients/'||id) order by last_movement desc) from(select c.id,c.name,greatest(c.updated_at,coalesce(max(p.updated_at),c.updated_at),coalesce(max(a.updated_at),c.updated_at)) last_movement,case when max(a.updated_at)>=max(p.updated_at) then 'Atividade atualizada' else 'Projeto atualizado' end movement from public.clients c left join ap p on p.client_id=c.id left join aa a on coalesce(a.client_id,(select px.client_id from public.projects px where px.id=a.project_id))=c.id where c.archived_at is null and public.can_access_client(c.id) group by c.id,c.name,c.updated_at order by last_movement desc limit 8) q),'[]'::jsonb),
    'pending_items',coalesce((select jsonb_agg(item order by sort_date nulls last) from(
       select p.main_deadline::timestamptz sort_date,jsonb_build_object('id','project:'||p.id,'title',p.code||' — '||p.name,'subtitle','Projeto atrasado','meta',(today_value-p.main_deadline)||' dia(s)','date',p.main_deadline,'href','/projects/'||p.id) item from ap p where p.main_deadline<today_value and p.stage<>'completed' and p.status<>'cancelled'
       union all select coalesce(a.due_at,a.due_date::timestamptz),jsonb_build_object('id','activity:'||a.id,'title',a.title,'subtitle','Atividade atrasada','meta',a.project_name,'date',coalesce(a.due_at,a.due_date::timestamptz),'href','/activities?activity='||a.id) from aa a where coalesce(a.due_at::date,a.due_date)<today_value and a.status not in('completed','cancelled')
       union all select null::timestamptz,jsonb_build_object('id','checklist:'||ci.id,'title',ci.title,'subtitle','Checklist obrigatório pendente','meta',p.code||' — '||p.name,'href','/projects/'||p.id||'?section=checklist') from public.project_checklist_items ci join ap p on p.id=ci.project_id where ci.required and ci.completed_at is null and ci.waived_at is null
       order by sort_date nulls last limit 12
    ) q),'[]'::jsonb),
    'unread',jsonb_build_object(
      'comments',(select count(*) from public.notifications n where n.user_id=auth.uid() and n.read_at is null and n.archived_at is null and n.type_code in('new_comment','comment_mention','important_note')),
      'files',(select count(*) from public.notifications n where n.user_id=auth.uid() and n.read_at is null and n.archived_at is null and n.type_code in('file_added','file_replaced','file_removed')),
      'notifications',(select count(*) from public.notifications n where n.user_id=auth.uid() and n.read_at is null and n.archived_at is null)
    ),
    'financial',case when financial_visible then jsonb_build_object(
       'visible',true,
       'income',coalesce((select sum(paid_amount) from fin where entry_type='income' and competence_date between start_value and end_value),0)::text,
       'expense',coalesce((select sum(paid_amount) from fin where entry_type='expense' and competence_date between start_value and end_value),0)::text,
       'net',(coalesce((select sum(paid_amount) from fin where entry_type='income' and competence_date between start_value and end_value),0)-coalesce((select sum(paid_amount) from fin where entry_type='expense' and competence_date between start_value and end_value),0))::text,
       'receivable',coalesce((select sum(open_amount) from fin where entry_type='income'),0)::text,
       'payable',coalesce((select sum(open_amount) from fin where entry_type='expense'),0)::text,
       'overdue',coalesce((select sum(open_amount) from fin where due_date<today_value and effective_status='overdue'),0)::text,
       'due_soon',coalesce((select sum(open_amount) from fin where due_date between today_value and today_value+warning_days),0)::text,
       'series',coalesce((select jsonb_agg(jsonb_build_object('label',to_char(month_value,'Mon/YY'),'income',income::text,'expense',expense::text) order by month_value) from(select gs::date month_value,coalesce(sum(f.paid_amount) filter(where f.entry_type='income'),0) income,coalesce(sum(f.paid_amount) filter(where f.entry_type='expense'),0) expense from generate_series(date_trunc('month',start_value::timestamp),date_trunc('month',end_value::timestamp),interval '1 month') gs left join fin f on date_trunc('month',f.competence_date::timestamp)=gs group by gs) x),'[]'::jsonb)
    ) else jsonb_build_object('visible',false,'income','0.00','expense','0.00','net','0.00','receivable','0.00','payable','0.00','overdue','0.00','due_soon','0.00','series','[]'::jsonb) end,
    'options',jsonb_build_object(
      'responsible',coalesce((select jsonb_agg(jsonb_build_object('id',pr.id,'label',pr.name) order by pr.name) from public.profiles pr where pr.active and pr.archived_at is null and (pr.id=auth.uid() or public.has_permission('users','view','all'))),'[]'::jsonb),
      'projects',coalesce((select jsonb_agg(jsonb_build_object('id',id,'label',code||' — '||name) order by code) from ap),'[]'::jsonb),
      'clients',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'label',c.name) order by c.name) from public.clients c where c.archived_at is null and public.can_access_client(c.id)),'[]'::jsonb)
    )
  ) into result;
  return result;
end $$;

-- 6. Catálogo de relatórios operacionais
create or replace function public.get_operational_report(p_report_code text,p_filters jsonb default '{}'::jsonb,p_limit integer default 100,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare
  start_value date:=public.stage09_safe_date(p_filters->>'start_date',date_trunc('month',(now() at time zone 'America/Boa_Vista'))::date);
  end_value date:=public.stage09_safe_date(p_filters->>'end_date',(date_trunc('month',(now() at time zone 'America/Boa_Vista'))+interval '1 month - 1 day')::date);
  project_value uuid:=public.safe_uuid(p_filters->>'project_id'); client_value uuid:=public.safe_uuid(p_filters->>'client_id'); responsible_value uuid:=public.safe_uuid(p_filters->>'responsible_user_id');
  stage_value text:=nullif(p_filters->>'stage',''); status_value text:=nullif(p_filters->>'status',''); module_value text:=nullif(p_filters->>'module',''); author_value uuid:=public.safe_uuid(p_filters->>'author_user_id');
  limit_value integer:=least(greatest(coalesce(p_limit,100),1),500); offset_value integer:=greatest(coalesce(p_offset,0),0);
  rows_value jsonb:='[]'::jsonb; chart_value jsonb:='[]'::jsonb; summary_value jsonb:='{}'::jsonb; total_value integer:=0; title_value text; money_total numeric:=0;
begin
  if auth.uid() is null or not public.has_permission('reports','view','own') then raise exception 'Sem permissão para visualizar relatórios.'; end if;
  if p_report_code in('history') and not public.has_permission('reports','view_history','own') then raise exception 'Sem permissão para visualizar o histórico.'; end if;
  if p_report_code in('productivity') and not public.has_permission('reports','view_productivity','own') then raise exception 'Sem permissão para visualizar produtividade.'; end if;
  if p_report_code in('receivables','payables') and not(public.has_permission('reports','view_values','own') and public.can_access_finance_environment('professional',null,'view_values')) then raise exception 'Sem permissão para visualizar valores financeiros.'; end if;

  if p_report_code='projects_by_stage' then
    title_value:='Projetos por etapa';
    with base as(select p.*,coalesce(s.name,p.stage) stage_name from public.projects p left join public.project_stages s on s.code=p.stage where p.archived_at is null and public.can_access_project(p.id) and (project_value is null or p.id=project_value) and(client_value is null or p.client_id=client_value) and(responsible_value is null or p.responsible_user_id=responsible_value) and(stage_value is null or p.stage=stage_value) and(status_value is null or p.status=status_value)), grouped as(select stage,stage_name,count(*) total,count(*) filter(where main_deadline<current_date and stage<>'completed') late from base group by stage,stage_name)
    select count(*),coalesce(jsonb_agg(to_jsonb(x) order by x.total desc),'[]'::jsonb),coalesce(jsonb_agg(jsonb_build_object('label',x.stage_name,'value',x.total)),'[]'::jsonb) into total_value,rows_value,chart_value from(select * from grouped order by total desc limit limit_value offset offset_value)x;
  elsif p_report_code='projects_by_status' then
    title_value:='Projetos por status';with base as(select p.*,coalesce(s.name,p.status) status_name from public.projects p left join public.project_statuses s on s.code=p.status where p.archived_at is null and public.can_access_project(p.id) and(project_value is null or p.id=project_value) and(client_value is null or p.client_id=client_value) and(responsible_value is null or p.responsible_user_id=responsible_value) and(stage_value is null or p.stage=stage_value) and(status_value is null or p.status=status_value)),g as(select status,status_name,count(*) total,count(*) filter(where main_deadline<current_date and stage<>'completed') late from base group by status,status_name) select count(*),coalesce(jsonb_agg(to_jsonb(x) order by x.total desc),'[]'::jsonb),coalesce(jsonb_agg(jsonb_build_object('label',x.status_name,'value',x.total)),'[]'::jsonb) into total_value,rows_value,chart_value from(select * from g order by total desc limit limit_value offset offset_value)x;
  elsif p_report_code='projects_by_responsible' then
    title_value:='Projetos por responsável';with base as(select p.*,coalesce(pr.name,p.responsible_name,'Sem responsável') responsible_label from public.projects p left join public.profiles pr on pr.id=p.responsible_user_id where p.archived_at is null and public.can_access_project(p.id) and(project_value is null or p.id=project_value) and(client_value is null or p.client_id=client_value) and(responsible_value is null or p.responsible_user_id=responsible_value) and(stage_value is null or p.stage=stage_value) and(status_value is null or p.status=status_value)),g as(select responsible_label responsible_name,count(*) total,count(*) filter(where main_deadline<current_date and stage<>'completed') late from base group by responsible_label) select count(*),coalesce(jsonb_agg(to_jsonb(x) order by x.total desc),'[]'::jsonb),coalesce(jsonb_agg(jsonb_build_object('label',x.responsible_name,'value',x.total)),'[]'::jsonb) into total_value,rows_value,chart_value from(select * from g order by total desc limit limit_value offset offset_value)x;
  elsif p_report_code in('projects_overdue','projects_upcoming') then
    title_value:=case when p_report_code='projects_overdue' then 'Prazos vencidos' else 'Prazos futuros' end;
    with base as(select p.id,p.code,p.name,c.name client_name,coalesce(pr.name,p.responsible_name,'Sem responsável') responsible_name,coalesce(s.name,p.stage) stage_name,p.main_deadline,(current_date-p.main_deadline) days_late,(p.main_deadline-current_date) days_until from public.projects p left join public.clients c on c.id=p.client_id left join public.profiles pr on pr.id=p.responsible_user_id left join public.project_stages s on s.code=p.stage where p.archived_at is null and p.stage<>'completed' and p.status<>'cancelled' and public.can_access_project(p.id) and(project_value is null or p.id=project_value) and(client_value is null or p.client_id=client_value) and(responsible_value is null or p.responsible_user_id=responsible_value) and(stage_value is null or p.stage=stage_value) and(status_value is null or p.status=status_value) and((p_report_code='projects_overdue' and p.main_deadline<current_date) or(p_report_code='projects_upcoming' and p.main_deadline between start_value and end_value))) select (select count(*) from base),coalesce((select jsonb_agg(to_jsonb(x) order by x.main_deadline) from(select * from base order by main_deadline limit limit_value offset offset_value)x),'[]'::jsonb),coalesce((select jsonb_agg(jsonb_build_object('label',to_char(main_deadline,'DD/MM'),'value',count_value) order by main_deadline) from(select main_deadline,count(*) count_value from base group by main_deadline)x),'[]'::jsonb) into total_value,rows_value,chart_value;
  elsif p_report_code='activities_by_status' then
    title_value:='Atividades por status';with base as(select a.*,coalesce(s.name,a.status) status_name from public.project_activities a left join public.activity_statuses s on s.code=a.status left join public.projects p on p.id=a.project_id where a.archived_at is null and a.deleted_at is null and public.can_access_activity(a.id) and(project_value is null or a.project_id=project_value) and(client_value is null or coalesce(a.client_id,p.client_id)=client_value) and(responsible_value is null or a.responsible_user_id=responsible_value) and(status_value is null or a.status=status_value)),g as(select status,status_name,count(*) total,count(*) filter(where coalesce(due_at::date,due_date)<current_date and status not in('completed','cancelled')) overdue from base group by status,status_name)select count(*),coalesce(jsonb_agg(to_jsonb(x) order by x.total desc),'[]'::jsonb),coalesce(jsonb_agg(jsonb_build_object('label',x.status_name,'value',x.total)),'[]'::jsonb) into total_value,rows_value,chart_value from(select * from g order by total desc limit limit_value offset offset_value)x;
  elsif p_report_code='activities_by_responsible' then
    title_value:='Atividades por responsável';with base as(select a.*,coalesce(pr.name,a.responsible_name,'Sem responsável') responsible_label from public.project_activities a left join public.profiles pr on pr.id=a.responsible_user_id left join public.projects p on p.id=a.project_id where a.archived_at is null and a.deleted_at is null and public.can_access_activity(a.id) and(project_value is null or a.project_id=project_value) and(client_value is null or coalesce(a.client_id,p.client_id)=client_value) and(responsible_value is null or a.responsible_user_id=responsible_value)),g as(select responsible_label responsible_name,count(*) total,count(*) filter(where status='completed') completed,count(*) filter(where coalesce(due_at::date,due_date)<current_date and status not in('completed','cancelled')) overdue from base group by responsible_label)select count(*),coalesce(jsonb_agg(to_jsonb(x) order by x.total desc),'[]'::jsonb),coalesce(jsonb_agg(jsonb_build_object('label',x.responsible_name,'value',x.total)),'[]'::jsonb) into total_value,rows_value,chart_value from(select * from g order by total desc limit limit_value offset offset_value)x;
  elsif p_report_code='activities_overdue' then
    title_value:='Atividades atrasadas';with base as(select a.id,a.title,p.name project_name,c.name client_name,coalesce(pr.name,a.responsible_name,'Sem responsável') responsible_name,coalesce(a.due_at,a.due_date::timestamptz) due_at,current_date-coalesce(a.due_at::date,a.due_date) days_late from public.project_activities a left join public.projects p on p.id=a.project_id left join public.clients c on c.id=coalesce(a.client_id,p.client_id) left join public.profiles pr on pr.id=a.responsible_user_id where a.archived_at is null and a.deleted_at is null and a.status not in('completed','cancelled') and coalesce(a.due_at::date,a.due_date)<current_date and public.can_access_activity(a.id) and(project_value is null or a.project_id=project_value) and(client_value is null or coalesce(a.client_id,p.client_id)=client_value) and(responsible_value is null or a.responsible_user_id=responsible_value))select(select count(*) from base),coalesce((select jsonb_agg(to_jsonb(x) order by x.due_at) from(select * from base order by due_at limit limit_value offset offset_value)x),'[]'::jsonb),coalesce((select jsonb_agg(jsonb_build_object('label',responsible_name,'value',total)) from(select responsible_name,count(*) total from base group by responsible_name)x),'[]'::jsonb) into total_value,rows_value,chart_value;
  elsif p_report_code='checklists' then
    title_value:='Checklists';with base as(select p.id,p.code project_code,p.name project_name,count(ci.id) total_items,count(ci.id) filter(where ci.completed_at is not null) completed_items,count(ci.id) filter(where ci.required and ci.completed_at is null and ci.waived_at is null) required_pending,case when count(ci.id)=0 then 0 else round((count(ci.id) filter(where ci.completed_at is not null or ci.waived_at is not null))::numeric/count(ci.id)*100,1) end progress from public.projects p left join public.project_checklist_items ci on ci.project_id=p.id where p.archived_at is null and public.can_access_project(p.id) and(project_value is null or p.id=project_value) and(client_value is null or p.client_id=client_value) group by p.id,p.code,p.name)select(select count(*) from base),coalesce((select jsonb_agg(to_jsonb(x) order by x.required_pending desc,x.project_code) from(select * from base order by required_pending desc,project_code limit limit_value offset offset_value)x),'[]'::jsonb),coalesce((select jsonb_agg(jsonb_build_object('label',project_code,'value',progress) order by project_code) from base),'[]'::jsonb) into total_value,rows_value,chart_value;
  elsif p_report_code='clients' then
    title_value:='Clientes';with base as(select c.id,c.name,c.relationship_status,count(distinct p.id) projects,count(distinct a.id) activities,greatest(c.updated_at,coalesce(max(p.updated_at),c.updated_at),coalesce(max(a.updated_at),c.updated_at)) last_movement from public.clients c left join public.projects p on p.client_id=c.id and public.can_access_project(p.id) left join public.project_activities a on(coalesce(a.client_id,p.client_id)=c.id) and public.can_access_activity(a.id) where c.archived_at is null and public.can_access_client(c.id) and(client_value is null or c.id=client_value) group by c.id,c.name,c.relationship_status,c.updated_at)select(select count(*) from base),coalesce((select jsonb_agg(to_jsonb(x) order by x.last_movement desc) from(select * from base order by last_movement desc limit limit_value offset offset_value)x),'[]'::jsonb),coalesce((select jsonb_agg(jsonb_build_object('label',relationship_status,'value',total)) from(select relationship_status,count(*) total from base group by relationship_status)x),'[]'::jsonb) into total_value,rows_value,chart_value;
  elsif p_report_code='history' then
    title_value:='Histórico de alterações';with base as(select h.id,h.created_at,h.module,h.action,pr.name actor_name,h.description,h.record_id from public.history_entries h left join public.profiles pr on pr.id=h.actor_user_id where public.can_access_history_entry(h.id) and h.created_at::date between start_value and end_value and(module_value is null or h.module=module_value) and(author_value is null or h.actor_user_id=author_value) and(project_value is null or h.project_id=project_value))select(select count(*) from base),coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from(select * from base order by created_at desc limit limit_value offset offset_value)x),'[]'::jsonb),coalesce((select jsonb_agg(jsonb_build_object('label',module,'value',total)) from(select module,count(*) total from base group by module order by total desc limit 12)x),'[]'::jsonb) into total_value,rows_value,chart_value;
  elsif p_report_code='agenda' then
    title_value:='Agenda';with base as(select ai.item_key id,ai.starts_at,ai.title,ai.item_type,ai.status,ai.responsible_name,ai.project_name,ai.client_name from public.agenda_items ai where ai.starts_at::date between start_value and end_value and(project_value is null or ai.project_id=project_value) and(client_value is null or ai.client_id=client_value) and(responsible_value is null or ai.responsible_user_id=responsible_value) and(status_value is null or ai.status=status_value) and((ai.source_type='event' and public.can_access_calendar_event(ai.source_id))or(ai.source_type='activity' and public.can_access_activity(ai.source_id))or(ai.source_type='project_date' and public.can_access_project(ai.project_id))))select(select count(*) from base),coalesce((select jsonb_agg(to_jsonb(x) order by x.starts_at) from(select * from base order by starts_at limit limit_value offset offset_value)x),'[]'::jsonb),coalesce((select jsonb_agg(jsonb_build_object('label',item_type,'value',total)) from(select item_type,count(*) total from base group by item_type)x),'[]'::jsonb) into total_value,rows_value,chart_value;
  elsif p_report_code='productivity' then
    title_value:='Produtividade';with people as(select pr.id,pr.name from public.profiles pr where pr.active and pr.archived_at is null),base as(select pe.id,pe.name responsible_name,(select count(*) from public.project_activities a where a.responsible_user_id=pe.id and a.completed_at::date between start_value and end_value and public.can_access_activity(a.id)) activities_completed,(select count(*) from public.projects p where p.responsible_user_id=pe.id and p.stage='completed' and p.updated_at::date between start_value and end_value and public.can_access_project(p.id)) projects_completed,(select count(*) from public.calendar_events e where coalesce(e.responsible_user_id,e.assigned_user_id)=pe.id and e.completed_at::date between start_value and end_value and public.can_access_calendar_event(e.id)) events_completed,(select count(*) from public.project_checklist_items ci where ci.responsible_user_id=pe.id and ci.completed_at::date between start_value and end_value and public.can_access_project(ci.project_id)) checklist_items_completed from people pe where responsible_value is null or pe.id=responsible_value),scored as(select *,activities_completed+projects_completed+events_completed+checklist_items_completed score from base where activities_completed+projects_completed+events_completed+checklist_items_completed>0)select(select count(*) from scored),coalesce((select jsonb_agg(to_jsonb(x) order by x.score desc) from(select * from scored order by score desc limit limit_value offset offset_value)x),'[]'::jsonb),coalesce((select jsonb_agg(jsonb_build_object('label',responsible_name,'value',score)) from scored order by score desc),'[]'::jsonb) into total_value,rows_value,chart_value;
  elsif p_report_code in('receivables','payables') then
    title_value:=case when p_report_code='receivables' then 'Contas a receber' else 'Contas a pagar' end;with base as(select f.id,f.description,c.name client_name,p.name project_name,s.name supplier_name,f.due_date,f.open_amount,f.effective_status from public.financial_entry_balance_view f left join public.clients c on c.id=f.client_id left join public.projects p on p.id=f.project_id left join public.financial_suppliers s on s.id=f.supplier_id where f.environment='professional' and f.archived_at is null and f.open_amount>0 and f.entry_type=case when p_report_code='receivables' then 'income' else 'expense' end and public.can_access_finance_environment(f.environment,f.owner_user_id,'view') and(project_value is null or f.project_id=project_value) and(client_value is null or f.client_id=client_value) and(f.due_date is null or f.due_date between start_value and end_value))select (select count(*) from base),coalesce((select jsonb_agg(to_jsonb(x) order by x.due_date) from(select * from base order by due_date limit limit_value offset offset_value)x),'[]'::jsonb),coalesce((select jsonb_agg(jsonb_build_object('label',effective_status,'value',total)) from(select effective_status,count(*) total from base group by effective_status)x),'[]'::jsonb),(select coalesce(sum(open_amount),0) from base) into total_value,rows_value,chart_value,money_total;summary_value:=jsonb_build_object('total_open',money_total::text);
  else raise exception 'Código de relatório inválido.';
  end if;
  if summary_value='{}'::jsonb then summary_value=jsonb_build_object('registros',total_value); end if;
  return jsonb_build_object('code',p_report_code,'title',title_value,'total',total_value,'rows',coalesce(rows_value,'[]'::jsonb),'summary',summary_value,'chart',coalesce(chart_value,'[]'::jsonb));
end $$;

-- 7. Workspace seguro do Google Drive
create or replace function public.get_google_drive_workspace() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare connection_row record; configured boolean:=false; result jsonb;
begin
 if auth.uid() is null or not public.has_permission('integrations','view','own') then raise exception 'Sem permissão para visualizar integrações.'; end if;
 select coalesce((value #>> '{}')::boolean,false) into configured from public.system_settings where key='google_drive_oauth_configured';
 select * into connection_row from public.google_drive_connections where user_id=auth.uid() and active order by updated_at desc limit 1;
 select jsonb_build_object('configured',configured,'connected',connection_row.id is not null and connection_row.connection_status='connected','connection_id',connection_row.id,'google_account_email',connection_row.google_account_email,'root_folder_name',coalesce(connection_row.root_folder_name,(select root_folder_name from public.google_drive_settings where id=true),'CAMILLA STUDIO'),'connection_status',connection_row.connection_status,'last_checked_at',connection_row.last_checked_at,'last_error',connection_row.last_error,'allow_public_sharing',coalesce((select allow_public_sharing from public.google_drive_settings where id=true),false)) into result;
 return result;
end $$;

-- Atualiza funções resumidas legadas para manter compatibilidade
create or replace function public.get_dashboard_summary(p_include_financial boolean default false) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare w jsonb;begin w:=public.get_dashboard_workspace('{}'::jsonb,p_include_financial);return jsonb_build_object('projects',coalesce((select (x->>'value')::integer from jsonb_array_elements(w->'metrics') x where x->>'code'='projects_active'),0),'late',coalesce((select (x->>'value')::integer from jsonb_array_elements(w->'metrics') x where x->>'code'='projects_late'),0),'activities',coalesce((select (x->>'value')::integer from jsonb_array_elements(w->'metrics') x where x->>'code'='activities_late'),0),'clients',(select count(*) from public.clients c where c.archived_at is null and public.can_access_client(c.id)),'income',coalesce((w#>>'{financial,income}')::numeric,0),'expense',coalesce((w#>>'{financial,expense}')::numeric,0));end $$;
create or replace function public.get_report_summary(p_include_financial boolean default false) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare receivable numeric:=0;payable numeric:=0;begin if p_include_financial and public.can_access_finance_environment('professional',null,'view_values') then select coalesce(sum(open_amount) filter(where entry_type='income'),0),coalesce(sum(open_amount) filter(where entry_type='expense'),0) into receivable,payable from public.financial_entry_balance_view where environment='professional' and archived_at is null and public.can_access_finance_environment(environment,owner_user_id,'view');end if;return jsonb_build_object('projects',(select count(*) from public.projects p where public.can_access_project(p.id)),'activities',(select count(*) from public.project_activities a where public.can_access_activity(a.id)),'overdue',(select count(*) from public.projects p where p.main_deadline<current_date and p.stage<>'completed' and public.can_access_project(p.id)),'receivable',receivable,'payable',payable,'net',receivable-payable);end $$;

-- 8. Grants e versão
DO $$ declare f record;begin for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('stage09_safe_date','register_report_export','get_report_filter_options','get_dashboard_workspace','get_operational_report','get_google_drive_workspace','get_dashboard_summary','get_report_summary') loop execute format('revoke all on function %s from public,anon',f.sig);execute format('grant execute on function %s to authenticated',f.sig);end loop;end $$;

insert into public.system_versions(version,notes,environment) values('3.0.10','Etapa 09: Dashboard permission-aware, relatórios operacionais, exportações auditadas, integração segura com Google Drive e atualização das informações da versão.','production')
on conflict(version) do update set notes=excluded.notes,environment=excluded.environment,released_at=now();

commit;
