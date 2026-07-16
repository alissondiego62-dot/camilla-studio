-- Matriz de testes RLS. Execute em homologação e substitua os UUIDs abaixo.
-- Os testes usam transação e devem terminar com ROLLBACK.
begin;
-- Exemplo de simulação de JWT no SQL Editor:
-- select set_config('request.jwt.claim.sub','UUID_DO_USUARIO',true);
-- select set_config('request.jwt.claims',json_build_object('sub','UUID_DO_USUARIO','role','authenticated','iat',extract(epoch from now())::bigint)::text,true);
-- select public.current_access_context();
-- select public.has_permission('projects','view','assigned');
-- select id,code,name from public.projects; -- deve retornar somente o escopo autorizado.
-- select id,description,environment from public.financial_entries; -- colaborador deve receber zero linhas.
-- Teste do último administrador em homologação:
-- update public.profiles set active=false where id='UUID_DO_ULTIMO_ADMIN'; -- deve falhar.
rollback;
