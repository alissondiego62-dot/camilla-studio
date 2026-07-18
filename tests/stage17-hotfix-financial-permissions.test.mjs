import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sqlPath = new URL('../camilla-studio-etapa-17-correcao-permissoes-saldos.sql', import.meta.url);
const financeOverviewPath = new URL('../app/features/finance/views/FinanceOverview.tsx', import.meta.url);
const financeWorkspacePath = new URL('../app/features/finance/FinanceWorkspace.tsx', import.meta.url);

test('hotfix restaura leitura de projects sem expor saldos reais', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /create table if not exists public\.project_contract_financials/i);
  assert.match(sql, /grant select on public\.projects to authenticated/i);
  assert.match(sql, /new\.contract_value:=0/i);
  assert.match(sql, /project_contract_financials_admin_select/i);
});

test('administrador recebe acesso financeiro profissional', async () => {
  const sql = await readFile(sqlPath, 'utf8');
  assert.match(sql, /return public\.is_financial_administrator\(\)/i);
  const workspace = await readFile(financeWorkspacePath, 'utf8');
  assert.match(workspace, /const canProfessional=workspace\.isAdministrator/);
});

test('posição contratual aparece antes dos gráficos', async () => {
  const overview = await readFile(financeOverviewPath, 'utf8');
  const contracts = overview.indexOf('<FinanceProjectContracts');
  const charts = overview.indexOf('cs-finance-dashboard-grid');
  assert.ok(contracts >= 0 && charts >= 0 && contracts < charts);
});
