-- Etapa 07 — proteção contra exclusão definitiva
select conrelid::regclass as source_table,conname,confdeltype,
 case confdeltype when 'r' then 'RESTRICT' when 'a' then 'NO ACTION' when 'n' then 'SET NULL' when 'c' then 'CASCADE' else confdeltype::text end as delete_action
from pg_constraint
where contype='f' and confrelid='public.clients'::regclass
  and conrelid in('public.projects'::regclass,'public.project_activities'::regclass,'public.project_files'::regclass,'public.financial_entries'::regclass,'public.calendar_events'::regclass)
order by source_table::text;
select to_regprocedure('public.delete_client_safely(uuid)') is not null as safe_delete_function;
-- O bloco abaixo é um roteiro transacional para homologação; substitua o UUID por um cliente com vínculo.
begin;
-- select public.delete_client_safely('00000000-0000-4000-8000-000000000000'); -- deve falhar e recomendar arquivamento.
rollback;
