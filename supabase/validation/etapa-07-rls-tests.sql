-- Etapa 07 — roteiro RLS para homologação
select tablename,policyname,cmd,roles,qual,with_check from pg_policies
where schemaname='public' and tablename in('clients','client_phones','client_emails','client_notes','financial_entry_payments','calendar_events','project_files')
order by tablename,policyname;
select p.proname,has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in('save_client','archive_client','reactivate_client','delete_client_safely','save_client_note','archive_client_note','pin_client_note','search_clients','get_client_financial_workspace')
order by p.proname;
-- Validar com usuários reais em homologação:
-- 1. colaborador sem acesso ao cliente não consegue consultar contatos, notas ou arquivos;
-- 2. usuário sem clients.manage_notes não cria ou edita observação;
-- 3. usuário sem clients.manage_contacts não altera telefones e e-mails;
-- 4. usuário autorizado ao projeto continua vendo o cliente relacionado;
-- 5. usuário sem financeiro não recebe valores profissionais nem pessoais.
