# Etapa 08 — Estrutura financeira

## Livro central

`financial_entries` permanece como fonte principal. Os dois lançamentos profissionais existentes são preservados com seus UUIDs, valores, datas e status.

Cada registro identifica `environment` como `personal` ou `professional`. Registros pessoais também possuem `owner_user_id`. Valores monetários usam `numeric(18,2)` no PostgreSQL e strings decimais na comunicação com a interface.

## Estruturas adicionadas

- `financial_environment_access`: delegações explícitas por ambiente e proprietária;
- `financial_accounts`: bancos, caixa, carteiras, contas digitais e investimentos;
- `financial_cards` e `financial_card_statements`;
- `financial_categories`: categorias e subcategorias hierárquicas;
- `financial_payment_methods`, `financial_cost_centers` e `financial_suppliers`;
- `financial_templates` e `financial_recurring_rules`;
- `financial_installment_groups`;
- `financial_entry_adjustments`;
- `financial_transfers`;
- `financial_approvals`.

## Status

`forecast`, `pending`, `paid`, `received`, `partially_paid`, `partially_received`, `overdue`, `cancelled`, `under_review` e `awaiting_approval`.

O status efetivo é calculado pela view de saldo, considerando vencimento, pagamentos e ajustes.
