# Camilla Studio 3.0.4

Base atual: **Etapa 03 — Projetos, Kanban, Miniaturas, Prazos e Etapas**.

## Executar localmente

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

## Validar

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

## Banco

A Etapa 02 é pré-requisito. Para aplicar a Etapa 03, leia:

1. `docs/ETAPA-03-APLICACAO-SQL.md`
2. `supabase/validation/etapa-03-preflight.sql`
3. `camilla-studio-etapa-03.sql`
4. `supabase/validation/etapa-03-postflight.sql`
5. `supabase/validation/etapa-03-data-integrity.sql`
6. `supabase/validation/etapa-03-rls-tests.sql`

Não execute o SQL consolidado e a migration equivalente em sequência.

Não inclua `.env.local`, chaves, senha do banco ou `service_role` no repositório ou no ZIP.
