import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("listagem financeira exibe cancelamento direto", async () => {
  const table = await read("app/features/finance/views/FinanceEntriesTable.tsx");
  assert.match(table, /canCancel/);
  assert.match(table, /onCancel\(item\)/);
  assert.match(table, /Estornar e cancelar/);
  assert.match(table, /Cancelar/);
});

test("cancelamento da listagem exige motivo e preserva estorno", async () => {
  const dialog = await read("app/features/finance/FinanceCancelDialog.tsx");
  const workspace = await read("app/features/finance/FinanceWorkspace.tsx");
  const hook = await read("app/features/finance/useFinanceWorkspace.ts");
  assert.match(dialog, /Motivo do cancelamento/);
  assert.match(dialog, /reason\.trim\(\)\.length < 5/);
  assert.match(dialog, /estornará todas as baixas/);
  assert.match(workspace, /FinanceCancelDialog/);
  assert.match(hook, /setCancelEntry\(null\)/);
});
