import { CAMILLA_TIME_ZONE } from "@/app/config/regions";
import type { ActivityFilters, ActivityRow, ActivitySort } from "./types";

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CAMILLA_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function matchesActivityFilters(item: ActivityRow, filters: ActivityFilters) {
  const projectName = item.project?.name ?? "";
  const clientName = item.client?.name ?? item.project?.client?.name ?? "";
  const haystack = `${item.title} ${item.description ?? ""} ${item.responsible_name ?? ""} ${projectName} ${clientName} ${(item.tags ?? []).join(" ")}`.toLowerCase();
  if (filters.search && !haystack.includes(filters.search.toLowerCase())) return false;
  if (filters.statuses.length && !filters.statuses.includes(item.status)) return false;
  if (filters.priorities.length && !filters.priorities.includes(item.priority)) return false;
  if (filters.responsibleId && item.responsible_user_id !== filters.responsibleId) return false;
  if (filters.projectId && item.project_id !== filters.projectId) return false;
  const effectiveClientId = item.client_id ?? item.project?.client_id ?? null;
  if (filters.clientId && effectiveClientId !== filters.clientId) return false;
  if (filters.tag && !(item.tags ?? []).some((tag) => tag.toLowerCase().includes(filters.tag.toLowerCase()))) return false;
  if (!filters.includeArchived && item.archived_at) return false;
  if (filters.due !== "all") {
    const due = item.due_at ?? (item.due_date ? `${item.due_date}T23:59:59-04:00` : null);
    if (filters.due === "no_date") return !due;
    if (!due) return false;
    const today = dayKey(new Date());
    const dueKey = dayKey(new Date(due));
    if (filters.due === "overdue" && !(dueKey < today && item.status !== "completed")) return false;
    if (filters.due === "today" && dueKey !== today) return false;
    if (filters.due === "week") {
      const now = new Date(); const end = new Date(now); end.setDate(end.getDate() + 7);
      if (new Date(due) < now || new Date(due) > end) return false;
    }
  }
  return true;
}

export function sortActivities(items: ActivityRow[], sorting: ActivitySort[]) {
  if (!sorting.length) return [...items].sort((a, b) => a.position - b.position || b.updated_at.localeCompare(a.updated_at));
  return [...items].sort((a, b) => {
    for (const sort of sorting) {
      const av = activityProperty(a, sort.property); const bv = activityProperty(b, sort.property);
      const result = String(av ?? "").localeCompare(String(bv ?? ""), "pt-BR", { numeric: true, sensitivity: "base" });
      if (result) return sort.direction === "asc" ? result : -result;
    }
    return a.id.localeCompare(b.id);
  });
}

export function activityProperty(item: ActivityRow, property: string) {
  switch (property) {
    case "project": return item.project?.name ?? "";
    case "client": return item.client?.name ?? item.project?.client?.name ?? "";
    case "responsible": return item.responsible_name ?? "";
    case "start": return item.starts_at ?? "";
    case "due": return item.due_at ?? item.due_date ?? "";
    case "updated": return item.updated_at;
    default: return (item as unknown as Record<string, unknown>)[property];
  }
}

export function buildActivityTree(items: ActivityRow[]) {
  const map = new Map(items.map((item) => [item.id, { ...item, children: [] as ActivityRow[] }]));
  const roots: ActivityRow[] = [];
  for (const item of map.values()) {
    if (item.parent_id && map.has(item.parent_id)) map.get(item.parent_id)!.children!.push(item);
    else roots.push(item);
  }
  for (const item of map.values()) {
    item.children?.sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
    item.children_total = item.children?.length ?? 0;
    item.children_completed = item.children?.filter((child) => child.status === "completed").length ?? 0;
  }
  return roots.sort((a, b) => a.position - b.position || b.updated_at.localeCompare(a.updated_at));
}
