"use client";
import { Button } from "@/app/components/ui/Button";
import type { DashboardFilter, DashboardOptions } from "./types";

export function DashboardFilters({ value, options, onChange, onApply, onReset }: { value: DashboardFilter; options: DashboardOptions; onChange: (value: DashboardFilter) => void; onApply: () => void; onReset: () => void }) {
  const update = (key: keyof DashboardFilter, next: string) => onChange({ ...value, [key]: next });
  return <section className="cs-dashboard-filters cs-card">
    <label><span>De</span><input type="date" value={value.start_date} onChange={(event) => update("start_date", event.target.value)} /></label>
    <label><span>Até</span><input type="date" value={value.end_date} onChange={(event) => update("end_date", event.target.value)} /></label>
    <label><span>Responsável</span><select value={value.responsible_user_id} onChange={(event) => update("responsible_user_id", event.target.value)}><option value="">Todos</option>{options.responsible.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label><span>Projeto</span><select value={value.project_id} onChange={(event) => update("project_id", event.target.value)}><option value="">Todos</option>{options.projects.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label><span>Cliente</span><select value={value.client_id} onChange={(event) => update("client_id", event.target.value)}><option value="">Todos</option>{options.clients.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <div className="cs-dashboard-filter-actions"><Button onClick={onReset}>Limpar</Button><Button variant="primary" onClick={onApply}>Aplicar</Button></div>
  </section>;
}
