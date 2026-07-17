import { assertNoError } from "@/app/services/supabase/base-service";
import { supabase } from "@/lib/supabase";
import { normalizeMoneyInput } from "./finance.money";
import type { FinanceEntryInput, FinanceEntryRow, FinancePaymentInput, FinanceStoredEnvironment, FinanceTransferInput } from "./types";

export async function saveFinanceEntry(input:FinanceEntryInput):Promise<FinanceEntryRow>{
  const payload={...input,amount:normalizeMoneyInput(input.amount)};
  const result=await supabase.rpc("save_financial_entry",{p_entry_id:input.id??null,p_payload:payload});assertNoError(result);return result.data as FinanceEntryRow;
}
export async function duplicateFinanceEntry(id:string){const result=await supabase.rpc("duplicate_financial_entry",{p_entry_id:id});assertNoError(result);return String(result.data)}
export async function archiveFinanceEntry(id:string){const result=await supabase.rpc("archive_financial_entry",{p_entry_id:id});assertNoError(result)}
export async function reactivateFinanceEntry(id:string){const result=await supabase.rpc("reactivate_financial_entry",{p_entry_id:id});assertNoError(result)}
export async function cancelFinanceEntry(id:string,reason:string){const result=await supabase.rpc("cancel_financial_entry",{p_entry_id:id,p_reason:reason});assertNoError(result)}
export async function settleFinanceEntry(input:FinancePaymentInput){const result=await supabase.rpc("settle_financial_entry",{p_entry_id:input.entry_id,p_payload:{...input,amount:normalizeMoneyInput(input.amount),discount_amount:normalizeMoneyInput(input.discount_amount),interest_amount:normalizeMoneyInput(input.interest_amount),fine_amount:normalizeMoneyInput(input.fine_amount)}});assertNoError(result);return result.data as FinanceEntryRow}
export async function changeFinanceEnvironment(id:string,environment:FinanceStoredEnvironment,reason:string){const result=await supabase.rpc("change_financial_environment",{p_entry_id:id,p_target_environment:environment,p_reason:reason});assertNoError(result);return result.data as FinanceEntryRow}
export async function createFinanceTransfer(input:FinanceTransferInput){const result=await supabase.rpc("create_financial_transfer",{p_payload:{...input,amount:normalizeMoneyInput(input.amount)}});assertNoError(result);return String(result.data)}
export async function createInstallmentEntries(entryId:string,count:number,firstDueDate:string){const result=await supabase.rpc("create_installment_entries",{p_entry_id:entryId,p_installment_count:count,p_first_due_date:firstDueDate});assertNoError(result);return result.data as string[]}
export async function generateRecurringEntries(asOfDate:string){const result=await supabase.rpc("create_recurring_entries",{p_as_of_date:asOfDate});assertNoError(result);return Number(result.data??0)}

const allowedTables=new Set(["financial_accounts","financial_cards","financial_categories","financial_payment_methods","financial_cost_centers","financial_suppliers","financial_templates","financial_recurring_rules"]);
export async function saveFinanceCatalogItem(table:string,input:Record<string,unknown>){if(!allowedTables.has(table))throw new Error("Cadastro financeiro inválido.");const data={...input};const id=typeof data.id==="string"?data.id:null;delete data.id;const result=id?await supabase.from(table).update(data).eq("id",id).select("*").single():await supabase.from(table).insert(data).select("*").single();assertNoError(result);return result.data}

export async function reviewFinanceApproval(id:string,decision:"approved"|"rejected",reason:string){const result=await supabase.rpc("review_financial_approval",{p_approval_id:id,p_decision:decision,p_reason:reason});assertNoError(result);return result.data}
