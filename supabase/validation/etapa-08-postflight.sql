-- Etapa 08 — confirmação estrutural. Todos os booleanos devem retornar true.
select
 exists(select 1 from public.system_versions where version='3.0.9') as version_309,
 to_regclass('public.financial_environment_access') is not null as environment_access,
 to_regclass('public.financial_accounts') is not null as accounts,
 to_regclass('public.financial_cards') is not null as cards,
 to_regclass('public.financial_categories') is not null as categories,
 to_regclass('public.financial_templates') is not null as templates,
 to_regclass('public.financial_recurring_rules') is not null as recurring_rules,
 to_regclass('public.financial_transfers') is not null as transfers,
 to_regclass('public.financial_approvals') is not null as approvals;
select
 to_regclass('public.financial_entry_balance_view') is not null as balance_view,
 to_regclass('public.financial_account_balance_view') is not null as account_balance_view,
 to_regclass('public.financial_cash_flow_view') is not null as cash_flow_view,
 to_regclass('public.financial_report_base_view') is not null as report_view;
select
 to_regprocedure('public.get_finance_workspace(text,text,jsonb,integer,integer)') is not null as get_workspace,
 to_regprocedure('public.save_financial_entry(uuid,jsonb)') is not null as save_entry,
 to_regprocedure('public.settle_financial_entry(uuid,jsonb)') is not null as settle_entry,
 to_regprocedure('public.create_installment_entries(uuid,integer,date)') is not null as create_installments,
 to_regprocedure('public.create_recurring_entries(date)') is not null as create_recurrence,
 to_regprocedure('public.create_financial_transfer(jsonb)') is not null as create_transfer,
 to_regprocedure('public.review_financial_approval(uuid,text,text)') is not null as review_approval,
 to_regprocedure('public.get_financial_report(text,text,jsonb)') is not null as get_report;
select column_name,data_type,numeric_precision,numeric_scale
from information_schema.columns
where table_schema='public' and table_name='financial_entries' and column_name='amount';
select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and relname in('financial_entries','financial_entry_payments','financial_accounts','financial_cards','financial_categories','financial_environment_access') order by relname;
