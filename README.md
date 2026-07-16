# Camilla Studio 3.0

Sistema de gestão para arquitetura e interiores, organizado por módulos independentes.

## Requisitos
- Node.js 22.13 ou superior
- pnpm 11.12.0

## Configuração
Copie `.env.example` para `.env.local` e preencha somente no ambiente local:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

## Execução
```bash
pnpm install --frozen-lockfile
pnpm dev
```

## Validação
```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

## Rotas
Dashboard, Projetos, Kanban, Atividades, Agenda, Clientes, Financeiro, Arquivos, Relatórios, Usuários e Configurações possuem páginas e carregamentos independentes.

## Banco
Nenhum SQL foi necessário na Etapa 01.
