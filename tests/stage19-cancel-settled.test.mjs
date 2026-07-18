import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("settled income and expense use explicit reverse-and-cancel action", () => {
  const drawer = read("app/features/finance/FinanceEntryDrawer.tsx");
  const projectPanel = read("app/features/project-detail/ProjectFinancialPanel.tsx");
  assert.match(drawer, /Estornar e cancelar/);
  assert.match(drawer, /todas as baixas e ajustes ativos serão estornados/i);
  assert.match(projectPanel, /cancelFinanceEntry/);
  assert.match(projectPanel, /Estornar e cancelar/);
});

test("database cancellation reverses payments and adjustments atomically", () => {
  const sql = read("supabase/migrations/20260718180000_camilla_stage19_financial_receivables.sql");
  assert.match(sql, /create or replace function public\.cancel_financial_entry/i);
  assert.match(sql, /financial_entry_payments[\s\S]*archived_at=now\(\)/i);
  assert.match(sql, /financial_entry_adjustments[\s\S]*archived_at=now\(\)/i);
  assert.match(sql, /financial_entry_settlements_reversed_for_cancellation/i);
  assert.match(sql, /permissão.*estornar antes de cancelar/i);
  assert.match(sql, /cancelled_financial_entry_balance_reconciled/i);
});
