import type { FinanceEntryRow } from "./types";
export function replaceFinanceEntry(items: FinanceEntryRow[], next: FinanceEntryRow) { return items.some((item)=>item.id===next.id)?items.map((item)=>item.id===next.id?next:item):[next,...items]; }
export function removeFinanceEntry(items: FinanceEntryRow[], id: string) { return items.filter((item)=>item.id!==id); }
