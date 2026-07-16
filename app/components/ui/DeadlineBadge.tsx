import { dateOnly } from "@/app/config/regions";

export type DeadlineTone = "overdue" | "soon" | "completed" | "recent" | "normal" | "none";

export function deadlineTone(date: string | null | undefined, completedAt?: string | null, updatedAt?: string | null): DeadlineTone {
  if (completedAt) return "completed";
  if (!date) return "none";
  const target = new Date(date.includes("T") ? date : `${date}T23:59:59-04:00`);
  const now = new Date();
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "soon";
  if (updatedAt && now.getTime() - new Date(updatedAt).getTime() <= 72 * 3_600_000) return "recent";
  return "normal";
}

export function DeadlineBadge({ date, completedAt, updatedAt, prefix }: { date: string | null | undefined; completedAt?: string | null; updatedAt?: string | null; prefix?: string }) {
  const tone = deadlineTone(date, completedAt, updatedAt);
  return <span className={`cs-deadline cs-deadline-${tone}`}>{prefix ? `${prefix}: ` : ""}{dateOnly(date ?? null)}</span>;
}
