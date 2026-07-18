# Camilla Studio 3.0.21 — Etapa 19.1

## Cancelamento seguro de lançamentos liquidados

- Receitas recebidas e despesas pagas exibem a ação **Estornar e cancelar**.
- O cancelamento ocorre em uma única transação no banco.
- Todas as baixas ativas são estornadas antes do cancelamento.
- Ajustes de desconto, juros e multa vinculados ao lançamento são arquivados junto com o estorno.
- O saldo das contas é recalculado porque as movimentações deixam de ser consideradas.
- O lançamento e os movimentos permanecem preservados para auditoria.
- Motivo com pelo menos cinco caracteres é obrigatório.
- A mesma regra está disponível no Financeiro geral e em Projeto → Financeiro.
