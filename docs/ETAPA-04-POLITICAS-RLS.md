# Etapa 04 — Políticas de acesso

## Notificações

- Usuário visualiza somente notificações cujo `user_id = auth.uid()`.
- Leitura é alterada exclusivamente por RPC validada.
- Regras pessoais pertencem ao próprio usuário.
- Regras de perfil exigem permissão administrativa.

## Histórico

- Somente leitura.
- Acesso por projeto, cliente, atividade, agenda, arquivo, financeiro ou administração.
- Financeiro Pessoal continua restrito.
- Observações internas exigem `comments.view_internal`.

## Comentários

- A seleção exige acesso ao projeto.
- Observações internas exigem permissão específica.
- Inclusão, edição e exclusão são feitas por RPCs com validação da autoria, prazo e escopo.

## Arquivos

- Projeto: `can_access_project` ou `can_edit_project`.
- Cliente: permissão correspondente de clientes.
- Atividade: acesso à atividade e permissão de edição quando necessário.
- Financeiro: permissão do ambiente pessoal ou profissional.
- Storage usa o caminho do objeto para validar a entidade relacionada.

## Realtime

Somente `notifications` é adicionada à publicação. A assinatura do cliente é filtrada pelo ID do destinatário, e a RLS permanece ativa.
