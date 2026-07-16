# Camilla Studio 3.0.2

Base atual: **Etapa 02 — Configurações, Usuários, Permissões, Segurança e Checklists**.

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

Leia, nesta ordem:

1. `docs/ETAPA-02-APLICACAO-SQL.md`
2. `supabase/validation/etapa-02-preflight.sql`
3. `camilla-studio-etapa-02.sql`
4. `supabase/validation/etapa-02-postflight.sql`

Não inclua `.env.local`, chaves ou service role no repositório ou no ZIP.
