# Etapa 07 — Políticas RLS

RLS permanece habilitada em todas as tabelas expostas.

- contatos e observações exigem acesso ao cliente;
- edição usa `can_edit_client` e permissões específicas;
- exclusão direta de contatos e observações é bloqueada; a aplicação usa arquivamento;
- observações financeiras exigem autorização financeira tanto no `USING` quanto no `WITH CHECK`;
- pagamentos parciais só podem permanecer vinculados a lançamentos profissionais autorizados;
- arquivos ligados diretamente ao cliente exigem `can_edit_client(client_id)` no banco;
- views com valores financeiros não podem ser consultadas diretamente por `authenticated`;
- histórico financeiro e observações financeiras não são liberados sem `view_values`;
- histórico é somente leitura para usuários comuns;
- funções privilegiadas validam `auth.uid()`, fixam `search_path` e não são executáveis por `anon` ou `PUBLIC`.
