import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);
async function content(path) { return readFile(new URL(path, root), "utf8"); }

test("Etapa 03 possui rota individual e módulos centrais do projeto", async () => {
  for (const path of [
    "app/(studio)/projects/[id]/page.tsx",
    "app/features/project-detail/ProjectDetailPage.tsx",
    "app/features/project-dates/ProjectDatesPanel.tsx",
    "app/features/project-thumbnail/ProjectThumbnailPanel.tsx",
    "app/features/kanban/ProjectKanbanCard.tsx",
  ]) assert.equal(existsSync(new URL(path, root)), true, `${path} deve existir`);
});

test("fluxo ativo usa Estudo Preliminar e não oferece Obra", async () => {
  const config = await content("app/domain/architecture-config.ts");
  const workflow = await content("app/features/settings/settings.service.ts");
  const checklist = await content("app/features/settings/ChecklistSettingsPage.tsx");
  assert.match(config, /briefing_preliminary:\s*"Estudo Preliminar"/);
  const activeBlock = config.match(/export const activeStages[\s\S]*?\];/)?.[0] ?? "";
  assert.doesNotMatch(activeBlock, /construction/);
  assert.match(workflow, /neq\("code",\s*"construction"\)/);
  assert.match(checklist, /stage_code !== "construction"/);
});

test("Kanban atualiza somente o card e possui rollback em caso de erro", async () => {
  const page = await content("app/features/kanban/KanbanPage.tsx");
  const card = await content("app/features/kanban/ProjectKanbanCard.tsx");
  assert.match(page, /current\.map\(\(item\) => item\.id === project\.id \? next : item\)/);
  assert.match(page, /if \(!result\.ok\) setProjects\(before\)/);
  assert.match(card, /draggable=\{canStage && !pending\}/);
  assert.match(card, /KanbanCardShortcuts/);
  assert.match(card, /KanbanCardActions/);
});

test("SQL da Etapa 03 cobre etapas, prazos, miniaturas, histórico, Storage e checklist", async () => {
  const sql = await content("camilla-studio-etapa-03.sql");
  for (const token of [
    "project_dates",
    "project_thumbnails",
    "project_kanban_view",
    "update_project_workflow",
    "save_project_date",
    "activate_project_thumbnail",
    "update_project_checklist_item",
    "projects_enforce_required_checklist",
    "project-thumbnails",
    "security_invoker=true",
    "America/Boa_Vista",
  ]) assert.match(sql, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.match(sql, /update public\.projects set stage=case when status='completed' then 'completed' else 'revision' end where stage='construction'/i);
  assert.match(sql, /projects_stage_check check\(stage in\([^)]*'revision'[^)]*'completed'[^)]*\)\)/i);
  assert.doesNotMatch(sql.match(/projects_stage_check check\(stage in\([^)]+\)\)/i)?.[0] ?? "", /construction/i);
});

test("miniaturas aceitam somente PNG, JPEG e WEBP até 8 MB", async () => {
  const types = await content("app/features/project-thumbnail/types.ts");
  const service = await content("app/features/project-thumbnail/project-thumbnail.service.ts");
  assert.match(types, /8 \* 1024 \* 1024/);
  assert.match(types, /image\/png/);
  assert.match(types, /image\/jpeg/);
  assert.match(types, /image\/webp/);
  assert.match(service, /remove\(\[objectPath\]\)/);
});

test("não há colisão entre a lista de projetos e a rota dinâmica", () => {
  assert.equal(existsSync(new URL("app/(studio)/projects/page.tsx", root)), true);
  assert.equal(existsSync(new URL("app/(studio)/projects/[id]/page.tsx", root)), true);
  assert.equal(existsSync(new URL("app/projects/[id]/page.tsx", root)), false);
});
