import Link from "next/link";
import type { DashboardMetric } from "./types";
export function DashboardKpiGrid({ metrics }: { metrics: DashboardMetric[] }) {
  return <section className="cs-dashboard-kpis">{metrics.map((metric) => {
    const content = <><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.tone === "danger" ? "Exige atenção" : metric.tone === "warning" ? "Acompanhar" : "Dados autorizados"}</small></>;
    return metric.href ? <Link key={metric.code} href={metric.href} className={`cs-dashboard-kpi tone-${metric.tone ?? "neutral"}`}>{content}</Link> : <article key={metric.code} className={`cs-dashboard-kpi tone-${metric.tone ?? "neutral"}`}>{content}</article>;
  })}</section>;
}
