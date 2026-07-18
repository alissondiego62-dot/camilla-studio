# Aplicação do SQL — Etapa 18

Execute apenas `camilla-studio-etapa-18-valor-contrato-atividades-agenda.sql`.

Não execute também a migration equivalente na mesma base.

## Ordem

1. Backup.
2. `supabase/validation/etapa-18-preflight.sql`.
3. SQL principal.
4. `etapa-18-postflight.sql`.
5. `etapa-18-data-integrity.sql`.
6. `etapa-18-security-tests.sql` com usuário administrador.

O script não atualiza diretamente `projects.balance_due` e não remove registros financeiros.
