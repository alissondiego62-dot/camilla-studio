begin;

alter table public.projects
  add column if not exists main_deadline date;

update public.projects
set main_deadline = deadline_stage_3
where main_deadline is null and deadline_stage_3 is not null;

create index if not exists projects_main_deadline_idx
  on public.projects(main_deadline);

create or replace function public.log_project_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.project_history(project_id, action_type, description, author_id)
    values (new.id, 'created', 'Projeto criado.', auth.uid());
    return new;
  end if;

  if old.stage is distinct from new.stage then
    insert into public.project_history(project_id, action_type, description, author_id)
    values (new.id, 'stage_changed', 'Etapa alterada de ' || coalesce(old.stage, 'não definida') || ' para ' || coalesce(new.stage, 'não definida') || '.', auth.uid());
  end if;

  if old.status is distinct from new.status then
    insert into public.project_history(project_id, action_type, description, author_id)
    values (new.id, 'status_changed', 'Status alterado de ' || coalesce(old.status, 'não definido') || ' para ' || coalesce(new.status, 'não definido') || '.', auth.uid());
  end if;

  if old.responsible_name is distinct from new.responsible_name then
    insert into public.project_history(project_id, action_type, description, author_id)
    values (new.id, 'responsible_changed', 'Responsável alterado de ' || coalesce(old.responsible_name, 'não atribuído') || ' para ' || coalesce(new.responsible_name, 'não atribuído') || '.', auth.uid());
  end if;

  if old.main_deadline is distinct from new.main_deadline then
    insert into public.project_history(project_id, action_type, description, author_id)
    values (new.id, 'main_deadline_changed', 'Prazo principal alterado de ' || coalesce(to_char(old.main_deadline, 'DD/MM/YYYY'), 'não definido') || ' para ' || coalesce(to_char(new.main_deadline, 'DD/MM/YYYY'), 'não definido') || '.', auth.uid());
  end if;

  if old.deadline_stage_1 is distinct from new.deadline_stage_1 then
    insert into public.project_history(project_id, action_type, description, author_id)
    values (new.id, 'delivery_1_changed', 'Data da entrega 1 alterada de ' || coalesce(to_char(old.deadline_stage_1, 'DD/MM/YYYY'), 'não definida') || ' para ' || coalesce(to_char(new.deadline_stage_1, 'DD/MM/YYYY'), 'não definida') || '.', auth.uid());
  end if;

  if old.deadline_stage_2 is distinct from new.deadline_stage_2 then
    insert into public.project_history(project_id, action_type, description, author_id)
    values (new.id, 'delivery_2_changed', 'Data da entrega 2 alterada de ' || coalesce(to_char(old.deadline_stage_2, 'DD/MM/YYYY'), 'não definida') || ' para ' || coalesce(to_char(new.deadline_stage_2, 'DD/MM/YYYY'), 'não definida') || '.', auth.uid());
  end if;

  if old.deadline_stage_3 is distinct from new.deadline_stage_3 then
    insert into public.project_history(project_id, action_type, description, author_id)
    values (new.id, 'delivery_3_changed', 'Data da entrega 3 alterada de ' || coalesce(to_char(old.deadline_stage_3, 'DD/MM/YYYY'), 'não definida') || ' para ' || coalesce(to_char(new.deadline_stage_3, 'DD/MM/YYYY'), 'não definida') || '.', auth.uid());
  end if;

  if old.contract_value is distinct from new.contract_value then
    insert into public.project_history(project_id, action_type, description, author_id)
    values (new.id, 'contract_value_changed', 'Valor do contrato alterado de R$ ' || replace(to_char(old.contract_value, 'FM999G999G990D00'), '.', ',') || ' para R$ ' || replace(to_char(new.contract_value, 'FM999G999G990D00'), '.', ',') || '.', auth.uid());
  end if;

  return new;
end;
$$;

commit;
