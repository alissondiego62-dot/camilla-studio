-- Teste transacional das visualizações salvas. Tudo é revertido.
begin;

do $$
declare
  owner_id uuid;
  first_id uuid;
  second_id uuid;
begin
  select id into owner_id from auth.users order by created_at limit 1;
  if owner_id is null then
    raise notice 'Teste ignorado: nenhum usuário em auth.users.';
    return;
  end if;

  insert into public.activity_saved_views(user_id,name,view_type,is_default)
  values(owner_id,'__stage05_view_1__','table',true)
  returning id into first_id;

  begin
    insert into public.activity_saved_views(user_id,name,view_type,is_default)
    values(owner_id,'__stage05_view_2__','board',true)
    returning id into second_id;
    raise exception 'Falha: duas visualizações padrão foram aceitas.';
  exception when unique_violation then
    null;
  end;
end $$;

rollback;
