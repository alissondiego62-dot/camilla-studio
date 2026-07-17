import type { DashboardGroupPoint } from "../types";
import { pointPercent, totalPoints } from "./chart-utils";
export function DashboardDonutChart({ items, label }: { items: DashboardGroupPoint[]; label: string }) {
  const total = totalPoints(items); let cursor = 0;
  const gradient = items.length ? items.map((item, index) => { const start = cursor; cursor += pointPercent(item.count, total); return `${item.color || `var(--cs-chart-${(index % 6) + 1})`} ${start}% ${cursor}%`; }).join(",") : "var(--cs-divider) 0 100%";
  return <div className="cs-dashboard-donut-wrap"><div className="cs-dashboard-donut" style={{ background: `conic-gradient(${gradient})` }} role="img" aria-label={label}><strong>{total}</strong><small>Total</small></div><div className="cs-dashboard-donut-legend">{items.map((item, index) => <span key={`${item.code}-${index}`}><i style={{ background: item.color || `var(--cs-chart-${(index % 6) + 1})` }} />{item.label}<b>{item.count}</b></span>)}</div></div>;
}
