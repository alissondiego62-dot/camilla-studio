import { assertNoError, ensureSupabase } from "@/app/services/supabase/base-service";
import { supabase } from "@/lib/supabase";
import { filtersToJson } from "./finance.filters";
import type { FinanceEnvironment, FinanceFilters, FinanceSection, FinanceWorkspaceData, FinanceEntryRow, FinanceLookup, FinanceProjectSummary } from "./types";

const emptyWorkspace: FinanceWorkspaceData = {
  entries:[], total:0,
  metrics:{current_balance:"0.00",expected_income:"0.00",realized_income:"0.00",expected_expense:"0.00",realized_expense:"0.00",net_result:"0.00",receivable:"0.00",payable:"0.00",overdue:"0.00",projected_balance:"0.00",previous_period_result:"0.00",result_change_percent:null},
  timeline:[], categories_chart:[], statuses_chart:[],
  options:{categories:[],subcategories:[],accounts:[],cards:[],suppliers:[],cost_centers:[],payment_methods:[],clients:[],projects:[],templates:[],recurring_rules:[]},
  approvals:[], access:[], project_summaries:[],
};

export async function loadFinanceWorkspace(environment: FinanceEnvironment, section: FinanceSection, filters: FinanceFilters, page=0, pageSize=50):Promise<FinanceWorkspaceData>{
  if(!ensureSupabase()) return emptyWorkspace;
  const [result, projectSummariesResult]=await Promise.all([
    supabase.rpc("get_finance_workspace",{p_environment:environment,p_section:section,p_filters:filtersToJson(filters),p_limit:pageSize,p_offset:page*pageSize}),
    supabase.rpc("list_project_financial_summaries"),
  ]);
  assertNoError(result);
  if(projectSummariesResult.error&&!/function .* does not exist|schema cache/i.test(projectSummariesResult.error.message))throw new Error(projectSummariesResult.error.message);
  const data=(result.data??{}) as Partial<FinanceWorkspaceData>;
  const project_summaries=(Array.isArray(projectSummariesResult.data)?projectSummariesResult.data:[]).map((item)=>{
    const row=item as Record<string,unknown>;
    const numberValue=(value:unknown)=>{const parsed=Number(value??0);return Number.isFinite(parsed)?parsed:0};
    return {
      project_id:String(row.project_id??""),project_code:String(row.project_code??""),project_name:String(row.project_name??""),
      client_id:row.client_id?String(row.client_id):null,client_name:row.client_name?String(row.client_name):null,
      contract_value:numberValue(row.contract_value),amount_received:numberValue(row.amount_received),balance_due:numberValue(row.balance_due),
      received_from_entries:numberValue(row.received_from_entries),legacy_amount_received:numberValue(row.legacy_amount_received),
      active_income_entries:numberValue(row.active_income_entries),overdue_amount:numberValue(row.overdue_amount),
      next_due_date:typeof row.next_due_date==="string"?row.next_due_date:null,
    } satisfies FinanceProjectSummary;
  });
  return {...emptyWorkspace,...data,project_summaries,metrics:{...emptyWorkspace.metrics,...data.metrics},options:{...emptyWorkspace.options,...data.options}};
}

export async function getFinanceEntry(id:string):Promise<FinanceEntryRow>{
  const result=await supabase.rpc("get_financial_entry",{p_entry_id:id});assertNoError(result);
  return result.data as FinanceEntryRow;
}

export async function listFinanceLookup(table:"financial_accounts"|"financial_cards"|"financial_categories"|"financial_payment_methods"|"financial_cost_centers"|"financial_suppliers"|"financial_templates",environment:"personal"|"professional"):Promise<FinanceLookup[]>{
  if(!ensureSupabase())return[];
  const result=await supabase.from(table).select("*").eq("environment",environment).order("name");assertNoError(result);return(result.data??[]) as FinanceLookup[];
}
