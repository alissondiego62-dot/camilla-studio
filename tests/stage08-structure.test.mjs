import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";
const root=new URL("..",import.meta.url);async function content(path){return readFile(new URL(path,root),"utf8")}
const required=[
 "app/features/finance/FinanceWorkspace.tsx","app/features/finance/FinanceEnvironmentSwitcher.tsx","app/features/finance/FinanceNavigation.tsx",
 "app/features/finance/FinanceEntryDrawer.tsx","app/features/finance/FinancePaymentDrawer.tsx","app/features/finance/FinanceInstallmentDrawer.tsx",
 "app/features/finance/FinanceTransferDrawer.tsx","app/features/finance/views/FinanceOverview.tsx","app/features/finance/views/FinanceRevenue.tsx",
 "app/features/finance/views/FinanceExpenses.tsx","app/features/finance/views/FinanceReceivables.tsx","app/features/finance/views/FinancePayables.tsx",
 "app/features/finance/views/FinanceCashFlow.tsx","app/features/finance/views/FinanceReports.tsx","app/features/finance/views/FinanceRecurringRules.tsx",
 "supabase/validation/etapa-08-separation-tests.sql","supabase/validation/etapa-08-payment-tests.sql","supabase/validation/etapa-08-recurrence-tests.sql","supabase/validation/etapa-08-report-tests.sql"
];

test("Etapa 08 possui workspace, ambientes e abas financeiras",()=>{for(const path of required)assert.equal(existsSync(new URL(path,root)),true,`${path} deve existir`)});

test("Pessoal, Profissional e Consolidado são opções explícitas",async()=>{const env=await content("app/features/finance/FinanceEnvironmentSwitcher.tsx");for(const value of["personal","professional","consolidated"])assert.match(env,new RegExp(value));assert.match(env,/Profissional \/ CNPJ/)});

test("receitas e despesas permanecem em áreas separadas",async()=>{const nav=await content("app/features/finance/FinanceNavigation.tsx");const workspace=await content("app/features/finance/FinanceWorkspace.tsx");assert.match(nav,/Receitas/);assert.match(nav,/Despesas/);assert.match(workspace,/FinanceRevenue/);assert.match(workspace,/FinanceExpenses/)});

test("valores monetários usam numeric 18,2 e centavos controlados",async()=>{const sql=await content("camilla-studio-etapa-08.sql");const money=await content("app/features/finance/finance.money.ts");assert.match(sql,/numeric\(18,2\)/i);assert.match(sql,/alter column amount type numeric\(18,2\)/i);assert.match(money,/moneyToCents/);assert.match(money,/centsToMoney/);assert.doesNotMatch(money,/toFixed\([^)]*\)\s*[+\-*\/]/)});

test("RLS pessoal exige proprietário ou delegação explícita",async()=>{const sql=await content("camilla-studio-etapa-08.sql");assert.match(sql,/financial_environment_access/);assert.match(sql,/p_owner_user_id=auth\.uid\(\) or delegated/i);assert.match(sql,/financial_entries_select_scope[\s\S]{0,400}can_access_finance_environment/i);assert.doesNotMatch(sql,/target_environment<>'personal'/i)});

test("views financeiras usam security_invoker e não têm SELECT direto autenticado",async()=>{const sql=await content("camilla-studio-etapa-08.sql");for(const view of["financial_entry_balance_view","financial_account_balance_view","financial_cash_flow_view","financial_report_base_view"])assert.match(sql,new RegExp(`view public\\.${view} with\\(security_invoker=true\\)`,`i`));assert.match(sql,/revoke all on public\.financial_entry_balance_view[\s\S]{0,500}authenticated/i)});

test("baixas suportam parcial, desconto, juros e multa",async()=>{const sql=await content("camilla-studio-etapa-08.sql");const drawer=await content("app/features/finance/FinancePaymentDrawer.tsx");for(const field of["discount_amount","interest_amount","fine_amount","net_amount"])assert.match(sql,new RegExp(field));assert.match(sql,/settle_financial_entry/);assert.match(drawer,/Desconto/);assert.match(drawer,/Juros/);assert.match(drawer,/Multa/)});

