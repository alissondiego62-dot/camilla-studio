"use client";
import { useCallback, useState } from "react";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
import { LoadingState, ErrorState } from "@/app/components/ui/DataState";
import { useModuleData } from "@/app/hooks/useModuleData";
import { usePermissions } from "@/app/hooks/usePermissions";
import { DashboardFilters } from "./DashboardFilters";
import { DashboardKpiGrid } from "./DashboardKpiGrid";
import { DashboardProjectsPanel } from "./DashboardProjectsPanel";
import { DashboardActivitiesPanel } from "./DashboardActivitiesPanel";
import { DashboardListPanel } from "./DashboardListPanel";
import { DashboardUnreadPanel } from "./DashboardUnreadPanel";
import { DashboardFinancialPanel } from "./DashboardFinancialPanel";
import { defaultDashboardFilters, loadDashboardWorkspace } from "./dashboard.service";

export function DashboardWorkspace() {
  const { can } = usePermissions();
  const financial = can("dashboard", "view_financial") && can("finance_professional", "view_values");
  const [draft, setDraft] = useState(defaultDashboardFilters); const [filters, setFilters] = useState(draft);
  const loader = useCallback(() => loadDashboardWorkspace(filters, financial), [filters, financial]);
  const { data, loading, error, reload } = useModuleData(loader, null);
  return <ModuleFrame title="Dashboard" subtitle="Visão operacional consolidada conforme suas permissões">
    {error && <ErrorState message={error} onRetry={() => void reload()} />}
    {loading || !data ? <LoadingState /> : <div className="cs-dashboard-workspace">
      <DashboardFilters value={draft} options={data.options} onChange={setDraft} onApply={() => setFilters(draft)} onReset={() => { const next = defaultDashboardFilters(); setDraft(next); setFilters(next); }} />
      <DashboardKpiGrid metrics={data.metrics} />
      <DashboardProjectsPanel stages={data.projects_by_stage} responsible={data.projects_by_responsible} />
      <DashboardActivitiesPanel statuses={data.activities_by_status} responsible={data.activities_by_responsible} />
      <section className="cs-dashboard-grid-3"><DashboardListPanel title="Agenda de hoje" items={data.agenda_today} emptyText="Nenhum compromisso para hoje." /><DashboardListPanel title="Próximos compromissos" items={data.upcoming_commitments} emptyText="Nenhum compromisso futuro no período." /><DashboardListPanel title="Clientes com movimentação recente" items={data.recent_clients} emptyText="Nenhuma movimentação recente." /></section>
      <section className="cs-dashboard-grid-2"><DashboardListPanel title="Pendências importantes" items={data.pending_items} emptyText="Nenhuma pendência crítica." /><DashboardUnreadPanel {...data.unread} /></section>
      <DashboardFinancialPanel data={data.financial} />
    </div>}
  </ModuleFrame>;
}
