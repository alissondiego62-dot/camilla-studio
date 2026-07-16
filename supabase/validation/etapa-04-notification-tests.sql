-- Etapa 04 — testes funcionais dentro de transação reversível
begin;
-- Valida catálogo e regras efetivas sem criar dados permanentes.
select type_code,module,label,default_enabled,default_in_app,default_push from public.notification_type_catalog order by position;
select * from public.current_notification_rules();
-- A função deve ser idempotente pela chave de deduplicação quando chamada por triggers/cron.
select count(*) as duplicate_dedupe_keys from (select user_id,dedupe_key from public.notifications where dedupe_key is not null group by user_id,dedupe_key having count(*)>1) x;
-- Visualizações devem ser individuais.
select user_id,module,record_type,record_id,area,last_viewed_at from public.record_views order by last_viewed_at desc limit 20;
rollback;
