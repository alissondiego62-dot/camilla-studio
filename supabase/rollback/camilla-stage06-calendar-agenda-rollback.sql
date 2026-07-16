-- Rollback conservador da Etapa 06. Preserva eventos, atividades, prazos, histórico e notificações.
begin;
drop view if exists public.agenda_items;
drop function if exists public.mark_agenda_item_viewed(text,uuid,uuid);
drop function if exists public.archive_calendar_event(uuid);
drop function if exists public.set_agenda_item_status(text,uuid,text);
drop function if exists public.update_agenda_item(text,uuid,timestamptz,timestamptz,boolean);
drop function if exists public.create_activity_from_agenda(jsonb);
drop function if exists public.save_calendar_event(uuid,jsonb);
-- As colunas novas não são removidas para não perder estado de arquivamento/cancelamento.
-- Os registros de versão e permissões permanecem como trilha administrativa.
commit;
