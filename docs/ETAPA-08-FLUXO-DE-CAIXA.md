# Etapa 08 — Fluxo de caixa

O fluxo não possui tabela duplicada. Ele é derivado de lançamentos, pagamentos, contas e ajustes.

Views principais:

- `financial_entry_balance_view`;
- `financial_account_balance_view`;
- `financial_cash_flow_view`;
- `financial_period_summary_view`;
- `financial_dashboard_view`.

A interface apresenta entradas, saídas, resultado e saldo projetado. A fonte oficial dos valores permanece no PostgreSQL; cálculos visuais não substituem o valor do banco.
