import type { LinkedFile } from "@/app/features/file-manager/types";
import type { HistoryEntry } from "@/app/features/history/types";

export type ClientPersonType = "person" | "company" | null;
export type ClientRelationshipStatus = "active" | "prospect" | "inactive" | "paused" | "lost" | string;

export type ClientRow = {
  id: string;
  name: string;
  legal_name: string | null;
  trade_name: string | null;
  person_type: ClientPersonType;
  cpf: string | null;
  cnpj: string | null;
  document: string | null;
  state_registration: string | null;
  municipal_registration: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  postal_code: string | null;
  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  primary_contact_name: string | null;
  primary_contact_role: string | null;
  internal_responsible_user_id: string | null;
  source_code: string | null;
  segment_code: string | null;
  relationship_status: ClientRelationshipStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
  internal_responsible?: { id: string; name: string; email: string | null } | null;
};

export type ClientPhone = {
  id?: string;
  client_id?: string;
  label: string;
  phone: string;
  is_primary: boolean;
  is_whatsapp: boolean;
  position: number;
  archived_at?: string | null;
};

export type ClientEmail = {
  id?: string;
  client_id?: string;
  label: string;
  email: string;
  is_primary: boolean;
  position: number;
  archived_at?: string | null;
};

export type ClientMutation = Partial<ClientRow> & {
  name: string;
  phones: ClientPhone[];
  emails: ClientEmail[];
};

export type ClientDirectoryRow = ClientRow & {
  total_projects: number;
  active_projects: number;
  pending_activities: number;
  overdue_activities: number;
  last_contact_at: string | null;
  next_commitment_at: string | null;
};

export type ClientFilters = {
  query: string;
  personType: string;
  relationshipStatus: string;
  sourceCode: string;
  segmentCode: string;
  responsibleId: string;
  includeArchived: boolean;
};

export type ClientCategory = { code: string; name: string; color: string | null };
export type ClientFormOptions = {
  users: Array<{ id: string; name: string; email: string }>;
  relationshipStatuses: ClientCategory[];
  sources: ClientCategory[];
  segments: ClientCategory[];
  noteTypes: ClientCategory[];
  fileCategories: ClientCategory[];
};

export type ClientProjectSummary = {
  id: string;
  code: string;
  name: string;
  stage: string;
  status: string;
  priority: string;
  main_deadline: string | null;
  responsible_name: string | null;
  contract_value: number | null;
  archived_at: string | null;
  thumbnail_url: string | null;
};

export type ClientActivitySummary = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  due_at: string | null;
  starts_at: string | null;
  progress: number;
  project?: { id?: string; code: string; name: string } | null;
};

export type ClientAgendaSummary = {
  item_key: string;
  source_type: string;
  source_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  status: string;
  item_type: string;
  project_id: string | null;
  project_name: string | null;
  activity_id: string | null;
  responsible_name: string | null;
};

export type ClientNote = {
  id: string;
  client_id: string;
  note_type: string;
  content: string;
  important: boolean;
  pinned_at: string | null;
  occurred_at: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  author?: { name: string | null; email: string | null } | null;
};

export type ClientFinancialEntry = {
  id: string;
  description: string;
  entry_type: string;
  amount: number;
  due_date: string | null;
  settled_at: string | null;
  status: string;
  project_id: string | null;
  project_name: string | null;
  paid_amount: number;
  open_amount: number;
};

export type ClientFinancialSummary = {
  expected_revenue: number;
  received_revenue: number;
  receivable: number;
  open_amount: number;
  overdue_amount: number;
  partial_payments: number;
  total_billed: number;
  average_ticket: number;
  last_payment_at: string | null;
  entries: ClientFinancialEntry[];
};

export type ClientIndicators = {
  total_projects: number;
  active_projects: number;
  pending_activities: number;
  overdue_activities: number;
  open_amount: number | null;
  last_contact_at: string | null;
  next_commitment_at: string | null;
};

export type ClientWorkspace = {
  client: ClientRow;
  phones: ClientPhone[];
  emails: ClientEmail[];
  projects: ClientProjectSummary[];
  activities: ClientActivitySummary[];
  agenda: ClientAgendaSummary[];
  files: LinkedFile[];
  notes: ClientNote[];
  history: HistoryEntry[];
  indicators: ClientIndicators;
  finance: ClientFinancialSummary | null;
  options: ClientFormOptions;
};

export const defaultClientFilters: ClientFilters = {
  query: "",
  personType: "",
  relationshipStatus: "",
  sourceCode: "",
  segmentCode: "",
  responsibleId: "",
  includeArchived: false,
};
