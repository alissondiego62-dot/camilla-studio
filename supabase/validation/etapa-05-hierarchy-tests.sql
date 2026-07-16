-- Testes transacionais de hierarquia. Tudo é revertido ao final.
begin;

do $$
declare
  owner_id uuid;
  parent_value uuid;
  child_value uuid;
begin
  select id into owner_id from auth.users order by created_at limit 1;
  if owner_id is null then
    raise notice 'Teste ignorado: nenhum usuário em auth.users.';
    return;
  end if;

  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);

  insert into public.project_activities(title,status,created_by,updated_by,position)
  values('__stage05_parent_test__','not_started',owner_id,owner_id,900001)
  returning id into parent_value;

  insert into public.project_activities(parent_id,title,status,created_by,updated_by,position)
  values(parent_value,'__stage05_child_test__','not_started',owner_id,owner_id,0)
  returning id into child_value;

  begin
    update public.project_activities set parent_id=child_value where id=parent_value;
    raise exception 'Falha: ciclo hierárquico foi aceito.';
  exception when others then
    if sqlerrm='Falha: ciclo hierárquico foi aceito.' then raise; end if;
  end;

  update public.project_activities set status='completed' where id=child_value;
  if (select progress from public.project_activities where id=parent_value)<>100 then
    raise exception 'Falha: progresso do pai não foi recalculado.';
  end if;
end $$;

rollback;
