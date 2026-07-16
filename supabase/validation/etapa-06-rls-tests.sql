-- Etapa 06 — roteiro RLS para homologação
-- 1. Entre como colaborador com acesso a um projeto e confirme que agenda_items mostra somente itens permitidos.
select source_type,source_id,title,editable from public.agenda_items order by starts_at limit 50;
-- 2. Confirme que o usuário sem agenda.edit recebe erro ao executar update_agenda_item em evento alheio.
-- 3. Confirme que o usuário sem projects.change_deadline recebe erro ao mover project_date.
-- 4. Confirme que evento pessoal criado por outro usuário não é retornado sem permissão agenda.view=all.
-- 5. Confirme que as funções abaixo não estão liberadas para anon.
select p.proname,has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in('save_calendar_event','create_activity_from_agenda','update_agenda_item','set_agenda_item_status','archive_calendar_event','mark_agenda_item_viewed')
order by p.proname;
