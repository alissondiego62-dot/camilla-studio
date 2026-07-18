# Camilla Studio 3.0.21 — Etapa 19.1

## Revisão solicitada

Foi revisado o botão de cancelamento de receitas e despesas que já possuem liquidação total ou parcial.

## Problema encontrado

A interface mostrava **Cancelar** mesmo quando o lançamento possuía recebimento ou pagamento. A função anterior do banco alterava o status para cancelado, mas não estornava as baixas. Isso podia causar divergência entre:

- saldo da conta;
- recebido ou pago no período;
- situação do lançamento;
- posição financeira do projeto.

## Comportamento implementado

### Lançamento sem baixa

- O botão aparece como **Cancelar receita** ou **Cancelar despesa**.
- O lançamento é cancelado e permanece no histórico.
- Nenhum saldo bancário é alterado, pois não existia movimentação.

### Lançamento liquidado ou parcialmente liquidado

- O botão aparece como **Estornar e cancelar**.
- A confirmação informa que o saldo da conta será corrigido.
- Todas as baixas ativas são arquivadas em uma única transação.
- Ajustes ativos de desconto, juros, multa ou correção também são arquivados.
- O lançamento passa para `cancelled`.
- `settled_at` e `settled_by` são limpos.
- Motivo com pelo menos cinco caracteres é obrigatório.
- A operação é registrada em `security_audit_events`.

## Correção de dados anteriores

A migration identifica lançamentos já cancelados que ainda tenham baixas ativas. Essas baixas e seus ajustes são estornados tecnicamente para restaurar a consistência do saldo.

## Locais atualizados

- Financeiro geral, no drawer de detalhes do lançamento.
- Projeto → Financeiro, na tabela de receitas e despesas vinculadas.
- Função PostgreSQL `public.cancel_financial_entry`.
- Auditoria financeira e correção de registros antigos.

## Arquivos principais

- `app/features/finance/FinanceEntryDrawer.tsx`
- `app/features/project-detail/ProjectFinancialPanel.tsx`
- `supabase/migrations/20260718180000_camilla_stage19_financial_receivables.sql`
- `camilla-studio-hotfix-cancelamento-liquidado-3.0.21.sql`
- `tests/stage19-cancel-settled.test.mjs`

## Qual SQL executar

### Etapa 19 ainda não foi concluída

Execute o arquivo completo `camilla-studio-etapa-19-financeiro-recebiveis-rev4.sql`. Ele inclui a correção da view e o cancelamento seguro.

### Etapa 19 já foi concluída com sucesso

Execute somente `camilla-studio-hotfix-cancelamento-liquidado-3.0.21.sql`.

## Validação

- 168 testes executados.
- 141 aprovados.
- 27 ignorados porque dependem do ambiente completo de execução.
- 0 falhas.
- O typecheck completo não pôde ser concluído porque o ZIP não contém `node_modules`; os erros retornados foram exclusivamente de dependências React, Next, Supabase e tipos ausentes no ambiente.
