# Etapa 03 — Aplicação do SQL

## Pré-requisitos

1. A Etapa 02 deve estar aplicada.
2. Faça backup do banco e do Storage.
3. Confirme que existe um Administrador ou Proprietária ativo.
4. Não execute migrations antigas da pasta `supabase/migrations-legacy/future-drafts`.

## Ordem obrigatória

1. Execute `supabase/validation/etapa-03-preflight.sql`.
2. Revise os totais de projetos, etapas, checklists e prazos.
3. Execute **uma única vez** o arquivo `camilla-studio-etapa-03.sql` ou a migration equivalente `supabase/migrations/20260716170000_camilla_stage03_projects_kanban.sql`.
4. Execute `supabase/validation/etapa-03-postflight.sql`.
5. Execute `supabase/validation/etapa-03-data-integrity.sql`.
6. Execute `supabase/validation/etapa-03-rls-tests.sql`.
7. Publique o código da Etapa 03 somente depois que todas as validações retornarem sem falhas.

Não execute o SQL consolidado e a migration em sequência: eles possuem o mesmo conteúdo.

## Verificações esperadas

- nenhum projeto em `construction`;
- `briefing_preliminary` exibido como Estudo Preliminar;
- bucket `project-thumbnails` privado;
- RLS ativa em `project_dates` e `project_thumbnails`;
- nenhuma duplicidade de prazo principal;
- view `project_kanban_view` criada;
- versão `3.0.4` registrada.

## Publicação local

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm start
```

Configure somente no ambiente de implantação:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Nunca coloque `service_role`, senha de banco ou segredo administrativo em variáveis `NEXT_PUBLIC_*`.