test("parcelamento distribui os centavos e possui interface",async()=>{const sql=await content("camilla-studio-etapa-08.sql");const drawer=await content("app/features/finance/FinanceInstallmentDrawer.tsx");assert.match(sql,/total_cents:=round\(e\.amount\*100\)/);assert.match(sql,/base_cents:=total_cents\/p_installment_count/);assert.match(sql,/remainder:=total_cents%p_installment_count/);assert.match(drawer,/Quantidade de parcelas/)});

test("recorrências são idempotentes e configuráveis",async()=>{const sql=await content("camilla-studio-etapa-08.sql");const ui=await content("app/features/finance/views/FinanceRecurringRules.tsx");assert.match(sql,/financial_recurring_occurrences/);assert.match(sql,/unique\(rule_id,occurrence_date\)/i);assert.match(sql,/create_recurring_entries/);assert.match(ui,/Periodicidade/);assert.match(ui,/Próxima geração/)});

test("transferências criam duas partidas de forma transacional",async()=>{const sql=await content("camilla-studio-etapa-08.sql");const ui=await content("app/features/finance/FinanceTransferDrawer.tsx");assert.match(sql,/create_financial_transfer/);assert.match(sql,/source_entry_id/);assert.match(sql,/destination_entry_id/);assert.match(sql,/source_account\.id=dest_account\.id/);assert.match(ui,/Conta de origem/);assert.match(ui,/Conta de destino/)});

test("aprovações possuem solicitação, análise e interface",async()=>{const sql=await content("camilla-studio-etapa-08.sql");const overview=await content("app/features/finance/views/FinanceOverview.tsx");assert.match(sql,/ensure_financial_approval/);assert.match(sql,/review_financial_approval/);assert.match(sql,/awaiting_approval/);assert.match(overview,/Aguardando aprovação/);assert.match(overview,/Aprovar/);assert.match(overview,/Rejeitar/)});

test("relatórios cobrem clientes, projetos, fornecedores, categorias e transferências",async()=>{const ui=await content("app/features/finance/views/FinanceReports.tsx");const sql=await content("camilla-studio-etapa-08.sql");for(const code of["by_client","by_project","by_supplier","by_category","transfers"])assert.match(ui,new RegExp(code));assert.match(sql,/get_financial_report/);assert.match(sql,/p_report_code='by_client'/)});

test("dashboard, relatórios gerais e projetos usam RPCs protegidas",async()=>{const dashboard=await content("app/features/dashboard/dashboard.service.ts");const reports=await content("app/features/reports/reports.service.ts");const project=await content("app/features/project-detail/project-detail.service.ts");assert.match(dashboard,/get_dashboard_summary/);assert.match(reports,/get_report_summary/);assert.match(project,/get_project_financial_entries/);assert.doesNotMatch(project,/from\("financial_entries"\)/)});

test("mudança de ambiente exige RPC, permissão e justificativa",async()=>{const sql=await content("camilla-studio-etapa-08.sql");const drawer=await content("app/features/finance/FinanceEntryDrawer.tsx");assert.match(sql,/change_financial_environment/);assert.match(sql,/length\(trim\(coalesce\(p_reason/);assert.match(sql,/change_environment/);assert.match(drawer,/Mover de ambiente/)});

test("SQL consolidado e migration são idênticos",async()=>{const sql=await content("camilla-studio-etapa-08.sql");const migration=await content("supabase/migrations/20260717030000_camilla_stage08_finance.sql");assert.equal(migration,sql)});

test("interface financeira não contém lançamentos fictícios",async()=>{const files=["app/features/finance/FinanceWorkspace.tsx","app/features/finance/FinanceEntryForm.tsx","app/features/finance/views/FinanceOverview.tsx"];for(const path of files){const source=await content(path);assert.doesNotMatch(source,/mock|demo-entry|lançamento fictício|5000\.00|3000\.00/i)}});
