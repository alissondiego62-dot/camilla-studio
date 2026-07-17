# Etapa 08 — Políticas RLS

## Princípios aplicados

- RLS habilitada em todas as novas tabelas expostas;
- `SELECT` limitado pelo ambiente, proprietária e delegação;
- `INSERT` e `UPDATE` exigem permissão da ação e mantêm o registro no mesmo escopo;
- exclusões físicas são bloqueadas para lançamentos, pagamentos, ajustes, transferências e aprovações;
- operações compostas são realizadas por RPCs transacionais;
- funções `SECURITY DEFINER` possuem `search_path` fixo;
- execução revogada para `PUBLIC` e `anon`;
- views financeiras usam `security_invoker=true` e não expõem valores diretamente.

## Financeiro Pessoal

A autorização não depende apenas do perfil. `owner_user_id` ou uma delegação ativa é obrigatório.

## Financeiro Profissional

As ações permanecem independentes das permissões pessoais.
