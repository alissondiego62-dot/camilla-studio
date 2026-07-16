import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);
async function content(path) { return readFile(new URL(path, root), "utf8"); }

const requiredFiles = [
  "app/(studio)/notifications/page.tsx",
  "app/(studio)/history/page.tsx",
  "app/providers/NotificationProvider.tsx",
  "app/features/notifications/NotificationBell.tsx",
  "app/features/notifications/NotificationsPage.tsx",
  "app/features/history/HistoryPage.tsx",
  "app/features/comments/CommentThread.tsx",
  "app/features/comments/MentionPicker.tsx",
  "app/features/file-manager/FileUploadModal.tsx",
  "app/features/file-manager/FileMetadataModal.tsx",
  "app/features/file-manager/FileVersionList.tsx",
  "supabase/functions/dispatch-notifications/index.ts",
  "supabase/functions/generate-deadline-notifications/index.ts",
];

test("Etapa 04 possui central de notificações, histórico, comentários e arquivos", () => {
  for (const path of requiredFiles) assert.equal(existsSync(new URL(path, root)), true, `${path} deve existir`);
});

test("SQL da Etapa 04 contém o modelo central e políticas de segurança", async () => {
  const sql = await content("camilla-studio-etapa-04.sql");
  for (const token of [
    "notifications",
    "notification_type_catalog",
    "notification_profile_rules",
    "notification_user_rules",
    "record_views",
    "history_entries",
    "comment_mentions",
    "comment_reads",
    "version_group_id",
    "linked-files",
    "save_project_comment",
    "mark_record_view",
    "generate_due_notifications",
    "security_invoker=true",
    "supabase_realtime",
    "America/Boa_Vista",
  ]) assert.match(sql, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.doesNotMatch(sql, /using\s*\(\s*true\s*\)|with\s+check\s*\(\s*true\s*\)/i);
  assert.match(sql, /grant execute on function public\.generate_due_notifications\(timestamptz\) to service_role/i);
  assert.match(sql, /grant select on public\.notifications to authenticated/i);
  assert.doesNotMatch(sql, /grant\s+select\s*,\s*update\s+on\s+public\.notifications/i);
});

test("notificações Realtime são filtradas pelo destinatário", async () => {
  const service = await content("app/features/notifications/notifications.service.ts");
  const provider = await content("app/providers/NotificationProvider.tsx");
  assert.match(service, /filter:\s*`user_id=eq\.\$\{userId\}`/);
  assert.match(provider, /subscribeToNotifications\(user\.id/);
  assert.match(service, /mark_all_notifications_read/);
});

test("preferências podem ser definidas pelo usuário e por perfil", async () => {
  const page = await content("app/features/settings/NotificationSettingsPage.tsx");
  const service = await content("app/features/notifications/notifications.service.ts");
  assert.match(page, /Regras por perfil/);
  assert.match(page, /Minhas regras/);
  assert.match(service, /notification_profile_rules/);
  assert.match(service, /notification_user_rules|save_current_notification_rules/);
});

test("indicadores do Kanban usam contadores individuais de não visualizados", async () => {
  const shortcuts = await content("app/features/kanban/KanbanCardShortcuts.tsx");
  const service = await content("app/features/kanban/kanban.service.ts");
  const sql = await content("camilla-studio-etapa-04.sql");
  for (const field of ["unread_history_count", "unread_files_count", "unread_agenda_count", "unread_comments_count"]) {
    assert.match(shortcuts + service + sql, new RegExp(field));
  }
  assert.match(sql, /record_views[\s\S]*last_viewed_at/i);
});

test("comentários possuem respostas, menções, leitura, edição controlada e exclusão lógica", async () => {
  const sql = await content("camilla-studio-etapa-04.sql");
  const composer = await content("app/features/comments/CommentComposer.tsx");
  const item = await content("app/features/comments/CommentItem.tsx");
  for (const token of ["parent_comment_id", "comment_mentions", "comment_reads", "deleted_at", "comment_edit_window_minutes", "internal_note"]) assert.match(sql, new RegExp(token, "i"));
  assert.match(composer, /MentionPicker/);
  assert.match(item, /Responder/);
  assert.match(item, /Editar/);
});

test("arquivos usam bucket privado, versões persistentes e arquivamento", async () => {
  const sql = await content("camilla-studio-etapa-04.sql");
  const service = await content("app/features/file-manager/file-manager.service.ts");
  const actions = await content("app/features/file-manager/FileActions.tsx");
  assert.match(sql, /values\('linked-files','linked-files',false,52428800\)/i);
  assert.match(sql, /project_files_group_version_unique/i);
  assert.match(service, /version_group_id/);
  assert.match(service, /createSignedUrl/);
  assert.match(service, /archived_by/);
  assert.match(actions, /Editar dados/);
  assert.match(actions, /Substituir/);
});

test("funções agendadas exigem segredo e não contêm identidade da Publicolor", async () => {
  for (const path of ["supabase/functions/dispatch-notifications/index.ts", "supabase/functions/generate-deadline-notifications/index.ts", "supabase/functions/send-agenda-notifications/index.ts"]) {
    const source = await content(path);
    assert.match(source, /!.*secret|!cronSecret/);
    assert.doesNotMatch(source, /Publicolor|pedido|ordem de serviço/i);
  }
});

test("service worker abre a central de notificações", async () => {
  const worker = await content("public/sw.js");
  assert.match(worker, /\/notifications/);
});

test("auditoria administrativa trata tabelas com chaves diferentes sem acessar campos inexistentes", async () => {
  const sql = await content("camilla-studio-etapa-04.sql");
  const match = sql.match(/create or replace function public\.log_admin_central_history\(\)[\s\S]*?end \$\$;/i);
  assert.ok(match, "função log_admin_central_history deve existir");
  const fn = match[0];
  assert.match(fn, /row_value\s*:=\s*case[\s\S]*to_jsonb\(old\)[\s\S]*to_jsonb\(new\)/i);
  assert.match(fn, /tg_table_name\s*=\s*'system_settings'[\s\S]*row_value->>'key'/i);
  assert.doesNotMatch(fn, /\bnew\.id\b|\bold\.id\b|\bnew\.key\b|\bold\.key\b/i);
});

