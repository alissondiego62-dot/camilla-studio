select to_regprocedure('public.get_finance_dashboard_metrics(text,date,date)') is not null as dashboard_metrics_ok;
select to_regprocedure('public.list_undated_financial_entries(text)') is not null as undated_receivables_ok;
select to_regprocedure('public.settle_project_receivable(uuid,jsonb)') is not null as settle_project_receivable_ok;
select to_regprocedure('public.remove_financial_entry(uuid,text)') is not null as secure_delete_ok;
select exists(select 1 from public.system_versions where version='3.0.20') as version_ok;
select exists(select 1 from public.financial_accounts where environment='professional' and archived_at is null and lower(name)=lower('Caixa geral')) as default_account_ok;
select count(*)=0 as no_legacy_settled_without_payment from public.financial_entries entry where entry.environment='professional' and entry.status in('received','paid') and entry.archived_at is null and not exists(select 1 from public.financial_entry_payments payment where payment.financial_entry_id=entry.id and payment.archived_at is null);
select to_regclass('public.financial_entry_balance_view') is not null as balance_view_ok;
select count(*)=4 as balance_calculated_columns_ok
from information_schema.columns
where table_schema='public' and table_name='financial_entry_balance_view'
  and column_name in('adjustment_amount','paid_amount','open_amount','effective_status');
select count(*)=3 as deletion_audit_columns_ok
from information_schema.columns
where table_schema='public' and table_name='financial_entry_balance_view'
  and column_name in('deletion_reason','deleted_at','deleted_by');
