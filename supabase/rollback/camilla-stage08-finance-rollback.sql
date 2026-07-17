-- Camilla Studio — reversão conservadora da Etapa 08
-- Restaure primeiro o ZIP da Etapa 07. Este script desativa as superfícies da Etapa 08,
-- preservando todos os lançamentos, contas, cartões, categorias, pagamentos, recorrências e histórico.
begin;

revoke execute on function public.get_finance_workspace(text,text,jsonb,integer,integer),
 public.get_financial_entry(uuid),public.save_financial_entry(uuid,jsonb),public.duplicate_financial_entry(uuid),
 public.archive_financial_entry(uuid),public.reactivate_financial_entry(uuid),public.cancel_financial_entry(uuid,text),
 public.settle_financial_entry(uuid,jsonb),public.change_financial_environment(uuid,text,text),
 public.create_installment_entries(uuid,integer,date),public.create_recurring_entries(date),
 public.create_financial_transfer(jsonb),public.review_financial_approval(uuid,text,text),
 public.reverse_financial_payment(uuid,text),public.cancel_financial_transfer(uuid,text),
 public.get_financial_report(text,text,jsonb),public.get_project_financial_entries(uuid) from authenticated;

drop view if exists public.financial_dashboard_view;
drop view if exists public.financial_period_summary_view;
drop view if exists public.financial_receivables_view;
drop view if exists public.financial_payables_view;
drop view if exists public.financial_cash_flow_view;
drop view if exists public.financial_account_balance_view;
-- financial_entry_balance_view e as tabelas novas são mantidas deliberadamente, pois podem conter dados reais.

update public.system_settings set value='false'::jsonb where key='finance_require_approval';
delete from public.system_versions where version='3.0.9';

commit;
