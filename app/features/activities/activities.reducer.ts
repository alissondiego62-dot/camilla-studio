import type { ActivityRow } from "./types";

export function replaceActivity(items: ActivityRow[], next: ActivityRow) {
  const exists = items.some((item) => item.id === next.id);
  return exists ? items.map((item) => item.id === next.id ? next : item) : [next, ...items];
}

export function patchActivity(items: ActivityRow[], id: string, patch: Partial<ActivityRow>) {
  return items.map((item) => item.id === id ? { ...item, ...patch } : item);
}

export function removeActivity(items: ActivityRow[], id: string) {
  return items.filter((item) => item.id !== id);
}

export function patchManyActivities(items: ActivityRow[], ids: Set<string>, patch: Partial<ActivityRow>) {
  return items.map((item) => ids.has(item.id) ? { ...item, ...patch } : item);
}
