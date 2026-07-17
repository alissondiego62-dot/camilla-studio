-- Etapa 08 — verificação estrutural de RLS. Testes com usuários reais devem ocorrer em homologação.
select c.relname,c.relrowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in(
 'financial_entries','financial_entry_payments','financial_environment_access','financial_accounts','financial_cards',
 'financial_categories','financial_templates','financial_recurring_rules','financial_transfers','financial_approvals')
order by c.relname;
select tablename,policyname,cmd,roles,qual,with_check from pg_policies
where schemaname='public' and tablename like 'financial_%' order by tablename,policyname;
select routine_name,security_type from information_schema.routines
where routine_schema='public' and routine_name in('get_finance_workspace','save_financial_entry','settle_financial_entry','get_financial_report');
-- Cenários obrigatórios em homologação:
-- 1. usuário somente profissional não consulta registros pessoais;
-- 2. proprietária consulta seus registros pessoais;
-- 3. usuário delegado vê apenas o proprietário autorizado;
-- 4. view consolidada exige acesso e view_values nos dois ambientes;
-- 5. anon não executa RPCs nem consulta tabelas.
