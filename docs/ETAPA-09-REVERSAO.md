# Etapa 09 — Reversão

Use `supabase/rollback/camilla-stage09-dashboard-reports-drive-rollback.sql` somente após backup.

A reversão:
- remove as RPCs e permissões específicas da Etapa 09;
- restaura as funções resumidas anteriores de Dashboard e Relatórios;
- mantém tabelas de auditoria e metadados para não perder registros;
- não exclui arquivos do Google Drive;
- não revoga compartilhamentos externos automaticamente;
- preserva histórico e operações já registradas.

Depois do rollback do banco, restaure o ZIP da Etapa 08 e publique novamente a aplicação. A desconexão da conta Google deve ser uma ação explícita antes ou depois da reversão, conforme a operação desejada.
