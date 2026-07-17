# Reversão — Etapa 07

Restaure o ZIP da Etapa 06 e, quando necessário, execute `supabase/rollback/camilla-stage07-clients-crm-rollback.sql`.

A reversão é conservadora: desativa RPCs e views exclusivas, mas preserva clientes, contatos, observações, pagamentos, arquivos, histórico e vínculos criados após a migration. Nenhuma tabela com dados reais é apagada automaticamente.
