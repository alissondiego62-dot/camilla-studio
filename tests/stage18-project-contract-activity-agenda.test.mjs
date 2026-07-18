import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Projetos exibem valores somente para administradores e permitem contrato no cadastro", async () => {
  const page = await read("app/features/projects/ProjectsPage.tsx");
  assert.match(page, /isFinancialAdministrator/);
  assert.match(page, /showFinancialValues && <><th>Contrato<\/th><th>Recebido<\/th><th>A receber<\/th>/);
  assert.match(page, /showFinancialValues && <FormField label="Valor do contrato"[\s\S]{0,160}name="contract_value"/);
  assert.match(page, /contract_value:\s*showFinancialValues/);
});

test("Cadastro usa RPC transacional com contrato", async () => {
  const service = await read("app/features/projects/projects.service.ts");
  const sql = await read("camilla-studio-etapa-18-valor-contrato-atividades-agenda.sql");
  assert.match(service, /create_project_with_contract/);
  assert.match(sql, /create or replace function public\.create_project_with_contract\(p_payload jsonb\)/i);
  assert.match(sql, /project_contract_financials/);
  assert.doesNotMatch(sql, /set\s+[^;]*balance_due/i);
  assert.doesNotMatch(sql, /new\.balance_due/i);
});

test("Financeiro do projeto permite editar contrato pela RPC protegida", async () => {
  const panel = await read("app/features/project-detail/ProjectFinancialPanel.tsx");
  const service = await read("app/features/project-detail/project-detail.service.ts");
  assert.match(panel, /Alterar contrato/);
  assert.match(panel, /Valor total do contrato/);
  assert.match(service, /set_project_contract_value/);
});

test("Atividades vinculadas podem ser editadas e excluídas", async () => {
  const panel = await read("app/features/project-detail/ProjectActivitiesPanel.tsx");
  assert.match(panel, /Editar atividade/);
  assert.match(panel, /deleteActivityLogically/);
  assert.match(panel, /Excluir atividade/);
  assert.match(panel, /updateActivity/);
});

test("Agenda do projeto permite editar e excluir compromissos", async () => {
  const panel = await read("app/features/project-detail/ProjectAgendaPanel.tsx");
  assert.match(panel, /Editar compromisso/);
  assert.match(panel, /deleteProjectEvent/);
  assert.match(panel, /Excluir compromisso/);
  assert.match(panel, /updateProjectEvent/);
});

test("Confirmação de exclusão fica acima do drawer", async () => {
  const drawer = await read("app/features/activities/ActivityDrawer.tsx");
  const agenda = await read("app/features/agenda/AgendaItemDrawer.tsx");
  const css = await read("app/styles/components.css");
  assert.match(drawer, /useFocusTrap\(dialogRef, onClose, !confirmDelete\)/);
  assert.match(agenda, /useFocusTrap\(dialogRef, onClose, !confirmDelete\)/);
  assert.match(css, /\.cs-modal-backdrop\{position:fixed;inset:0;z-index:160/);
});
