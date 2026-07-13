# Camilla Studio — Gestão para Arquitetura

Primeira adaptação da base PCP para gestão de escritório de arquitetura.

## Incluído nesta versão

- identidade visual Camilla Studio;
- dashboard de projetos, prazos e financeiro;
- Kanban por etapa com arrastar e soltar;
- cadastro de projeto e cliente;
- agenda consolidada pelas três entregas;
- lista de clientes;
- visão financeira;
- painel lateral do projeto;
- integração Supabase;
- migration com RLS e histórico;
- importação dos 16 projetos da planilha.

## Executar no VS Code

1. Instale Node.js 22 ou superior e pnpm.
2. Copie `.env.example` para `.env.local`.
3. Preencha URL e chave pública do Supabase.
4. Execute:

```bash
pnpm install
pnpm dev
```

Acesse o endereço exibido no terminal.

## Preparar o Supabase

No SQL Editor, execute nesta ordem:

1. `supabase/migrations/20260716010000_architecture_platform.sql`
2. `supabase/seed-architecture-projects.sql`

Depois crie o primeiro usuário em **Authentication > Users**.

## Verificações

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Observação

As migrations antigas da Publicolor foram preservadas como histórico da base. A nova interface usa as tabelas `clients`, `projects`, `project_deliverables`, `calendar_events`, `project_comments` e `project_history`.
