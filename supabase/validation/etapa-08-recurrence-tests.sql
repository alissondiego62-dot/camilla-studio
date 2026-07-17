-- Etapa 08 — idempotência das recorrências. Executar em homologação com usuário autorizado.
select count(*) as duplicate_occurrences
from (select rule_id,occurrence_date from public.financial_recurring_occurrences group by rule_id,occurrence_date having count(*)>1) x;
select indexname,indexdef from pg_indexes where schemaname='public' and tablename='financial_recurring_occurrences';
select to_regprocedure('public.create_recurring_entries(date)') is not null as recurrence_rpc;
-- Procedimento funcional: crie uma regra com next_generation_date<=current_date, execute a RPC duas vezes
-- para a mesma data e confirme que existe somente uma occurrence por rule_id/occurrence_date.
