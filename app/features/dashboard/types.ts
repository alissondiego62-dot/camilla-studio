export type DashboardFilter = {
  start_date: string;
  end_date: string;
  responsible_user_id: string;
  project_id: string;
  client_id: string;
};

export type DashboardMetric = { code: string; label: string; value: number; tone?: "neutral" | "warning" | "danger" | "success" | "info"; href?: string };
export type DashboardGroupPoint = { code: string; label: string; color?: string | null; count: number };
export type DashboardListItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  status?: string | null;
  priority?: string | null;
  date?: string | null;
  href?: string | null;
};
export type DashboardFinancial = {
  visible: boolean;
  income: string;
  expense: string;
  net: string;
  receivable: string;
  payable: string;
  overdue: string;
  due_soon: string;
  series: Array<{ label: string; income: string; expense: string }>;
};
export type DashboardOptions = {
  responsible: Array<{ id: string; label: string }>;
  projects: Array<{ id: string; label: string }>;
  clients: Array<{ id: string; label: string }>;
};
export type DashboardWorkspaceData = {
  generated_at: string | null;
  filters: DashboardFilter;
  metrics: DashboardMetric[];
  projects_by_stage: DashboardGroupPoint[];
  projects_by_responsible: DashboardGroupPoint[];
  activities_by_status: DashboardGroupPoint[];
  activities_by_responsible: DashboardGroupPoint[];
  agenda_today: DashboardListItem[];
  upcoming_commitments: DashboardListItem[];
  recent_clients: DashboardListItem[];
  pending_items: DashboardListItem[];
  unread: { comments: number; files: number; notifications: number };
  financial: DashboardFinancial;
  options: DashboardOptions;
};
