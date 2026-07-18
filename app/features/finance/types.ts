export type FinanceEnvironment = "personal" | "professional" | "consolidated";
export type FinanceStoredEnvironment = Exclude<FinanceEnvironment, "consolidated">;
export type FinanceEntryType = "income" | "expense";
export type FinanceStatus =
  | "forecast"
  | "pending"
  | "paid"
  | "received"
  | "partially_paid"
  | "partially_received"
  | "overdue"
  | "cancelled"
  | "under_review"
  | "awaiting_approval";

export type FinanceSection =
  | "overview"
  | "revenue"
  | "expenses"
  | "receivables"
  | "payables"
  | "cash-flow"
  | "categories"
  | "accounts"
  | "cards"
  | "templates"
  | "auxiliary"
  | "reports";

export type FinancePeriodPreset = "today" | "week" | "month" | "quarter" | "year" | "custom";

export type FinanceAccess = {
  environment: FinanceStoredEnvironment;
  can_view: boolean;
  can_view_values: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_settle: boolean;
  can_approve: boolean;
  can_export: boolean;
  can_manage_accounts: boolean;
  can_manage_cards: boolean;
  can_manage_categories: boolean;
  can_manage_templates: boolean;
  can_manage_suppliers: boolean;
  can_manage_cost_centers: boolean;
  can_manage_recurrence: boolean;
  can_manage_installments: boolean;
  can_manage_transfers: boolean;
  can_change_environment: boolean;
};

export type FinanceEntryRow = {
  id: string;
  environment: FinanceStoredEnvironment;
  owner_user_id: string | null;
  entry_type: FinanceEntryType;
  description: string;
  amount: string;
  paid_amount: string;
  adjustment_amount: string;
  open_amount: string;
  competence_date: string;
  due_date: string | null;
  settled_at: string | null;
  status: FinanceStatus;
  effective_status: FinanceStatus;
  category_id: string | null;
  category_name: string | null;
  subcategory_id: string | null;
  subcategory_name: string | null;
  account_id: string | null;
  account_name: string | null;
  card_id: string | null;
  card_name: string | null;
  client_id: string | null;
  client_name: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  project_id: string | null;
  project_name: string | null;
  cost_center_id: string | null;
  cost_center_name: string | null;
  payment_method_id: string | null;
  payment_method_name: string | null;
  installment_group_id: string | null;
  installment_number: number | null;
  installment_count: number | null;
  recurring_rule_id: string | null;
  template_id: string | null;
  document_number: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  settled_by: string | null;
  settled_by_name: string | null;
  approved_by: string | null;
  approved_at: string | null;
  cancelled_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceLookup = {
  id: string;
  name: string;
  environment: FinanceStoredEnvironment;
  active?: boolean;
  entry_type?: FinanceEntryType | null;
  parent_id?: string | null;
  color?: string | null;
  type?: string | null;
  current_balance?: string | null;
  limit_amount?: string | null;
  last_four_digits?: string | null;
  institution?: string | null;
  branch?: string | null;
  account_number_masked?: string | null;
  opening_balance?: string | null;
  opening_balance_date?: string | null;
  brand?: string | null;
  closing_day?: number | null;
  due_day?: number | null;
  account_id?: string | null;
  code?: string | null;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  suggested_amount?: string | null;
  frequency?: string | null;
};

export type FinanceRecurringRule = FinanceLookup & {
  entry_type: FinanceEntryType;
  description: string;
  amount: string | null;
  frequency: string;
  interval_value: number;
  starts_on: string;
  ends_on: string | null;
  next_generation_date: string;
  category_id?: string | null;
  account_id?: string | null;
  card_id?: string | null;
  client_id?: string | null;
  supplier_id?: string | null;
  project_id?: string | null;
  cost_center_id?: string | null;
};

export type FinanceTemplate = FinanceLookup & {
  description?: string | null;
  suggested_amount?: string | null;
  due_day?: number | null;
  frequency?: string | null;
};

export type FinanceApproval = {
  id: string;
  record_type: string;
  record_id: string;
  decision: string;
  reason: string | null;
  requested_at: string;
  reviewed_at: string | null;
};

export type FinanceMetrics = {
  current_balance: string;
  expected_income: string;
  realized_income: string;
  expected_expense: string;
  realized_expense: string;
  net_result: string;
  receivable: string;
  receivable_dated: string;
  receivable_undated: string;
  payable: string;
  overdue: string;
  projected_balance: string;
  previous_period_result: string;
  result_change_percent: string | null;
};

export type FinanceChartPoint = {
  label: string;
  income: string;
  expense: string;
  result: string;
  forecast: string;
  realized: string;
};

export type FinanceCategoryPoint = { label: string; amount: string; percentage: string };
export type FinanceStatusPoint = { label: string; amount: string; count: number };

export type FinanceWorkspaceOptions = {
  categories: FinanceLookup[];
  subcategories: FinanceLookup[];
  accounts: FinanceLookup[];
  cards: FinanceLookup[];
  suppliers: FinanceLookup[];
  cost_centers: FinanceLookup[];
  payment_methods: FinanceLookup[];
  clients: FinanceLookup[];
  projects: FinanceLookup[];
  templates: FinanceTemplate[];
  recurring_rules: FinanceRecurringRule[];
};


export type FinanceProjectSummary = {
  project_id: string;
  project_code: string;
  project_name: string;
  client_id: string | null;
  client_name: string | null;
  contract_value: number;
  amount_received: number;
  balance_due: number;
  receivable_dated: number;
  receivable_undated: number;
  received_from_entries: number;
  legacy_amount_received: number;
  active_income_entries: number;
  overdue_amount: number;
  next_due_date: string | null;
};

export type FinanceWorkspaceData = {
  entries: FinanceEntryRow[];
  total: number;
  metrics: FinanceMetrics;
  timeline: FinanceChartPoint[];
  categories_chart: FinanceCategoryPoint[];
  statuses_chart: FinanceStatusPoint[];
  options: FinanceWorkspaceOptions;
  approvals: FinanceApproval[];
  access: FinanceAccess[];
  project_summaries: FinanceProjectSummary[];
};

export type FinanceFilters = {
  search: string;
  period: FinancePeriodPreset;
  start_date: string;
  end_date: string;
  status: string;
  category_id: string;
  account_id: string;
  card_id: string;
  client_id: string;
  project_id: string;
  supplier_id: string;
  cost_center_id: string;
  include_archived: boolean;
};

export type FinanceEntryInput = {
  id?: string | null;
  environment: FinanceStoredEnvironment;
  entry_type: FinanceEntryType;
  description: string;
  amount: string;
  competence_date: string;
  due_date: string | null;
  status: FinanceStatus;
  category_id: string | null;
  subcategory_id: string | null;
  account_id: string | null;
  card_id: string | null;
  client_id: string | null;
  supplier_id: string | null;
  project_id: string | null;
  cost_center_id: string | null;
  payment_method_id: string | null;
  document_number: string | null;
  notes: string | null;
};

export type FinancePaymentInput = {
  entry_id: string;
  amount: string;
  paid_at: string;
  account_id: string | null;
  payment_method_id: string | null;
  discount_amount: string;
  interest_amount: string;
  fine_amount: string;
  document_number: string | null;
  notes: string | null;
};

export type FinanceTransferInput = {
  environment: FinanceStoredEnvironment;
  transfer_type: string;
  source_account_id: string;
  destination_account_id: string;
  amount: string;
  transfer_date: string;
  description: string;
  notes: string | null;
};

export type FinanceReportRow = Record<string, string | number | null>;
