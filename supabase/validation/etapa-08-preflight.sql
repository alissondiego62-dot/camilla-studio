-- Etapa 08 — preflight somente de leitura
select current_database() as database_name,
       to_regclass('public.financial_entries') as financial_entries,
       to_regclass('public.financial_entry_payments') as financial_entry_payments,
       exists(select 1 from public.system_versions where version='3.0.8') as version_308;
select environment,entry_type,status,count(*) as total,coalesce(sum(amount),0) as total_amount
from public.financial_entries group by environment,entry_type,status order by environment,entry_type,status;
select count(*) as payments from public.financial_entry_payments;
select column_name,data_type,numeric_precision,numeric_scale,is_nullable
from information_schema.columns where table_schema='public' and table_name='financial_entries' order by ordinal_position;
select policyname,cmd,roles,qual,with_check from pg_policies
where schemaname='public' and tablename in('financial_entries','financial_entry_payments') order by tablename,policyname;
select module,action,scope,count(*) as grants from public.profile_permissions
where allowed and module in('finance_personal','finance_professional','reports') group by module,action,scope order by module,action;
