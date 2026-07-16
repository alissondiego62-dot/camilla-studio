# Políticas RLS — Etapa 02

## Princípios

- RLS habilitada nas tabelas expostas.
- Nenhuma política operacional nova usa `USING (true)` ou `WITH CHECK (true)`.
- Usuário inativo, arquivado, bloqueado ou com sessão revogada não passa em `current_user_access_valid()`.
- Autorização não usa `user_metadata`; os dados estão em tabelas administrativas.
- Funções `SECURITY DEFINER` têm `search_path` fixado e `EXECUTE` revogado de `PUBLIC`.
- Tabelas que podem guardar tokens do Google Drive permanecem inacessíveis a `anon` e `authenticated`.

## Principais tabelas protegidas

| Grupo | Tabelas | Regra central |
|---|---|---|
| Identidade | `profiles`, `teams`, `team_members` | próprio perfil ou gestão autorizada |
| Permissões | `permission_profiles`, `profile_permissions`, `user_permission_overrides`, `permission_catalog` | perfil atual ou gestão de usuários |
| Projetos | `projects`, `project_members` | escopo próprio, atribuído, equipe ou total |
| Operação | `project_activities`, `calendar_events`, `project_files`, `project_checklist_items` | vínculo com projeto/atividade/evento e ação permitida |
| Clientes | `clients` | permissão global ou cliente ligado a projeto acessível |
| Financeiro | `financial_entries`, `project_financial_entries` | ambientes pessoal e profissional separados |
| Configuração | `system_settings`, etapas, status, categorias, versões | visualizar/gerenciar configurações |
| Segurança | `security_audit_events` | leitura de segurança; gravações críticas por funções/servidor |
| Checklists | modelos, itens e aplicações | gestão de modelos e acesso por projeto |
| Integrações | configurações e conexões | status seguro por RPC; tokens sem acesso direto |

## Funções de autorização

- `current_user_access_valid()`
- `permission_scope(module, action)`
- `has_permission(module, action, minimum_scope)`
- `current_access_context()`
- `can_access_project(project_id)`
- `can_edit_project(project_id)`
- `can_access_client(client_id)`
- `can_access_activity(activity_id)`
- `can_access_calendar_event(event_id)`
- `can_view_finance(environment)`

## Políticas legadas revisadas

O SQL remove políticas abertas de projetos, clientes, agenda, arquivos, comentários, entregáveis, histórico, checklists e financeiro legado, substituindo-as por políticas por ação e escopo. Funções antigas executáveis por `PUBLIC` têm a execução revogada quando existem.

## Políticas criadas ou substituídas

- `activities_delete_scope`
- `activities_insert_scope`
- `activities_select_scope`
- `activities_update_scope`
- `activity_statuses_manage`
- `activity_statuses_read`
- `calendar_delete_scope`
- `calendar_insert_scope`
- `calendar_select_scope`
- `calendar_update_scope`
- `checklist_applications_access`
- `checklist_template_items_manage`
- `checklist_template_items_read`
- `checklist_templates_manage`
- `checklist_templates_read`
- `clients_delete_scope`
- `clients_insert_scope`
- `clients_select_scope`
- `clients_update_scope`
- `drive_connections_manage`
- `drive_connections_read`
- `drive_settings_manage`
- `drive_settings_read`
- `financial_entries_delete_scope`
- `financial_entries_insert_scope`
- `financial_entries_select_scope`
- `financial_entries_update_scope`
- `permission_catalog_read`
- `permission_profiles_manage`
- `permission_profiles_read`
- `profile_permissions_manage`
- `profile_permissions_read`
- `profiles_select_authorized`
- `profiles_update_admin`
- `project_checklist_delete`
- `project_checklist_insert`
- `project_checklist_select`
- `project_checklist_update`
- `project_comments_delete_scope`
- `project_comments_insert_scope`
- `project_comments_select_scope`
- `project_comments_update_scope`
- `project_deliverables_delete_scope`
- `project_deliverables_insert_scope`
- `project_deliverables_select_scope`
- `project_deliverables_update_scope`
- `project_files_delete_scope`
- `project_files_insert_scope`
- `project_files_select_scope`
- `project_files_update_scope`
- `project_financial_delete_scope`
- `project_financial_insert_scope`
- `project_financial_select_scope`
- `project_financial_update_scope`
- `project_history_select_scope`
- `project_members_manage`
- `project_members_read`
- `project_revisions_delete_scope`
- `project_revisions_insert_scope`
- `project_revisions_select_scope`
- `project_revisions_update_scope`
- `project_stages_manage`
- `project_stages_read`
- `project_statuses_manage`
- `project_statuses_read`
- `projects_delete_scope`
- `projects_insert_scope`
- `projects_select_scope`
- `projects_update_scope`
- `security_audit_read`
- `system_categories_manage`
- `system_categories_read`
- `system_settings_manage`
- `system_settings_read`
- `system_versions_manage`
- `system_versions_read`
- `team_members_manage`
- `team_members_read`
- `teams_manage`
- `teams_read`
- `user_permission_overrides_manage`
- `user_permission_overrides_read`

Total identificado no SQL consolidado: **82 políticas nomeadas**. Políticas condicionais são criadas somente quando a tabela legada correspondente existe.
