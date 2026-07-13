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

## Arquitetura híbrida: Supabase + Google Drive

- **Supabase:** clientes, projetos, prazos, financeiro, comentários, histórico e metadados dos documentos.
- **Google Drive:** arquivos originais como PDF, DWG, RVT, SKP, renders, contratos, RRT e fotos.
- A aplicação grava somente `nome`, `categoria`, `link`, `observações` e vínculo com o projeto.

Para ativar o módulo de links, execute também:

3. `supabase/migrations/20260717010000_hybrid_drive_documents.sql`

Depois, abra um projeto e use **Arquivos no Google Drive > Adicionar link**.

## Atualização Fase 4 — Agenda e financeiro no projeto

Execute no SQL Editor do Supabase, após as migrations anteriores:

```text
supabase/migrations/20260719010000_project_agenda_and_financial_income.sql
```

Esta atualização adiciona:

- agenda vinculada a cada projeto;
- lançamento de entradas, parcelas e recebimentos;
- alteração rápida de etapa, status e responsável;
- registro das ações no histórico;
- melhorias responsivas no painel do projeto.

O módulo financeiro desta versão controla somente valores recebidos. Não existe lançamento de despesas.

## Atualização Fase 7 — Finalizados, Agenda e Financeiro

Execute também, no SQL Editor do Supabase:

```text
supabase/migrations/20260721010000_completed_projects_and_full_finance.sql
```

A atualização:

- remove a coluna **Finalizado** do Kanban;
- adiciona finalização por botão dentro do projeto;
- cria a página **Finalizados**, agrupada por cliente;
- mantém projetos finalizados no contas a receber;
- permite receitas e despesas vinculadas ou avulsas;
- transforma a Agenda em uma página operacional com eventos e prazos.


## PWA e notificações

A Fase 17 permite instalar a plataforma na Tela de Início do iPhone e receber um resumo diário da agenda às 08:00 e lembretes 10 minutos antes dos compromissos. Consulte `PWA-NOTIFICACOES.md` para aplicar a migration, gerar as chaves VAPID, publicar a Edge Function e configurar o agendamento.
