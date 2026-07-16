# Etapa 04 — correção final do SQL

O SQL consolidado e a migration desta entrega contêm a correção definitiva da função `public.log_admin_central_history()`.

A função converte `NEW` ou `OLD` para JSONB antes de acessar a chave do registro, permitindo auditar tanto tabelas com coluna `id` quanto `system_settings`, que utiliza a coluna `key`.

O arquivo aplicado com sucesso no Supabase corresponde a:

- `camilla-studio-etapa-04.sql`
- `supabase/migrations/20260716190000_camilla_stage04_notifications_history.sql`

Os dois arquivos são idênticos.
