-- Etapa 08 — integridade. As consultas de falha devem retornar zero.
select count(*) as invalid_environment from public.financial_entries where environment not in('personal','professional');
select count(*) as invalid_entry_type from public.financial_entries where entry_type not in('income','expense');
select count(*) as personal_without_owner from public.financial_entries where environment='personal' and owner_user_id is null;
select count(*) as professional_with_owner from public.financial_entries where environment='professional' and owner_user_id is not null;
select count(*) as invalid_amount from public.financial_entries where amount<0 or amount<>round(amount,2);
select count(*) as payment_environment_mismatch from public.financial_entry_payments p join public.financial_entries e on e.id=p.financial_entry_id where p.environment<>e.environment;
select count(*) as orphan_payments from public.financial_entry_payments p left join public.financial_entries e on e.id=p.financial_entry_id where e.id is null;
select count(*) as orphan_adjustments from public.financial_entry_adjustments a left join public.financial_entries e on e.id=a.financial_entry_id where e.id is null;
select count(*) as invalid_installment_number from public.financial_entries where installment_group_id is not null and (installment_number<1 or installment_number>installment_count);
select count(*) as duplicate_recurring_occurrence from (select rule_id,occurrence_date from public.financial_recurring_occurrences group by rule_id,occurrence_date having count(*)>1) x;
select count(*) as invalid_transfer_pair from public.financial_transfers where source_account_id=destination_account_id or amount<=0;
select environment,entry_type,status,count(*) as total,coalesce(sum(amount),0) as total_amount from public.financial_entries group by environment,entry_type,status order by environment,entry_type,status;
