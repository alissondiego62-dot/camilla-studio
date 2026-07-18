begin;
-- Rollback emergencial. Recoloca os valores nas colunas legadas e retorna ao
-- modelo da Etapa 17 original. Não é recomendado para produção.
drop trigger if exists projects_protect_legacy_financial_columns on public.projects;

do $$
begin
  if exists(select 1 from pg_trigger where tgrelid='public.projects'::regclass and tgname='projects_history' and not tgisinternal) then
    execute 'alter table public.projects disable trigger projects_history';
  end if;
  if exists(select 1 from pg_trigger where tgrelid='public.projects'::regclass and tgname='projects_set_updated_at' and not tgisinternal) then
    execute 'alter table public.projects disable trigger projects_set_updated_at';
  end if;
end
$$;

update public.projects project
set contract_value=contract.contract_value,
    amount_received=contract.legacy_amount_received,
    balance_due=greatest(contract.contract_value-contract.legacy_amount_received,0)
from public.project_contract_financials contract
where contract.project_id=project.id;

do $$
begin
  if exists(select 1 from pg_trigger where tgrelid='public.projects'::regclass and tgname='projects_history' and not tgisinternal) then
    execute 'alter table public.projects enable trigger projects_history';
  end if;
  if exists(select 1 from pg_trigger where tgrelid='public.projects'::regclass and tgname='projects_set_updated_at' and not tgisinternal) then
    execute 'alter table public.projects enable trigger projects_set_updated_at';
  end if;
end
$$;

revoke select on public.projects from authenticated;
grant select(
  id,code,client_id,name,project_type,subtype,stage,status,priority,responsible_name,
  deadline_stage_1,deadline_stage_2,deadline_stage_3,cover_url,notes,created_by,
  created_at,updated_at,main_deadline,responsible_user_id,archived_at
) on public.projects to authenticated;

drop function if exists public.protect_project_legacy_financial_columns();
drop table if exists public.project_contract_financials;
delete from public.system_versions where version='3.0.18';
commit;
