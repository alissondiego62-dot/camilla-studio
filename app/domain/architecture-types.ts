export type ProjectStage =
  | "prospecting"
  | "briefing"
  | "survey"
  | "creation"
  | "adjustments"
  | "executive"
  | "approval"
  | "construction"
  | "completed";

export type ProjectStatus =
  | "not_started"
  | "in_progress"
  | "waiting"
  | "waiting_client"
  | "correction"
  | "completed"
  | "cancelled";

export type ProjectPriority = "low" | "normal" | "high" | "urgent";

export type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
};

export type Project = {
  id: string;
  code: string;
  client_id: string | null;
  name: string;
  project_type: string;
  subtype: string | null;
  stage: ProjectStage;
  status: ProjectStatus;
  priority: ProjectPriority;
  responsible_name: string | null;
  deadline_stage_1: string | null;
  deadline_stage_2: string | null;
  deadline_stage_3: string | null;
  contract_value: number;
  amount_received: number;
  balance_due: number;
  cover_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client?: Client | null;
};

export type CalendarEvent = {
  id: string;
  project_id: string | null;
  title: string;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  notes: string | null;
};

export type ViewKey = "dashboard" | "projects" | "agenda" | "clients" | "finance" | "settings";
