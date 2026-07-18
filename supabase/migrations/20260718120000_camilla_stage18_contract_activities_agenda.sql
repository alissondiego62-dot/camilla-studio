begin;

-- Camilla Studio 3.0.19 — Etapa 18
-- Valor contratual no cadastro/listagem, edição financeira segura e gestão de
-- atividades/agendamentos dentro do projeto. Nenhum lançamento financeiro é apagado.

create table if not exists public.project_contract_financials (
  project_id uuid primary key references public.projects(id) on delete cascade,
  contract_value numeric(18,2) not null default 0 check (contract_value >= 0),
  legacy_amount_received numeric(18,2) not null default 0 check (legacy_amount_received >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.project_contract_financials enable row level security;

create or replace function public.is_financial_administrator()
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select public.current_user_access_valid()
     and exists(
       select 1
       from public.profiles profile
       join public.permission_profiles permission_profile
         on permission_profile.id=profile.permission_profile_id
       where profile.id=auth.uid()
         and profile.active=true
         and profile.archived_at is null
         and profile.blocked_at is null
         and permission_profile.active=true
         and permission_profile.archived_at is null
         and permission_profile.code in('administrator','owner')
     )
$$;

-- Atualiza o contrato na estrutura confidencial. Não toca em balance_due,
-- pois a coluna legada de projects é GENERATED ALWAYS.
create or replace function public.set_project_contract_value(
  p_project_id uuid,
  p_contract_value numeric
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  old_value numeric(18,2):=0;
begin
  if not public.is_financial_administrator() then
    raise exception 'Somente administradores podem alterar o valor do contrato.';
  end if;
  if not public.can_access_project(p_project_id) then
    raise exception 'Sem acesso ao projeto.';
  end if;
  if p_contract_value is null or p_contract_value<0 then
    raise exception 'O valor do contrato deve ser igual ou superior a zero.';
  end if;

  select coalesce(contract_value,0)
    into old_value
    from public.project_contract_financials
   where project_id=p_project_id;

  insert into public.project_contract_financials(
    project_id,contract_value,legacy_amount_received,updated_at,updated_by
  ) values(
    p_project_id,round(p_contract_value,2),0,now(),auth.uid()
  )
  on conflict(project_id) do update
  set contract_value=excluded.contract_value,
      updated_at=now(),
      updated_by=auth.uid();

  if old_value is distinct from round(p_contract_value,2) then
    insert into public.project_history(project_id,action_type,description,author_id)
    values(
      p_project_id,
      'contract_value_changed',
      'Valor do contrato alterado de '||to_char(coalesce(old_value,0),'FM999999999990D00')||
      ' para '||to_char(round(p_contract_value,2),'FM999999999990D00')||'.',
      auth.uid()
    );
  end if;

  return public.get_project_financial_summary(p_project_id);
end
$$;

-- Criação transacional do projeto com valor contratual opcional.
create or replace function public.create_project_with_contract(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  project_id uuid;
  contract_value_input numeric(18,2):=0;
  responsible_id uuid;
  client_id_input uuid;
begin
  if auth.uid() is null or not public.current_user_access_valid() then
    raise exception 'Sessão inválida.';
  end if;
  if not public.has_permission('projects','create','own') then
    raise exception 'Permissão insuficiente para criar projetos.';
  end if;

  contract_value_input:=round(coalesce(nullif(p_payload->>'contract_value','')::numeric,0),2);
  if contract_value_input<0 then
    raise exception 'O valor do contrato deve ser igual ou superior a zero.';
  end if;
  if contract_value_input>0 and not public.is_financial_administrator() then
    raise exception 'Somente administradores podem cadastrar o valor do contrato.';
  end if;

  client_id_input:=nullif(p_payload->>'client_id','')::uuid;
  responsible_id:=nullif(p_payload->>'responsible_user_id','')::uuid;

  insert into public.projects(
    code,client_id,name,project_type,subtype,stage,status,priority,
    responsible_user_id,responsible_name,main_deadline,notes,created_by
  ) values(
    nullif(trim(p_payload->>'code'),''),
    client_id_input,
    nullif(trim(p_payload->>'name'),''),
    coalesce(nullif(trim(p_payload->>'project_type'),''),'Arquitetura'),
    nullif(trim(p_payload->>'subtype'),''),
    coalesce(nullif(p_payload->>'stage',''),'briefing_preliminary'),
    coalesce(nullif(p_payload->>'status',''),'not_started'),
    coalesce(nullif(p_payload->>'priority',''),'normal'),
    responsible_id,
    nullif(trim(p_payload->>'responsible_name'),''),
    nullif(p_payload->>'main_deadline','')::date,
    nullif(trim(p_payload->>'notes'),''),
    auth.uid()
  ) returning id into project_id;

  insert into public.project_contract_financials(
    project_id,contract_value,legacy_amount_received,updated_at,updated_by
  ) values(
    project_id,contract_value_input,0,now(),auth.uid()
  )
  on conflict(project_id) do update
  set contract_value=excluded.contract_value,
      updated_at=now(),
      updated_by=auth.uid();

  if contract_value_input>0 then
    insert into public.project_history(project_id,action_type,description,author_id)
    values(
      project_id,
      'contract_value_created',
      'Projeto criado com valor de contrato de '||to_char(contract_value_input,'FM999999999990D00')||'.',
      auth.uid()
    );
  end if;

  return project_id;
end
$$;

-- Mantém leitura operacional da tabela projects. Os valores confidenciais são
-- obtidos exclusivamente pelas RPCs protegidas e pela tabela com RLS.
grant select on public.projects to authenticated;

revoke all on public.project_contract_financials from public,anon,authenticated;
grant select on public.project_contract_financials to authenticated;

drop policy if exists project_contract_financials_admin_select on public.project_contract_financials;
create policy project_contract_financials_admin_select
on public.project_contract_financials
for select to authenticated
using(public.is_financial_administrator());

revoke all on function public.is_financial_administrator() from public,anon;
revoke all on function public.set_project_contract_value(uuid,numeric) from public,anon;
revoke all on function public.create_project_with_contract(jsonb) from public,anon;
grant execute on function public.is_financial_administrator() to authenticated;
grant execute on function public.set_project_contract_value(uuid,numeric) to authenticated;
grant execute on function public.create_project_with_contract(jsonb) to authenticated;

create index if not exists idx_project_contract_financials_updated
  on public.project_contract_financials(updated_at desc);
create index if not exists idx_project_activities_project_active_due
  on public.project_activities(project_id,due_at)
  where deleted_at is null and archived_at is null;
create index if not exists idx_calendar_events_project_active_start
  on public.calendar_events(project_id,starts_at)
  where archived_at is null;

insert into public.system_versions(version,notes,environment)
values(
  '3.0.19',
  'Etapa 18: valor contratual no cadastro e listagem de projetos, edição segura no Financeiro do projeto, edição/exclusão de atividades e agendamentos e correção da pilha de confirmação.',
  'production'
)
on conflict(version) do update
set notes=excluded.notes,
    environment=excluded.environment;

commit;
