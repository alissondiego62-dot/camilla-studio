export type ActivityViewType = "table" | "list" | "board" | "calendar" | "timeline";
export type ActivityGroupBy = "none" | "status" | "responsible" | "project" | "priority";
export type ActivitySortDirection = "asc" | "desc";

export type ActivityStatusOption = {
  code: string;
  name: string;
  color: string | null;
  position: number;
  active: boolean;
};

export type ActivityRelation = { id: string; name: string; code?: string | null; email?: string | null };

export type ActivityRow = {
  id: string;
  project_id: string | null;
  client_id: string | null;
  parent_id: string | null;
  title: string;
  description: string | null;
  notes_document: ActivityNoteDocument;
  group_name: string;
  responsible_user_id: string | null;
  responsible_name: string | null;
  priority: string;
  starts_at: string | null;
  due_at: string | null;
  due_date: string | null;
  all_day: boolean;
  completed_at: string | null;
  completed_by: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  status: string;
  progress: number;
  archived_at: string | null;
  archived_by: string | null;
  deleted_at: string | null;
  stage: string | null;
  tags: string[];
  project?: { id: string; code: string; name: string; client_id: string | null; client?: { id: string; name: string } | null } | null;
  client?: { id: string; name: string } | null;
  participants?: Array<{ user_id: string; participant_role: string; profile?: { name: string; email: string } | null }>;
  children?: ActivityRow[];
  children_total?: number;
  children_completed?: number;
};

export type ActivityFilters = {
  search: string;
  statuses: string[];
  priorities: string[];
  responsibleId: string;
  projectId: string;
  clientId: string;
  tag: string;
  due: "all" | "overdue" | "today" | "week" | "no_date";
  includeArchived: boolean;
};

export type ActivitySort = { property: string; direction: ActivitySortDirection };

export type ActivitySavedView = {
  id: string;
  user_id: string;
  name: string;
  view_type: ActivityViewType;
  filters: ActivityFilters;
  sorting: ActivitySort[];
  grouping: { property: ActivityGroupBy };
  visible_properties: string[];
  column_order: string[];
  column_widths: Record<string, number>;
  page_size: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type ActivityWorkspaceOptions = {
  statuses: ActivityStatusOption[];
  projects: Array<{ id: string; code: string; name: string; client_id: string | null }>;
  clients: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string; email: string }>;
  stages: Array<{ code: string; name: string }>;
};

export type ActivityMutation = Partial<Pick<ActivityRow,
  "title" | "description" | "status" | "priority" | "responsible_user_id" | "responsible_name" |
  "starts_at" | "due_at" | "due_date" | "all_day" | "project_id" | "client_id" | "stage" |
  "tags" | "progress" | "parent_id" | "position" | "notes_document"
>> & { participant_ids?: string[] };

export type ActivityPageResult = { items: ActivityRow[]; count: number };

export type ActivityNoteBlockType = "heading" | "paragraph" | "bulleted_list" | "numbered_list" | "checklist" | "link" | "image" | "file" | "highlight";
export type ActivityNoteBlock = { id: string; type: ActivityNoteBlockType; text: string; checked?: boolean; url?: string };
export type ActivityNoteDocument = { version: 1; blocks: ActivityNoteBlock[] };

export type ActivityComment = {
  id: string;
  activity_id: string | null;
  parent_comment_id: string | null;
  author_id: string | null;
  comment: string;
  comment_kind: "comment" | "internal_note";
  important: boolean;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  author?: { name: string | null; email: string | null } | null;
};

export const defaultActivityFilters: ActivityFilters = {
  search: "", statuses: [], priorities: [], responsibleId: "", projectId: "", clientId: "", tag: "", due: "all", includeArchived: false,
};

export const defaultVisibleProperties = ["title", "project", "responsible", "status", "priority", "start", "due", "progress"];
export const defaultColumnOrder = ["select", "title", "project", "client", "responsible", "status", "priority", "start", "due", "stage", "tags", "progress", "updated"];
