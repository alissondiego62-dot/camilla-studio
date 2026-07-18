import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root=new URL("..",import.meta.url);
const content=(path)=>readFile(new URL(path,root),"utf8");

test("Etapa 17 possui SQL, migration, rollback e validações",()=>{
  for(const path of[
    "camilla-studio-etapa-17-saldo-contratual.sql",
    "supabase/migrations/20260717140000_camilla_stage17_contract_balance.sql",
    "supabase/rollback/camilla-stage17-contract-balance-rollback.sql",
    "supabase/validation/etapa-17-preflight.sql",
    "supabase/validation/etapa-17-postflight.sql",
    "supabase/validation/etapa-17-data-integrity.sql",
    "supabase/validation/etapa-17-security-tests.sql",
  ]) assert.equal(existsSync(new URL(path,root)),true,path);
});

test("saldo contratual usa contrato menos recebido sem ficar negativo",async()=>{
  const sql=await content("camilla-studio-etapa-17-saldo-contratual.sql");
  assert.match(sql,/greatest\(project\.contract_value-greatest\(project\.amount_received/);
  assert.match(sql,/received_from_entries/);
  assert.match(sql,/financial_entry_balance_view/);
});

test("valores contratuais são servidos somente por RPC administrativa",async()=>{
  const sql=await content("camilla-studio-etapa-17-saldo-contratual.sql");
  assert.match(sql,/is_financial_administrator/);
  assert.match(sql,/pp\.code in\('administrator','owner'\)/);
  assert.match(sql,/revoke select on public\.projects from public,anon,authenticated/);
  assert.match(sql,/grant select\([\s\S]*?archived_at[\s\S]*?\) on public\.projects to authenticated/);
  assert.doesNotMatch(sql,/grant select\([\s\S]*?contract_value[\s\S]*?\) on public\.projects to authenticated/);
});

test("Projetos exibe contrato, recebido e a receber apenas ao administrador",async()=>{
  const page=await content("app/features/projects/ProjectsPage.tsx");
  const service=await content("app/features/projects/projects.service.ts");
  assert.match(page,/isFinancialAdministrator/);
  for(const label of["Contrato","Recebido","A receber"])assert.match(page,new RegExp(label));
  assert.match(service,/list_project_financial_summaries/);
  assert.doesNotMatch(service,/select\([^)]*contract_value/);
});

test("Financeiro apresenta posição contratual consolidada por projeto",async()=>{
  const overview=await content("app/features/finance/views/FinanceOverview.tsx");
  const contracts=await content("app/features/finance/views/FinanceProjectContracts.tsx");
  assert.match(overview,/FinanceProjectContracts/);
  assert.match(contracts,/Posição contratual por projeto/);
  assert.match(contracts,/totals\.contract/);
  assert.match(contracts,/totals\.received/);
  assert.match(contracts,/totals\.balance/);
});

test("financeiro interno do projeto compartilha lançamentos com a base geral",async()=>{
  const panel=await content("app/features/project-detail/ProjectFinancialPanel.tsx");
  const service=await content("app/features/project-detail/project-detail.service.ts");
  assert.match(panel,/saveFinanceEntry/);
  assert.match(panel,/project_id:\s*project\.id/);
  assert.match(service,/get_project_financial_summary/);
  assert.match(service,/get_project_financial_entries/);
});

test("frontend bloqueia Financeiro e valores de cliente por perfil",async()=>{
  const navigation=await content("app/config/navigation.ts");
  const client=await content("app/features/clients/ClientDetailPage.tsx");
  assert.match(navigation,/profileCodes:\["administrator","owner"\]/);
  assert.match(client,/isFinancialAdministrator/);
});

test("SQL consolidado e migration da Etapa 17 são idênticos",async()=>{
  assert.equal(await content("camilla-studio-etapa-17-saldo-contratual.sql"),await content("supabase/migrations/20260717140000_camilla_stage17_contract_balance.sql"));
});
