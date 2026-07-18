import type { CalendarEvent, Project, ProjectChecklistItem, ProjectFinancialEntry, ProjectHistory } from "@/app/domain/architecture-types";
import type { ProjectCommentItem } from "@/app/features/comments/types";
import type { LinkedFile } from "@/app/features/file-manager/types";
import type { ProjectFinancialSummary } from "@/app/features/projects/types";

export type ProjectActivity = {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  due_at: string | null;
  progress: number;
  responsible_user_id: string | null;
  responsible_name: string | null;
  completed_at: string | null;
  created_at: string;
};

export type ProjectDate = {
  id: string;
  project_id: string;
  purpose_code: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  is_main_deadline: boolean;
  status: string;
  completed_at: string | null;
  activity_id: string | null;
  calendar_event_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type ProjectThumbnail = {
  id: string;
  project_id: string;
  bucket_id: string;
  object_path: string;
  mime_type: string;
  file_size: number;
  version: number;
  active: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  removed_at: string | null;
  signed_url: string | null;
};

export type ProjectOption = { id: string; name: string; email?: string };
export type DateTypeOption = { code: string; name: string; color?: string | null };

export type ProjectWorkspace = {
  project: Project;
  clients: ProjectOption[];
  users: ProjectOption[];
  dateTypes: DateTypeOption[];
  dates: ProjectDate[];
  thumbnail: ProjectThumbnail | null;
  activities: ProjectActivity[];
  events: CalendarEvent[];
  files: LinkedFile[];
  comments: ProjectCommentItem[];
  checklist: ProjectChecklistItem[];
  history: ProjectHistory[];
  finance: ProjectFinancialEntry[];
  financeSummary: ProjectFinancialSummary | null;
};
