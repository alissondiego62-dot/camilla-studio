-- Etapa 07 — auditoria de permissões financeiras
select p.proname,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in('can_view_client_financial','get_client_financial_workspace','get_client_indicators')
order by p.proname;

-- As views com valores não podem ser consultadas diretamente por authenticated.
select c.relname as financial_view,
       has_table_privilege('anon',c.oid,'SELECT') as anon_select,
       has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_select
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in('client_financial_entries_view','client_financial_summary_view')
order by c.relname;

select policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname='public'
  and tablename in('financial_entries','financial_entry_payments','client_notes')
order by tablename,policyname;

-- Financeiro pessoal não participa da ficha do cliente.
select position('environment = ''professional''' in pg_get_viewdef('public.client_financial_entries_view'::regclass,true))>0 as professional_only;

-- Homologação:
-- 1. usuário autorizado às três permissões recebe JSON com resumo e entries;
-- 2. usuário sem clients.view_financial deve receber erro;
-- 3. usuário sem finance_professional.view_values deve receber erro;
-- 4. usuário com apenas finance_professional.view não consulta as views diretamente.
-- select public.get_client_financial_workspace('<UUID_CLIENTE>'::uuid);
