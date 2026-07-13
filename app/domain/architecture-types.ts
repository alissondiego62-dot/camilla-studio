export type ProjectStage =
  | "briefing_preliminary"
  | "creation"
  | "adjustments"
  | "approval"
  | "executive"
  | "revision"
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
  main_deadline: string | null;
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


export type ProjectFileCategory =
  | "drive_folder"
  | "contract"
  | "briefing"
  | "survey"
  | "drawing"
  | "executive"
  | "render"
  | "photo"
  | "rrt"
  | "memorial"
  | "other";

export type ProjectFile = {
  id: string;
  project_id: string;
  name: string;
  category: ProjectFileCategory;
  drive_url: string;
  drive_file_id: string | null;
  mime_type: string | null;
  notes: string | null;
  created_at: string;
};

export type ProjectComment = {
  id: string;
  project_id: string;
  author_id: string | null;
  comment: string;
  created_at: string;
};

export type ProjectHistory = {
  id: number;
  project_id: string;
  action_type: string;
  description: string;
  author_id: string | null;
  created_at: string;
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
  completed_at: string | null;
  created_at?: string;
};

export type ProjectFinancialEntry = {
  id: string;
  project_id: string | null;
  entry_type: "income" | "expense";
  description: string;
  category: string;
  amount: number;
  received_on: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
};

export type ViewKey = "dashboard" | "projects" | "completed" | "agenda" | "clients" | "finance" | "settings";

export type ProjectChecklistItem = {
  id: string;
  project_id: string;
  stage: ProjectStage;
  section: string;
  title: string;
  completed_at: string | null;
  position: number;
  created_at: string;
};
