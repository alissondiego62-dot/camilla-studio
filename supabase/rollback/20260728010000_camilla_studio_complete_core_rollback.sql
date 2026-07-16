-- Reversão conservadora da migration 20260728010000.
-- Por segurança, não remove colunas adicionadas a tabelas preexistentes.
begin;

drop policy if exists finance_settlements_access on public.financial_settlements;
drop policy if exists finance_entries_access on public.financial_entries;
drop policy if exists finance_categories_access on public.financial_categories;
drop policy if exists finance_accounts_access on public.financial_accounts;
drop policy if exists audit_history_access on public.audit_history;
drop policy if exists notifications_own_update on public.user_notifications;
drop policy if exists notifications_own_select on public.user_notifications;
drop policy if exists checklist_template_items_admin on public.checklist_template_items;
drop policy if exists checklist_template_items_read on public.checklist_template_items;
drop policy if exists checklist_templates_admin on public.checklist_templates;
drop policy if exists checklist_templates_read on public.checklist_templates;
drop policy if exists project_deadlines_access on public.project_deadlines;
drop policy if exists client_notes_project_access on public.client_notes;
drop policy if exists profile_permissions_admin on public.profile_permissions;
drop policy if exists permission_profiles_admin on public.permission_profiles;

-- As tabelas são preservadas por padrão para impedir perda de dados.
-- Para uma remoção integral, exporte-as antes e execute DROP manualmente em staging.
commit;
