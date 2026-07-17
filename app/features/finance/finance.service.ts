import { defaultFinanceFilters } from "./finance.filters";
import { loadFinanceWorkspace } from "./finance.repository";
import { saveFinanceEntry, settleFinanceEntry as registerFinancePayment } from "./finance.mutations";
import type { FinanceEntryInput, FinanceEntryRow, FinancePaymentInput } from "./types";

export type FinanceRow = FinanceEntryRow;
export type NewFinanceEntry = Omit<FinanceEntryInput, "id">;

/** Compatibilidade com integrações anteriores. Novas telas usam finance.repository e finance.mutations. */
export async function listFinanceEntries(): Promise<FinanceRow[]> {
  const data = await loadFinanceWorkspace("professional", "overview", defaultFinanceFilters, 0, 100);
  return data.entries;
}

export async function createFinanceEntry(input: NewFinanceEntry) {
  return saveFinanceEntry(input);
}

export async function settleFinanceEntry(input: FinancePaymentInput) {
  return registerFinancePayment(input);
}
