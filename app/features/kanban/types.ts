export type KanbanPlannedDate = {
  id: string;
  purpose_code: string;
  title: string;
  starts_at: string;
  status: string;
  completed_at: string | null;
  updated_at: string;
  is_main_deadline: boolean;
};

export type KanbanProject = {
  id: string;
  code: string;
  name: string;
  project_type: string;
  stage: string;
  status: string;
  priority: string;
  main_deadline: string | null;
  responsible_user_id: string | null;
  responsible_name: string | null;
  cover_url: string | null;
  client_id: string | null;
  client_name: string | null;
  thumbnail_bucket: string | null;
  thumbnail_path: string | null;
  thumbnail_url: string | null;
  planned_dates: KanbanPlannedDate[];
  checklist_total: number;
  checklist_completed: number;
  files_count: number;
  comments_count: number;
  agenda_count: number;
  history_count: number;
  unread_files_count: number;
  unread_comments_count: number;
  unread_agenda_count: number;
  unread_history_count: number;
  latest_file_at: string | null;
  latest_comment_at: string | null;
  latest_agenda_at: string | null;
  latest_history_at: string | null;
  updated_at: string;
};

export type WorkflowPatch = {
  stage?: string;
  status?: string;
  responsible_user_id?: string | null;
  responsible_name?: string | null;
};

export type AssignableUser = { id: string; name: string; email: string };
