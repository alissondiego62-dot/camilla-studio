# Etapa 09 — Google Drive

O Google Drive funciona como suporte de arquivos. O banco permanece responsável por metadados, relações, versões, permissões e histórico.

## Operações
- salvar link manual sem OAuth;
- conectar conta Google;
- enviar arquivo;
- atualizar metadados;
- abrir arquivo;
- compartilhar com e-mail específico;
- revogar compartilhamento;
- desconectar a integração.

## Relações aceitas
- projeto;
- cliente;
- atividade;
- lançamento financeiro autorizado.

## Segurança
- tokens são criptografados com AES-GCM;
- credenciais ficam em `integration_private`;
- estado OAuth é de uso único e expira;
- compartilhamento público fica desativado por padrão;
- o frontend nunca recebe refresh token ou `service_role`;
- todas as operações validam sessão e permissão do registro relacionado.

## Estado sem configuração externa
Salvar links e usar o Storage privado continuam funcionando. Upload e compartilhamento pelo Drive exibem que a configuração OAuth é necessária.
