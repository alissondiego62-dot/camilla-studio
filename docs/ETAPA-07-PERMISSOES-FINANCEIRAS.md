# Etapa 07 — Permissões financeiras

A ficha do cliente exibe valores somente quando o usuário possui simultaneamente:

- `clients.view_financial`;
- `finance_professional.view`;
- `finance_professional.view_values`.

As views internas consultam somente `environment='professional'`. Elas não possuem `SELECT` direto para `authenticated`; os valores são entregues exclusivamente pela RPC `get_client_financial_workspace(uuid)`, que repete as três verificações no banco antes de retornar o resumo e os lançamentos.

O Financeiro Pessoal não participa da ficha do cliente. Pagamentos parciais são preservados em `financial_entry_payments` e continuam sujeitos às políticas do Financeiro profissional. Observações financeiras e históricos financeiros também exigem autorização para visualizar valores.
