# Camilla Studio 3.0.9

Base atual: **Etapa 08 — Financeiro pessoal e profissional/CNPJ**.

## Recursos principais

- ambientes Pessoal e Profissional/CNPJ com RLS independente;
- visão consolidada somente para usuários autorizados nos dois ambientes;
- abas de visão geral, receitas, despesas, contas a receber, contas a pagar, fluxo de caixa, categorias, contas, cartões, modelos, cadastros auxiliares e relatórios;
- lançamentos previstos, pendentes, realizados, parciais, vencidos, cancelados, em análise e aguardando aprovação;
- baixa total ou parcial com desconto, juros, multa e histórico;
- contas, cartões, categorias, subcategorias, formas de pagamento, centros de custo e fornecedores;
- parcelamentos com distribuição exata dos centavos;
- recorrências idempotentes e modelos separados por ambiente;
- transferências atômicas entre contas, aportes, retiradas, pró-labore e distribuição de lucros;
- fluxo de caixa, gráficos e relatórios exportáveis;
- integração com Clientes, Projetos, Arquivos, Histórico, Notificações, Dashboard e Relatórios.

## Aplicação do banco

1. Faça backup do banco e do Storage.
2. Execute `supabase/validation/etapa-08-preflight.sql`.
3. Execute somente `camilla-studio-etapa-08.sql`.
4. Execute `etapa-08-postflight.sql` e `etapa-08-data-integrity.sql`.
5. Execute os testes de separação, baixa, recorrência, relatórios e RLS em homologação.
6. Publique o projeto atualizado.

Não execute o SQL consolidado e a migration equivalente em sequência.

## Execução local

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Use `.env.example` como referência. Não adicione chaves privadas ou `service_role` ao frontend.
