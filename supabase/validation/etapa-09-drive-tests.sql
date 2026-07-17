-- Etapa 09 — Google Drive. Não contém chamadas externas.
select connected,google_account_email,root_folder_id,root_folder_name,allow_public_sharing,last_connection_test_at,last_connection_error from public.google_drive_settings where id=true;
select id,user_id,google_account_email,active,connection_status,last_checked_at,last_error from public.google_drive_connections order by updated_at desc;
select count(*) as private_credentials from integration_private.google_drive_credentials;
select count(*) as pending_operations from public.google_drive_operations where status in('pending','processing');
select count(*) as active_shares from public.google_drive_shares where revoked_at is null;
-- Cenários obrigatórios após configurar secrets:
-- 1. iniciar OAuth e rejeitar state inválido/expirado;
-- 2. conectar, testar e desconectar;
-- 3. enviar arquivos de projeto, cliente, atividade e lançamento financeiro;
-- 4. atualizar metadados sem criar novo registro;
-- 5. compartilhar por e-mail e revogar;
-- 6. negar upload/compartilhamento sem permissão;
-- 7. confirmar que nenhum token aparece nas tabelas públicas ou respostas do cliente.
