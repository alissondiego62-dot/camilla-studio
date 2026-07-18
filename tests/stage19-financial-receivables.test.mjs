import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("stage 19 separates dated and undated receivables", () => {
  const overview = read("app/features/finance/views/FinanceOverview.tsx");
  const projectPanel = read("app/features/project-detail/ProjectFinancialPanel.tsx");
  assert.match(overview, /A receber com data/);
  assert.match(overview, /A receber sem data/);
  assert.match(projectPanel, /Sem data prevista/);
  assert.match(projectPanel, /Liquidar/);
  assert.match(projectPanel, /Excluir/);
});

test("stage 19 provides secure receivable database functions", () => {
  const sql = read("supabase/migrations/20260718180000_camilla_stage19_financial_receivables.sql");
  assert.match(sql, /create or replace function public\.get_finance_dashboard_metrics/i);
  assert.match(sql, /create or replace function public\.list_undated_financial_entries/i);
  assert.match(sql, /create or replace function public\.settle_project_receivable/i);
  assert.match(sql, /possui baixa.*antes de excluí-lo/i);
  assert.match(sql, /Baixa técnica migrada pela Etapa 19/i);
  assert.match(sql, /pg_attribute view_column/i);
  assert.match(sql, /v_select_list/i);
  assert.match(sql, /foreach v_new_column in array/i);
});
