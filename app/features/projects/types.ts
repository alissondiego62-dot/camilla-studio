export type ProjectFinancialSummary = {
  project_id: string;
  contract_value: number;
  amount_received: number;
  balance_due: number;
  received_from_entries: number;
  legacy_amount_received: number;
  active_income_entries: number;
  overdue_amount: number;
  next_due_date: string | null;
};

export type ProjectRow = {
  id: string;
  code: string;
  name: string;
  project_type: string;
  subtype: string | null;
  stage: string;
  status: string;
  priority: string;
  main_deadline: string | null;
  responsible_user_id: string | null;
  responsible_name: string | null;
  cover_url: string | null;
  updated_at: string;
  archived_at?: string | null;
  client_id: string | null;
  client?: { name: string } | null;
  financial_summary?: ProjectFinancialSummary | null;
};

export type NewProject = {
  code: string;
  name: string;
  client_id: string | null;
  project_type: string;
  subtype: string | null;
  stage: string;
  status: string;
  priority: string;
  responsible_user_id: string | null;
  responsible_name: string | null;
  main_deadline: string | null;
  notes: string | null;
};

export type ProjectFormOptions = {
  clients: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string; email: string }>;
};
