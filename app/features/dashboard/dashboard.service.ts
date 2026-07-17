import { supabase } from "@/lib/supabase";
import { assertNoError, ensureSupabase } from "@/app/services/supabase/base-service";
import type { DashboardFilter, DashboardWorkspaceData } from "./types";

export const defaultDashboardFilters = (): DashboardFilter => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const iso = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  return { start_date: iso(start), end_date: iso(end), responsible_user_id: "", project_id: "", client_id: "" };
};

const empty = (filters: DashboardFilter): DashboardWorkspaceData => ({
  generated_at: null,
  filters,
  metrics: [],
  projects_by_stage: [],
  projects_by_responsible: [],
  activities_by_status: [],
  activities_by_responsible: [],
  agenda_today: [],
  upcoming_commitments: [],
  recent_clients: [],
  pending_items: [],
  unread: { comments: 0, files: 0, notifications: 0 },
  financial: { visible: false, income: "0.00", expense: "0.00", net: "0.00", receivable: "0.00", payable: "0.00", overdue: "0.00", due_soon: "0.00", series: [] },
  options: { responsible: [], projects: [], clients: [] },
});

export async function loadDashboardWorkspace(filters: DashboardFilter, includeFinancial = false): Promise<DashboardWorkspaceData> {
  if (!ensureSupabase()) return empty(filters);
  const result = await supabase.rpc("get_dashboard_workspace", { p_filters: filters, p_include_financial: includeFinancial });
  if (result.error && /function .* does not exist|schema cache/i.test(result.error.message)) {
    const legacy = await supabase.rpc("get_dashboard_summary", { p_include_financial: includeFinancial });
    assertNoError(legacy);
    const item = (legacy.data ?? {}) as Record<string, unknown>;
    const fallback = empty(filters);
    fallback.metrics = [
      { code: "projects_active", label: "Projetos ativos", value: Number(item.projects ?? 0), href: "/projects" },
      { code: "projects_late", label: "Projetos atrasados", value: Number(item.late ?? 0), tone: "danger", href: "/projects" },
      { code: "activities_open", label: "Atividades abertas", value: Number(item.activities ?? 0), href: "/activities" },
      { code: "clients", label: "Clientes", value: Number(item.clients ?? 0), href: "/clients" },
    ];
    fallback.financial = { ...fallback.financial, visible: includeFinancial, income: String(item.income ?? "0.00"), expense: String(item.expense ?? "0.00"), net: String(Number(item.income ?? 0) - Number(item.expense ?? 0)) };
    return fallback;
  }
  assertNoError(result);
  const data = (result.data ?? {}) as Partial<DashboardWorkspaceData>;
  return {
    ...empty(filters),
    ...data,
    filters: { ...filters, ...(data.filters ?? {}) },
    unread: { ...empty(filters).unread, ...(data.unread ?? {}) },
    financial: { ...empty(filters).financial, ...(data.financial ?? {}) },
    options: { ...empty(filters).options, ...(data.options ?? {}) },
  };
}
