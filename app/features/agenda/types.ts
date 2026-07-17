export type AgendaMode = "day" | "week" | "month";
export type AgendaSourceType = "event" | "activity" | "project_date";
export type AgendaStatus = "scheduled" | "not_started" | "in_progress" | "waiting" | "blocked" | "completed" | "cancelled" | string;

export type AgendaItem = {
  item_key: string;
  source_type: AgendaSourceType;
  source_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  status: AgendaStatus;
  item_type: string;
  project_id: string | null;
  project_name: string | null;
  activity_id: string | null;
  client_id: string | null;
  client_name: string | null;
  responsible_user_id: string | null;
  responsible_name: string | null;
  location: string | null;
  color: string | null;
  editable: boolean;
  created_at: string;
  updated_at: string;
};

export type AgendaFilters = {
  responsibleId: string;
  projectId: string;
  clientId: string;
  itemType: string;
  status: string;
  showCancelled: boolean;
};

export type AgendaOptions = {
  projects: Array<{ id: string; code: string; name: string; client_id?: string | null }>;
  clients: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string; email: string }>;
  statuses: Array<{ code: string; name: string; color: string | null }>;
  snapMinutes: number;
};

export type AgendaRange = {
  startIso: string;
  endIso: string;
  days: string[];
  label: string;
};

export type CalendarEventInput = {
  id?: string | null;
  title: string;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  project_id: string | null;
  activity_id: string | null;
  client_id: string | null;
  responsible_user_id: string | null;
  location: string | null;
  notes: string | null;
  status: string;
};

export type AgendaActivityInput = {
  title: string;
  description: string | null;
  starts_at: string | null;
  due_at: string | null;
  all_day: boolean;
  project_id: string | null;
  client_id: string | null;
  responsible_user_id: string | null;
  priority: string;
  status: string;
};

export type AgendaUpdateInput = {
  sourceType: AgendaSourceType;
  sourceId: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
};

export const defaultAgendaFilters: AgendaFilters = {
  responsibleId: "",
  projectId: "",
  clientId: "",
  itemType: "",
  status: "",
  showCancelled: false,
};
