# Etapa 08 — Reversão

1. Restaure o ZIP da Etapa 07 na aplicação.
2. Execute `supabase/rollback/camilla-stage08-finance-rollback.sql` somente após revisão.
3. Verifique Dashboard, Clientes, Projetos e Relatórios.

O rollback é conservador. Ele desativa RPCs e views exclusivas da Etapa 08, mas não apaga contas, cartões, categorias, pagamentos, parcelas, recorrências, transferências ou histórico criados após a migration.
