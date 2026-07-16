export type ActiveProjectStage =
  | "prospecting"
  | "briefing"
  | "survey"
  | "briefing_preliminary"
  | "creation"
  | "adjustments"
  | "approval"
  | "executive"
  | "revision"
  | "completed";

/** Mantido somente para leitura de registros históricos anteriores à Etapa 03. */
export type ProjectStage = ActiveProjectStage | "construction";

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
  responsible_user_id: string | null;
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
  archived_at?: string | null;
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
  project_id: string | null;
  client_id?: string | null;
  activity_id?: string | null;
  financial_entry_id?: string | null;
  name: string;
  category: ProjectFileCategory | string;
  drive_url: string;
  drive_file_id: string | null;
  mime_type: string | null;
  file_size?: number | null;
  notes: string | null;
  origin?: "supabase_storage" | "google_drive" | "external_link";
  storage_bucket?: string | null;
  storage_path?: string | null;
  version?: number;
  replaces_file_id?: string | null;
  download_allowed?: boolean;
  archived_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
};

export type ProjectComment = {
  id: string;
  project_id: string;
  parent_comment_id?: string | null;
  author_id: string | null;
  comment: string;
  comment_kind?: "comment" | "internal_note";
  important?: boolean;
  edited_at?: string | null;
  updated_at?: string;
  deleted_at?: string | null;
  created_at: string;
  author?: { id?: string; name?: string | null; email?: string | null } | null;
  mentions?: Array<{ user_id: string }>;
};

export type ProjectHistory = {
  id: number;
  project_id: string;
  action_type: string;
  description: string;
  field_name?: string | null;
  old_value?: unknown;
  new_value?: unknown;
  metadata?: Record<string, unknown> | null;
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
  entry_type: "income" | "expense" | string;
  description: string;
  category: string;
  amount: number;
  received_on?: string | null;
  competence_date?: string | null;
  due_date?: string | null;
  status?: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
};

export type ViewKey = "dashboard" | "projects" | "completed" | "agenda" | "activities" | "clients" | "finance" | "settings";

export type ProjectChecklistItem = {
  id: string;
  project_id: string;
  stage: ProjectStage;
  section: string;
  title: string;
  required: boolean;
  responsible_user_id?: string | null;
  started_at?: string | null;
  completed_at: string | null;
  completed_by?: string | null;
  waived_at?: string | null;
  waived_by?: string | null;
  waiver_reason?: string | null;
  position: number;
  created_at: string;
};

export type CamillaRole = "admin" | "owner" | "project_manager" | "finance" | "architect" | "collaborator" | "assistant" | "viewer";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  camilla_role: CamillaRole;
  active: boolean;
};
