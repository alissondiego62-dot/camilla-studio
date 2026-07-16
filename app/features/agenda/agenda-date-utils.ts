import { CAMILLA_TIME_ZONE } from "@/app/config/regions";
import type { AgendaItem, AgendaMode, AgendaRange } from "./types";

const OFFSET = "-04:00";
const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: CAMILLA_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: CAMILLA_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });
const shortDayFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: CAMILLA_TIME_ZONE, weekday: "short", day: "2-digit", month: "2-digit" });
const longDayFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: CAMILLA_TIME_ZONE, weekday: "long", day: "2-digit", month: "long", year: "numeric" });
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: CAMILLA_TIME_ZONE, month: "long", year: "numeric" });

export function dateKey(value: string | Date) { return dayFormatter.format(typeof value === "string" ? new Date(value) : value); }
export function timeKey(value: string | Date) { return timeFormatter.format(typeof value === "string" ? new Date(value) : value); }
export function todayKey() { return dateKey(new Date()); }
export function fromDateKey(key: string, time = "00:00") { return new Date(`${key}T${time}:00${OFFSET}`); }
export function toIso(key: string, minutes = 0) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return fromDateKey(key, `${hours}:${mins}`).toISOString();
}
export function addDays(key: string, amount: number) { const value = fromDateKey(key, "12:00"); value.setUTCDate(value.getUTCDate() + amount); return dateKey(value); }
export function addMonths(key: string, amount: number) { const [year, month, day] = key.split("-").map(Number); const value = new Date(Date.UTC(year, month - 1 + amount, Math.min(day, 28), 16)); return dateKey(value); }
export function startOfWeek(key: string) { const value = fromDateKey(key, "12:00"); const weekday = (value.getUTCDay() + 6) % 7; return addDays(key, -weekday); }
export function startOfMonth(key: string) { return `${key.slice(0, 7)}-01`; }
export function monthGridDays(key: string) { const start = startOfWeek(startOfMonth(key)); return Array.from({ length: 42 }, (_, index) => addDays(start, index)); }
export function weekDays(key: string) { const start = startOfWeek(key); return Array.from({ length: 7 }, (_, index) => addDays(start, index)); }
export function shiftAnchor(key: string, mode: AgendaMode, direction: number) { return mode === "day" ? addDays(key, direction) : mode === "week" ? addDays(key, direction * 7) : addMonths(key, direction); }
export function formatDay(key: string) { return shortDayFormatter.format(fromDateKey(key, "12:00")); }
export function formatLongDay(key: string) { return longDayFormatter.format(fromDateKey(key, "12:00")); }
export function formatMonth(key: string) { return monthFormatter.format(fromDateKey(key, "12:00")); }
export function minutesOfDay(iso: string) { const [hour, minute] = timeKey(iso).split(":").map(Number); return hour * 60 + minute; }
export function durationMinutes(item: AgendaItem) { return Math.max(15, Math.round((new Date(item.ends_at).getTime() - new Date(item.starts_at).getTime()) / 60000)); }
export function isSameDay(iso: string, key: string) { return dateKey(iso) === key; }
export function moveItemTo(item: AgendaItem, key: string, minutes: number, allDay = false) {
  const duration = item.all_day ? 24 * 60 : durationMinutes(item);
  const startsAt = toIso(key, allDay ? 0 : minutes);
  const endsAt = new Date(new Date(startsAt).getTime() + (allDay ? 24 * 60 : duration) * 60000).toISOString();
  return { startsAt, endsAt, allDay };
}
export function resizeItem(item: AgendaItem, deltaMinutes: number) {
  const minimum = item.all_day ? 24 * 60 : 15;
  const start = new Date(item.starts_at).getTime();
  const current = new Date(item.ends_at).getTime();
  return new Date(Math.max(start + minimum * 60000, current + deltaMinutes * 60000)).toISOString();
}
export function getAgendaRange(anchor: string, mode: AgendaMode): AgendaRange {
  if (mode === "day") return { startIso: toIso(anchor), endIso: toIso(addDays(anchor, 1)), days: [anchor], label: formatLongDay(anchor) };
  if (mode === "week") {
    const days = weekDays(anchor); return { startIso: toIso(days[0]), endIso: toIso(addDays(days[6], 1)), days, label: `${formatDay(days[0])} a ${formatDay(days[6])}` };
  }
  const first = startOfMonth(anchor); const next = addMonths(first, 1); return { startIso: toIso(first), endIso: toIso(next), days: monthGridDays(anchor), label: formatMonth(anchor) };
}
export function localInputValue(iso?: string | null) { if (!iso) return ""; return `${dateKey(iso)}T${timeKey(iso)}`; }
