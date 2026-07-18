-- Não altera dados. Resultados esperados: zero nas verificações de erro.
select count(*) as negative_contract_values from public.projects where contract_value<0;
select count(*) as negative_legacy_received from public.projects where amount_received<0;
select count(*) as orphan_financial_entries
from public.financial_entries entry
left join public.projects project on project.id=entry.project_id
where entry.project_id is not null and project.id is null;
select count(*) as orphan_financial_payments
from public.financial_entry_payments payment
left join public.financial_entries entry on entry.id=payment.financial_entry_id
where entry.id is null;
select count(*) as project_codes_duplicated
from (select code from public.projects where archived_at is null group by code having count(*)>1) duplicated;
