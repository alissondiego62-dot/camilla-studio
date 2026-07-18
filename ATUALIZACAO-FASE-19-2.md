# Camilla Studio 3.0.22 — Cancelamento direto na listagem financeira

## Correção

A coluna **Ações** das páginas Receitas, Despesas, Contas a receber e Contas a pagar passou a exibir o cancelamento sem exigir que o usuário abra primeiro o lançamento.

- Lançamento sem baixa: botão **Cancelar**.
- Lançamento total ou parcialmente liquidado: botão **Estornar e cancelar**.
- Lançamento já cancelado ou arquivado: a ação não é exibida.
- O motivo é obrigatório e deve possuir pelo menos cinco caracteres.
- A ação utiliza a mesma função segura `cancel_financial_entry` já adicionada na versão 3.0.21.

## Banco de dados

Esta atualização é apenas de interface. Não existe SQL novo. O banco deve estar com a migration completa REV4 ou com o hotfix 3.0.21 aplicado.
