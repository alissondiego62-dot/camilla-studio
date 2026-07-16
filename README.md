# Camilla Studio 3.0.6

Base atual: **Etapa 05 — Atividades e Subatividades**.

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

## Banco — Etapa 05

As Etapas 02, 03 e 04 são pré-requisitos. Para aplicar a Etapa 05:

1. Faça backup do banco.
2. Execute `supabase/validation/etapa-05-preflight.sql`.
3. Execute **somente** `camilla-studio-etapa-05.sql`.
4. Execute `supabase/validation/etapa-05-postflight.sql`.
5. Execute `supabase/validation/etapa-05-data-integrity.sql`.
6. Execute os testes de hierarquia e visualizações salvas em homologação.
7. Execute `supabase/validation/etapa-05-rls-tests.sql` com usuários reais de teste.

Não execute o SQL consolidado e a migration equivalente em sequência.

## Atividades

A rota `/activities` utiliza os mesmos registros nas visualizações:

- Tabela;
- Lista;
- Quadro;
- Calendário;
- Linha do tempo.

A página permite visualizações salvas, filtros, agrupamentos, propriedades configuráveis, ações em massa, subatividades, observações estruturadas, comentários, anexos e agenda relacionada.

## Segurança

- RLS permanece aplicada por escopo e vínculo.
- Subatividades não são apagadas em cascata.
- Ações em massa são transacionais.
- Observações não aceitam HTML arbitrário.
- Comentários e anexos são carregados somente ao abrir a atividade.

Não inclua `.env.local`, chaves, senha do banco ou `service_role` no repositório ou no ZIP.
