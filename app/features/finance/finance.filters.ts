import type { FinanceFilters, FinancePeriodPreset } from "./types";

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function startOfWeek(date: Date) { const copy=new Date(date); const day=(copy.getDay()+6)%7; copy.setDate(copy.getDate()-day); return copy; }

export function periodRange(period: FinancePeriodPreset, reference = new Date()) {
  const start = new Date(reference); const end = new Date(reference);
  if (period === "today") return { start_date: isoDate(start), end_date: isoDate(end) };
  if (period === "week") { const first=startOfWeek(start); const last=new Date(first); last.setDate(first.getDate()+6); return { start_date:isoDate(first), end_date:isoDate(last) }; }
  if (period === "quarter") { const month=Math.floor(start.getMonth()/3)*3; start.setMonth(month,1); end.setMonth(month+3,0); return { start_date:isoDate(start), end_date:isoDate(end) }; }
  if (period === "year") { start.setMonth(0,1); end.setMonth(11,31); return { start_date:isoDate(start), end_date:isoDate(end) }; }
  start.setDate(1); end.setMonth(end.getMonth()+1,0); return { start_date:isoDate(start), end_date:isoDate(end) };
}

const month = periodRange("month");
export const defaultFinanceFilters: FinanceFilters = {
  search:"", period:"month", start_date:month.start_date, end_date:month.end_date,
  status:"", category_id:"", account_id:"", card_id:"", client_id:"", project_id:"",
  supplier_id:"", cost_center_id:"", include_archived:false,
};

export function filtersToJson(filters: FinanceFilters) {
  return {
    search: filters.search.trim() || null,
    start_date: filters.start_date || null,
    end_date: filters.end_date || null,
    status: filters.status || null,
    category_id: filters.category_id || null,
    account_id: filters.account_id || null,
    card_id: filters.card_id || null,
    client_id: filters.client_id || null,
    project_id: filters.project_id || null,
    supplier_id: filters.supplier_id || null,
    cost_center_id: filters.cost_center_id || null,
    include_archived: filters.include_archived,
  };
}
