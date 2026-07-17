import { assertNoError, ensureSupabase } from "@/app/services/supabase/base-service";
import { supabase } from "@/lib/supabase";
import { filtersToJson } from "./finance.filters";
import type { FinanceEnvironment, FinanceFilters, FinanceSection, FinanceWorkspaceData, FinanceEntryRow, FinanceLookup } from "./types";

const emptyWorkspace: FinanceWorkspaceData = {
  entries:[], total:0,
  metrics:{current_balance:"0.00",expected_income:"0.00",realized_income:"0.00",expected_expense:"0.00",realized_expense:"0.00",net_result:"0.00",receivable:"0.00",payable:"0.00",overdue:"0.00",projected_balance:"0.00",previous_period_result:"0.00",result_change_percent:null},
  timeline:[], categories_chart:[], statuses_chart:[],
  options:{categories:[],subcategories:[],accounts:[],cards:[],suppliers:[],cost_centers:[],payment_methods:[],clients:[],projects:[],templates:[],recurring_rules:[]},
  approvals:[], access:[],
};

export async function loadFinanceWorkspace(environment: FinanceEnvironment, section: FinanceSection, filters: FinanceFilters, page=0, pageSize=50):Promise<FinanceWorkspaceData>{
  if(!ensureSupabase()) return emptyWorkspace;
  const result=await supabase.rpc("get_finance_workspace",{p_environment:environment,p_section:section,p_filters:filtersToJson(filters),p_limit:pageSize,p_offset:page*pageSize});
  assertNoError(result);
  const data=(result.data??{}) as Partial<FinanceWorkspaceData>;
  return {...emptyWorkspace,...data,metrics:{...emptyWorkspace.metrics,...data.metrics},options:{...emptyWorkspace.options,...data.options}};
}

export async function getFinanceEntry(id:string):Promise<FinanceEntryRow>{
  const result=await supabase.rpc("get_financial_entry",{p_entry_id:id});assertNoError(result);
  return result.data as FinanceEntryRow;
}

export async function listFinanceLookup(table:"financial_accounts"|"financial_cards"|"financial_categories"|"financial_payment_methods"|"financial_cost_centers"|"financial_suppliers"|"financial_templates",environment:"personal"|"professional"):Promise<FinanceLookup[]>{
  if(!ensureSupabase())return[];
  const result=await supabase.from(table).select("*").eq("environment",environment).order("name");assertNoError(result);return(result.data??[]) as FinanceLookup[];
}
