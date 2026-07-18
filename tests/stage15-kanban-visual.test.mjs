import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("cards do Kanban não possuem limite vertical interno", async () => {
  const css = await read("app/styles/components.css");
  assert.match(css, /\.cs-kanban-v3 \.cs-kanban-column\{[\s\S]*?max-height:none!important/);
  assert.match(css, /\.cs-kanban-v3 \.cs-kanban-lane\{[\s\S]*?overflow:visible!important/);
  assert.match(css, /article\.cs-project-card-v3[\s\S]*?height:auto!important[\s\S]*?max-height:none!important/);
});

test("miniatura usa contenção integral e área responsiva", async () => {
  const css = await read("app/styles/components.css");
  assert.match(css, /article\.cs-project-card-v3>\.cs-project-card-image>img[\s\S]*?object-fit:contain!important/);
  assert.match(css, /aspect-ratio:16\/9!important/);
  assert.match(css, /position:absolute!important/);
});

test("miniatura abre modal e restante do card abre o projeto", async () => {
  const card = await read("app/features/kanban/ProjectKanbanCard.tsx");
  assert.match(card, /setImageOpen\(true\)/);
  assert.match(card, /className="cs-kanban-image-modal"/);
  assert.match(card, /router\.push\(projectHref\)/);
  assert.match(card, /target\.closest\("a,button,select,input,textarea,label,\.cs-modal-backdrop"\)/);
});

test("modal é renderizado em portal e fecha somente no fundo", async () => {
  const modal = await read("app/components/ui/Modal.tsx");
  assert.match(modal, /createPortal/);
  assert.match(modal, /event\.target === event\.currentTarget/);
  assert.match(modal, /document\.body/);
  assert.match(modal, /useFocusTrap\(dialogRef, onClose, mounted\)/);
});
