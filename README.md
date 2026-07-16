# Camilla Studio 3.0.7

Base atual: **Etapa 06 — Calendário, Agenda e integração bidirecional com Atividades**.

## Executar localmente

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Configure em `.env.local` somente as variáveis públicas do Supabase. Não coloque `service_role`, senha do banco, VAPID privada ou segredos de cron no frontend.

## Validar

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

## Banco — Etapa 06

As Etapas 02, 03, 04 e 05 são pré-requisitos. Para aplicar a Etapa 06:

1. Faça backup do banco.
2. Execute `supabase/validation/etapa-06-preflight.sql`.
3. Execute **somente** `camilla-studio-etapa-06.sql`.
4. Execute `supabase/validation/etapa-06-postflight.sql`.
5. Execute `supabase/validation/etapa-06-data-integrity.sql`.
6. Execute os testes de sincronização e duplicidade em homologação.
7. Execute `supabase/validation/etapa-06-rls-tests.sql` com usuários reais de teste.
8. Publique a aplicação atualizada.

Não execute o SQL consolidado e a migration equivalente em sequência.

## Agenda

A rota `/agenda` possui as visualizações:

- Dia;
- Semana;
- Mês.

A Agenda une, sem duplicar registros:

- eventos manuais de `calendar_events`;
- atividades e subatividades datadas de `project_activities`;
- prazos planejados de `project_dates` que ainda não foram convertidos em atividade ou evento.

Arrastar ou redimensionar um item atualiza a tabela de origem. Atividades sem data não aparecem. Itens cancelados ficam ocultos por padrão e podem ser exibidos pelo filtro.

## Segurança

- A view `agenda_items` usa `security_invoker=true`.
- Alterações são feitas por RPCs com validação de usuário e permissão.
- Eventos arquivados não aparecem na visão padrão.
- O ator não recebe notificação redundante da própria alteração.
- O fuso operacional permanece `America/Boa_Vista`.

Não inclua `.env.local`, chaves, senha do banco ou `service_role` no repositório ou no ZIP.
