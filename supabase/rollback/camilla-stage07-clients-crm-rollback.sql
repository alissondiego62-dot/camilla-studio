-- Camilla Studio — reversão conservadora da Etapa 07
-- Restaure primeiro o ZIP da Etapa 06. Este script desativa as superfícies exclusivas da Etapa 07,
-- mas preserva clientes, contatos, observações, pagamentos, vínculos, histórico e arquivos.
begin;

revoke execute on function public.save_client(uuid,jsonb),public.archive_client(uuid),public.reactivate_client(uuid),public.delete_client_safely(uuid),public.save_client_note(uuid,uuid,jsonb),public.archive_client_note(uuid),public.pin_client_note(uuid,boolean),public.search_clients(text,jsonb,integer,integer),public.get_client_financial_workspace(uuid),public.get_client_indicators(uuid) from authenticated;

drop function if exists public.get_client_indicators(uuid);
drop function if exists public.get_client_financial_workspace(uuid);
drop function if exists public.search_clients(text,jsonb,integer,integer);
drop view if exists public.client_financial_summary_view;
drop view if exists public.client_financial_entries_view;
drop view if exists public.client_directory_view;

drop function if exists public.save_client_note(uuid,uuid,jsonb);
drop function if exists public.archive_client_note(uuid);
drop function if exists public.pin_client_note(uuid,boolean);
drop function if exists public.save_client(uuid,jsonb);
drop function if exists public.archive_client(uuid);
drop function if exists public.reactivate_client(uuid);
drop function if exists public.delete_client_safely(uuid);

-- As tabelas, colunas, políticas, FKs RESTRICT, contatos e observações são mantidos deliberadamente.
-- Não apague client_phones, client_emails, client_notes ou financial_entry_payments: podem conter dados reais.
delete from public.system_versions where version='3.0.8';

commit;
