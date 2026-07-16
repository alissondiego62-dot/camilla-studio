export type HistoryEntry = {
  id: string;
  module: string;
  record_type: string;
  record_id: string;
  project_id: string | null;
  actor_user_id: string | null;
  action: string;
  field_name: string | null;
  old_value: unknown;
  new_value: unknown;
  description: string;
  metadata: Record<string, unknown>;
  source_table: string | null;
  source_id: string | null;
  created_at: string;
  actor?: { name?: string | null; email?: string | null } | null;
};
