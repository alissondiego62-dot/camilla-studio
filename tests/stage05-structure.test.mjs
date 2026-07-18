import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);
async function content(path) { return readFile(new URL(path, root), "utf8"); }

const requiredFiles = [
  "app/features/activities/ActivitiesWorkspace.tsx",
  "app/features/activities/ActivitiesToolbar.tsx",
  "app/features/activities/ActivityDrawer.tsx",
  "app/features/activities/ActivityBulkActions.tsx",
  "app/features/activities/views/ActivityTableView.tsx",
  "app/features/activities/views/ActivityListView.tsx",
  "app/features/activities/views/ActivityBoardView.tsx",
  "app/features/activities/views/ActivityCalendarView.tsx",
  "app/features/activities/views/ActivityTimelineView.tsx",
  "app/features/activities/subactivities/SubactivityList.tsx",
  "app/features/activity-notes/ActivityNotesEditor.tsx",
  "app/features/clients/ClientActivitiesPanel.tsx",
  "supabase/validation/etapa-05-hierarchy-tests.sql",
  "supabase/validation/etapa-05-saved-views-tests.sql",
];

test("Etapa 05 possui workspace e cinco visualizações sobre o mesmo módulo", () => {
  for (const path of requiredFiles) assert.equal(existsSync(new URL(path, root)), true, `${path} deve existir`);
});

test("workspace oferece tabela, lista, quadro, calendário e linha do tempo", async () => {
  const source = await content("app/features/activities/ActivitiesWorkspace.tsx");
  for (const view of ["table", "list", "board", "calendar", "timeline"]) assert.match(source, new RegExp(`view===\\"${view}\\"`));
  assert.match(source, /useActivitiesWorkspace/);
  assert.match(source, /ActivityDrawer/);
});

test("visualizações salvas preservam filtros, ordem, propriedades e larguras", async () => {
  const types = await content("app/features/activities/types.ts");
  const service = await content("app/features/activities/activities.service.ts");
  for (const token of ["filters", "sorting", "grouping", "visible_properties", "column_order", "column_widths", "page_size", "is_default"]) assert.match(types + service, new RegExp(token));
  assert.match(service, /activity_saved_views/);
});

test("SQL cria hierarquia segura, participantes e ações transacionais", async () => {
  const sql = await content("camilla-studio-etapa-05.sql");
  for (const token of [
    "activity_participants", "activity_saved_views", "validate_activity_hierarchy",
    "bulk_update_activities", "duplicate_activity", "move_activity", "reorder_activity",
    "archive_activity", "reactivate_activity", "delete_activity_logically",
    "activity_auto_complete_parent", "ON DELETE SET NULL"
  ]) assert.match(sql, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.doesNotMatch(sql, /project_activities_parent_id_fkey[\s\S]{0,200}ON DELETE CASCADE/i);
});

test("RPC de atividade não possui variável sombreada que apague participantes de outras atividades", async () => {
  const sql = await content("camilla-studio-etapa-05.sql");
  const fn = sql.match(/create or replace function public\.save_activity\([\s\S]*?end \$\$;/i)?.[0] ?? "";
  assert.match(fn, /v_activity_id/);
  assert.match(fn, /where activity_id=v_activity_id/i);
  assert.doesNotMatch(fn, /where activity_id=activity_id/i);
});

test("subatividades exibem contagem e progresso", async () => {
  const list = await content("app/features/activities/subactivities/SubactivityList.tsx");
  const progress = await content("app/features/activities/subactivities/SubactivityProgress.tsx");
  const display = await content("app/features/activities/activity-display.ts");
  assert.match(list + progress + display, /concluída/i);
  assert.match(list + progress + display, /progress|percent|%/i);
});

test("observações suportam blocos permitidos sem HTML arbitrário", async () => {
  const editor = await content("app/features/activity-notes/ActivityNotesEditor.tsx");
  const types = await content("app/features/activities/types.ts");
  for (const block of ["heading", "paragraph", "bulleted_list", "numbered_list", "checklist", "link", "image", "file", "highlight"]) assert.match(types, new RegExp(block));
  assert.doesNotMatch(editor, /dangerouslySetInnerHTML/);
});

test("comentários e arquivos são carregados no painel da atividade", async () => {
  const drawer = await content("app/features/activities/ActivityDrawer.tsx");
  assert.match(drawer, /ActivityCommentsPanel/);
  assert.match(drawer, /ActivityFilesPanel/);
  assert.match(drawer, /ActivityAgendaPanel/);
});

test("interface ativa não contém atividades fictícias", async () => {
  const active = await content("app/features/activities/ActivitiesWorkspace.tsx");
  assert.doesNotMatch(active, /task-demo|demo-1|Revisar agenda semanal do escritório/);
  assert.equal(existsSync(new URL("app/components/ActivitiesWorkspace.tsx", root)), false);
});


test("triggers da Etapa 05 tratam INSERT e DELETE sem acessar registros indefinidos", async () => {
  const sql = await content("camilla-studio-etapa-05.sql");
  const sync = sql.match(/create or replace function public\.sync_activity_fields\(\)[\s\S]*?end \$\$;/i)?.[0] ?? "";
  const recalc = sql.match(/create or replace function public\.recalculate_parent_activity_progress\(\)[\s\S]*?end \$\$;/i)?.[0] ?? "";
  const history = sql.match(/create or replace function public\.log_activity_central_history\(\)[\s\S]*?end \$\$;/i)?.[0] ?? "";
  assert.match(sync, /tg_op='UPDATE'[\s\S]*old\.status/i);
  assert.match(recalc, /tg_op='INSERT'[\s\S]*new\.parent_id/i);
  assert.match(recalc, /tg_op='DELETE'[\s\S]*old\.parent_id/i);
  assert.match(history, /if tg_op='DELETE' then return old; else return new; end if/i);
  assert.doesNotMatch(recalc, /return coalesce\(new,old\)/i);
});

test("migration e SQL consolidado são idênticos", async () => {
  const sql = await content("camilla-studio-etapa-05.sql");
  const migration = await content("supabase/migrations/20260716210000_camilla_stage05_activities_workspace.sql");
  assert.equal(migration, sql);
});
