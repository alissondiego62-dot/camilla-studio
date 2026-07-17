# Etapa 09 — Políticas RLS

## Princípios
- agregações do Dashboard usam as funções de acesso já existentes;
- relatórios retornam somente registros acessíveis ao usuário;
- valores financeiros exigem autorização de valores;
- auditoria de exportação é inserida somente por RPC;
- operações e compartilhamentos do Drive respeitam o arquivo relacionado;
- tabelas de credenciais ficam em schema privado e fora da Data API.

## Estruturas
- `report_export_audit`: leitura própria ou auditoria autorizada;
- `google_drive_operations`: leitura da própria operação ou administração autorizada;
- `google_drive_shares`: acesso condicionado ao arquivo;
- `integration_private.google_drive_credentials`: somente Edge Functions com chave de serviço;
- `integration_private.google_drive_oauth_states`: estados temporários e de uso único.

As funções `SECURITY DEFINER` fixam `search_path`, validam `auth.uid()` e têm execução revogada para `PUBLIC` e `anon`.
