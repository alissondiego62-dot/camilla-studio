import { DashboardBarChart } from "./charts/DashboardBarChart";
import { DashboardDonutChart } from "./charts/DashboardDonutChart";
import type { DashboardGroupPoint } from "./types";
export function DashboardProjectsPanel({ stages, responsible }: { stages: DashboardGroupPoint[]; responsible: DashboardGroupPoint[] }) { return <section className="cs-dashboard-grid-2"><article className="cs-card"><h2>Projetos por etapa</h2><DashboardDonutChart items={stages} label="Distribuição de projetos por etapa" /></article><article className="cs-card"><h2>Projetos por responsável</h2><DashboardBarChart items={responsible} label="Projetos por responsável" /></article></section>; }
