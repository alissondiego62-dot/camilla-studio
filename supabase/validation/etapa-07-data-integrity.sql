-- Etapa 07 — integridade dos dados. As consultas de falhas devem retornar zero.
select count(*) as clients_without_name from public.clients where nullif(trim(name),'') is null;
select count(*) as duplicated_active_cpf from (select public.only_digits(cpf) value from public.clients where archived_at is null and public.only_digits(cpf) is not null group by 1 having count(*)>1) x;
select count(*) as duplicated_active_cnpj from (select public.only_digits(cnpj) value from public.clients where archived_at is null and public.only_digits(cnpj) is not null group by 1 having count(*)>1) x;
select count(*) as duplicated_active_phone from (select client_id,normalized_phone from public.client_phones where archived_at is null group by client_id,normalized_phone having count(*)>1) x;
select count(*) as duplicated_active_email from (select client_id,normalized_email from public.client_emails where archived_at is null group by client_id,normalized_email having count(*)>1) x;
select count(*) as orphan_phones from public.client_phones p left join public.clients c on c.id=p.client_id where c.id is null;
select count(*) as orphan_emails from public.client_emails e left join public.clients c on c.id=e.client_id where c.id is null;
select count(*) as orphan_notes from public.client_notes n left join public.clients c on c.id=n.client_id where c.id is null;
select count(*) as invalid_payment_amount from public.financial_entry_payments where amount<=0;
select count(*) as agenda_client_orphans from public.agenda_items a left join public.clients c on c.id=a.client_id where a.client_id is not null and c.id is null;
select count(*) as clients_total,count(*) filter(where archived_at is null) as active,count(*) filter(where archived_at is not null) as archived from public.clients;
