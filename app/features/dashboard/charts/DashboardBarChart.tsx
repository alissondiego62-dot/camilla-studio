import type { DashboardGroupPoint } from "../types";
export function DashboardBarChart({ items, label }: { items: DashboardGroupPoint[]; label: string }) {
  const max = Math.max(1, ...items.map((item) => Number(item.count)));
  return <div className="cs-dashboard-bar-chart" role="img" aria-label={label}>{items.length === 0 ? <p className="cs-empty-note">Sem dados para o período.</p> : items.map((item, index) => <article key={`${item.code}-${index}`}><header><span>{item.label}</span><strong>{item.count}</strong></header><div><i style={{ width: `${Math.max(2, (Number(item.count) / max) * 100)}%`, background: item.color || `var(--cs-chart-${(index % 6) + 1})` }} /></div></article>)}</div>;
}
