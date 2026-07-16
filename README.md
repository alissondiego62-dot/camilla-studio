# Camilla Studio 3.0.5

Base atual: **Etapa 04 — Notificações, Histórico, Arquivos e Comentários**.

## Executar localmente

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Configure em `.env.local` somente as variáveis públicas do Supabase e `NEXT_PUBLIC_VAPID_PUBLIC_KEY` quando o push for habilitado. Não coloque `service_role`, senha do banco, VAPID privada ou segredos de cron no frontend.

## Validar

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

## Banco — Etapa 04

As Etapas 02 e 03 são pré-requisitos. Para aplicar a Etapa 04, siga esta ordem:

1. `docs/ETAPA-04-APLICACAO-SQL.md`
2. `supabase/validation/etapa-04-preflight.sql`
3. `camilla-studio-etapa-04.sql`
4. `supabase/validation/etapa-04-postflight.sql`
5. `supabase/validation/etapa-04-data-integrity.sql`
6. `supabase/validation/etapa-04-notification-tests.sql`
7. `supabase/validation/etapa-04-rls-tests.sql` em homologação

Não execute o SQL consolidado e a migration equivalente em sequência.

## Edge Functions

Depois do SQL, implante:

1. `generate-deadline-notifications`
2. `dispatch-notifications`
3. a versão atualizada de `send-agenda-notifications`

Configure os segredos somente no Supabase: `CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT`.

## Segurança

- Buckets de miniaturas e arquivos vinculados são privados.
- A aplicação usa URLs assinadas para abrir ou baixar arquivos.
- Histórico é somente leitura para usuários comuns.
- Notificações e contadores são individuais por usuário.
- O Google Drive fornece somente links e metadados nesta etapa.

Não inclua `.env.local`, chaves, senha do banco ou `service_role` no repositório ou no ZIP.
