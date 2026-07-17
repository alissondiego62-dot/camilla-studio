# Etapa 08 — Recorrências e modelos

## Regras recorrentes

`financial_recurring_rules` registra ambiente, natureza, descrição, valor, periodicidade, intervalo, início, fim e relações opcionais.

`financial_recurring_occurrences` possui chave única por `rule_id` e `occurrence_date`. A geração é idempotente: a mesma competência não é criada duas vezes.

Alterar ou arquivar uma regra não modifica lançamentos históricos.

## Modelos

`financial_templates` permanece separado por ambiente. O modelo serve como origem para novos lançamentos, mas lançamentos já criados mantêm seu próprio snapshot de dados.
