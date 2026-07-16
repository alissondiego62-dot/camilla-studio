# Etapa 05 — Políticas RLS

## Atividades

- `SELECT`: `can_access_activity(id)` e registro não excluído logicamente;
- `INSERT`: permissão de criação e edição do projeto quando vinculado;
- `UPDATE`: `can_edit_activity(id)` em `USING` e `WITH CHECK`;
- `DELETE`: apenas permissão elevada; a interface usa exclusão lógica.

## Participantes

Leitura depende do acesso à atividade. Inclusão, edição e remoção dependem de `can_edit_activity`.

## Visualizações salvas

Cada usuário consulta e altera somente suas próprias visualizações.

## Comentários, arquivos e agenda

As funções de acesso foram ampliadas para relações por atividade. Comentários, anexos e eventos continuam protegidos por RLS e não ficam acessíveis apenas por estarem vinculados a um UUID conhecido.
