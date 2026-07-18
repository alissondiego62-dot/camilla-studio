begin;

-- Exclusão lógica e auditável de registros financeiros.
alter table public.financial_entries
  add column if not exists deletion_reason text,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create index if not exists idx_financial_entries_project_due_active
  on public.financial_entries(project_id, due_date, status)
  where environment='professional' and archived_at is null;
create index if not exists idx_financial_entries_professional_period
  on public.financial_entries(competence_date, due_date)
  where environment='professional' and archived_at is null;
create index if not exists idx_financial_entries_deleted_audit
  on public.financial_entries(deleted_at desc)
  where deleted_at is not null;

create or replace function public.remove_financial_entry(p_entry_id uuid,p_reason text)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_entry public.financial_entries%rowtype;
begin
  if nullif(trim(p_reason),'') is null or length(trim(p_reason)) < 3 then
    raise exception 'Informe um motivo válido para a exclusão.';
  end if;

  select * into v_entry from public.financial_entries where id=p_entry_id for update;
  if not found then raise exception 'Registro financeiro não encontrado.'; end if;
  if v_entry.archived_at is not null then raise exception 'O registro financeiro já foi removido.'; end if;
  if not public.can_access_financial_entry(p_entry_id,'archive') then
    raise exception 'Sem permissão para excluir o registro financeiro.';
  end if;

  update public.financial_entries
     set archived_at=now(),
         archived_by=auth.uid(),
         deleted_at=now(),
         deleted_by=auth.uid(),
         deletion_reason=trim(p_reason),
         updated_at=now(),
         updated_by=auth.uid()
   where id=p_entry_id;

  insert into public.security_audit_events(event_type,actor_user_id,target_type,target_id,success,metadata)
  values('financial_entry_removed',auth.uid(),'financial_entry',p_entry_id::text,true,
    jsonb_build_object('reason',trim(p_reason),'amount',v_entry.amount,'project_id',v_entry.project_id,'description',v_entry.description,'environment',v_entry.environment));
end
$$;

revoke all on function public.remove_financial_entry(uuid,text) from public,anon;
grant execute on function public.remove_financial_entry(uuid,text) to authenticated;

-- A consulta usada dentro dos projetos e a página Financeiro passam a ler a mesma tabela.
create or replace function public.get_project_financial_entries(p_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.can_access_project(p_project_id) then raise exception 'Sem acesso ao projeto.'; end if;
  if not public.can_access_finance_environment('professional',null,'view_values') then raise exception 'Sem permissão para visualizar valores.'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',id,'project_id',project_id,'entry_type',entry_type,'description',description,
      'amount',amount,'competence_date',competence_date,'due_date',due_date,
      'status',effective_status,'notes',notes,'created_at',created_at
    ) order by coalesce(due_date,competence_date) asc,created_at desc)
    from public.financial_entry_balance_view
    where project_id=p_project_id and environment='professional' and archived_at is null
  ),'[]'::jsonb);
end
$$;

revoke all on function public.get_project_financial_entries(uuid) from public,anon;
grant execute on function public.get_project_financial_entries(uuid) to authenticated;

insert into public.system_versions(version,notes,environment)
values('3.0.16','Etapa 16: financeiro dos projetos integrado ao Financeiro geral, previsões de pagamento, exclusão lógica auditável, seletor único de período com mês atual como padrão e correção do aviso do Kanban.','production')
on conflict(version) do update set notes=excluded.notes,environment=excluded.environment;

commit;
