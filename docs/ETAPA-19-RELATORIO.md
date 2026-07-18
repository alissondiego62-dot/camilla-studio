# Camilla Studio 3.0.20 — Etapa 19

## Objetivo

Revisar o painel financeiro para que todo saldo contratual ainda não recebido continue visível como receita prevista, mesmo sem data de vencimento, e permitir liquidação e exclusão segura tanto no Financeiro geral quanto em Projeto > Financeiro.

## Alterações principais

- Separação entre **A receber com data** e **A receber sem data**.
- Saldo contratual não distribuído em parcelas contabilizado como receita prevista sem data.
- Card **Saldo disponível** calculado pelas contas, saldos iniciais e baixas efetivas.
- Lançamentos legados marcados como recebidos/pagos sem baixa são convertidos em movimentações reais na conta **Caixa geral**.
- Card **Recebido no período** calculado pela data real da baixa.
- Liquidação total ou parcial no Financeiro geral.
- Liquidação de lançamentos e do saldo contratual diretamente dentro do projeto.
- Exclusão lógica auditável apenas para lançamentos sem baixa.
- Lançamentos com recebimento/pagamento exigem estorno antes da exclusão.
- Data prevista de receita tornou-se opcional.
- Status financeiro removido do formulário manual e calculado pelo sistema.
- Campos secundários movidos para “Mais opções”.
- Conta “Caixa geral” criada quando não houver conta profissional com esse nome.

## Arquivos principais

- `supabase/migrations/20260718180000_camilla_stage19_financial_receivables.sql`
- `camilla-studio-etapa-19-financeiro-recebiveis.sql`
- `app/features/finance/*`
- `app/features/project-detail/ProjectFinancialPanel.tsx`

## Aplicação no Supabase

Execute a migration da Etapa 19 após a Etapa 18. O arquivo SQL avulso contém o mesmo conteúdo para aplicação manual no SQL Editor.

## Simplificações aplicadas aos formulários

- Removida a escolha manual de status. O sistema define previsto, parcial, recebido/pago ou vencido.
- Conta e forma de pagamento passaram a ser solicitadas na liquidação, e não na criação da previsão.
- Fornecedor e cartão aparecem somente em despesas profissionais.
- Documento, subcategoria, centro de custo, cartão, fornecedor e observações ficam em **Mais opções**.
- Data prevista de receita é opcional; competência continua obrigatória para organização contábil.

## Melhorias recomendadas para as próximas etapas

1. Tela de estorno com seleção da baixa, motivo obrigatório e atualização imediata do saldo.
2. Conciliação bancária por extrato e identificação de entradas ainda não vinculadas.
3. Anexos de comprovantes diretamente na baixa financeira.
4. Aditivos, descontos contratuais e histórico de alteração do valor do contrato.
5. Régua de cobrança para vencidos e projetos concluídos com saldo pendente.
6. Previsão mensal separando valores com vencimento definido do saldo ainda não programado.
7. Permissão específica para visualizar valores, liquidar, estornar e excluir.
8. Relatório de divergências: parcelas acima do contrato, recebimentos acima do saldo e contratos sem detalhamento.

## Campos que não devem voltar ao formulário principal

- Status manual.
- Responsável pela criação ou pela baixa — preenchimento automático pelo usuário autenticado.
- Ambiente financeiro — definido pela área aberta.
- Número da parcela digitado — deve ser gerado pelo parcelamento.
- Conta e forma de pagamento em previsões ainda não liquidadas.
- Fornecedor e cartão em receitas.
