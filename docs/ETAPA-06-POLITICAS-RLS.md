# Etapa 06 — Políticas de acesso

- `agenda_items` usa `security_invoker=true` e herda as políticas das tabelas de origem.
- Eventos exigem acesso por autoria, responsabilidade, projeto, atividade ou escopo global.
- Atividades continuam usando `can_access_activity` e `can_edit_activity`.
- Prazos usam `can_edit_project` e `projects.change_deadline`.
- As RPCs exigem `auth.uid()` e tiveram execução revogada para `PUBLIC` e `anon`.
- Somente `authenticated` recebe `EXECUTE`.
- Eventos pessoais não são expostos por simples autenticação.
