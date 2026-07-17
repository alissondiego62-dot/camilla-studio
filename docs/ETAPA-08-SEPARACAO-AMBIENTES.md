# Etapa 08 — Separação entre Pessoal e Profissional

## Pessoal

O acesso exige simultaneamente:

1. permissão no módulo `finance_personal`;
2. ser a proprietária do registro ou possuir delegação ativa em `financial_environment_access`;
3. autorização para a ação solicitada.

Um perfil administrativo genérico não recebe acesso pessoal automaticamente.

## Profissional/CNPJ

O acesso usa o módulo `finance_professional` e pode ser complementado por delegações explícitas.

## Consolidado

A visão consolidada exige acesso de leitura nos dois ambientes e `finance_professional.view_consolidated`. Valores somente são retornados quando `view_values` está autorizado nos dois ambientes.

## Realtime e exportação

As consultas são realizadas por RPCs que repetem as verificações no banco. As views financeiras com valores não concedem `SELECT` direto a `authenticated`.
