import { supabase } from "@/lib/supabase";
import type { Project, ProjectChecklistItem, ProjectFinancialEntry, ProjectHistory } from "@/app/domain/architecture-types";
import type { ProjectCommentItem } from "@/app/features/comments/types";
import type { LinkedFile } from "@/app/features/file-manager/types";
import type { ProjectActivity, ProjectDate, ProjectOption, ProjectThumbnail, ProjectWorkspace, DateTypeOption } from "./types";
import { signedThumbnailUrl } from "@/app/features/project-thumbnail/project-thumbnail.service";

function optionalMissing(message: string) {
  return /does not exist|schema cache|project_dates|project_thumbnails|financial_entries/i.test(message);
}

async function optionalRows<T>(promise: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const result = await promise;
  if (result.error) {
    if (optionalMissing(result.error.message)) return [];
    throw new Error(result.error.message);
  }
  return (result.data ?? []) as T[];
}

export async function loadProjectWorkspace(projectId: string, includeFinance: boolean): Promise<ProjectWorkspace> {
  const projectResult = await supabase.from("projects").select("id,code,client_id,name,project_type,subtype,stage,status,priority,responsible_name,deadline_stage_1,deadline_stage_2,deadline_stage_3,contract_value,amount_received,balance_due,cover_url,notes,created_by,created_at,updated_at,main_deadline,responsible_user_id,archived_at,client:clients(id,name,phone,email)").eq("id", projectId).maybeSingle();
  if (projectResult.error) throw new Error(projectResult.error.message);
  if (!projectResult.data) throw new Error("Projeto não encontrado ou sem permissão de acesso.");

  const [clients, users, dateTypes, dates, thumbnails, activities, events, files, comments, checklist, history] = await Promise.all([
    optionalRows<ProjectOption>(supabase.from("clients").select("id,name").is("archived_at", null).order("name")),
    optionalRows<ProjectOption>(supabase.from("profiles").select("id,name,email").eq("active", true).is("blocked_at", null).is("archived_at", null).order("name")),
    optionalRows<DateTypeOption>(supabase.from("system_categories").select("code,name,color").eq("module", "project_date_type").eq("active", true).is("archived_at", null).order("position")),
    optionalRows<ProjectDate>(supabase.from("project_dates").select("id,project_id,purpose_code,title,description,starts_at,ends_at,all_day,is_main_deadline,status,completed_at,activity_id,calendar_event_id,created_by,updated_by,created_at,updated_at,archived_at").eq("project_id", projectId).is("archived_at", null).order("starts_at")),
    optionalRows<ProjectThumbnail>(supabase.from("project_thumbnails").select("id,project_id,bucket_id,object_path,mime_type,file_size,version,active,uploaded_by,created_at,updated_at,removed_at").eq("project_id", projectId).eq("active", true).is("removed_at", null).order("version", { ascending: false }).limit(1)),
    optionalRows<ProjectActivity>(supabase.from("project_activities").select("id,project_id,parent_id,title,description,status,priority,due_date,due_at,progress,responsible_user_id,responsible_name,completed_at,created_at").eq("project_id", projectId).is("archived_at", null).order("created_at", { ascending: false })),
    optionalRows(supabase.from("calendar_events").select("id,project_id,title,event_type,starts_at,ends_at,location,notes,completed_at,created_at").eq("project_id", projectId).order("starts_at")),
    optionalRows<LinkedFile>(supabase.from("project_files").select("id,project_id,client_id,activity_id,financial_entry_id,name,category,drive_url,drive_file_id,drive_folder_id,drive_parent_folder_id,drive_modified_at,mime_type,file_size,origin,storage_bucket,storage_path,version,version_group_id,replaces_file_id,notes,download_allowed,archived_at,created_by,created_at,updated_at").eq("project_id", projectId).is("archived_at", null).order("created_at", { ascending: false })),
    optionalRows<ProjectCommentItem>(supabase.from("project_comments").select("id,project_id,parent_comment_id,author_id,comment,comment_kind,important,edited_at,updated_at,deleted_at,created_at,mentions:comment_mentions(user_id)").eq("project_id", projectId).order("created_at", { ascending: true })),
    optionalRows<ProjectChecklistItem>(supabase.from("project_checklist_items").select("id,project_id,stage,section,title,required,responsible_user_id,started_at,completed_at,completed_by,waived_at,waived_by,waiver_reason,position,created_at").eq("project_id", projectId).order("stage").order("position")),
    optionalRows<ProjectHistory>(supabase.from("project_history").select("id,project_id,action_type,description,field_name,old_value,new_value,metadata,author_id,created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(250)),
  ]);

  let finance: ProjectFinancialEntry[] = [];
  if (includeFinance) {
    const financeResult = await supabase.rpc("get_project_financial_entries", { p_project_id: projectId });
    if (!financeResult.error) {
      finance = (financeResult.data ?? []) as ProjectFinancialEntry[];
    } else if (/function .* does not exist|schema cache/i.test(financeResult.error.message)) {
      finance = await optionalRows<ProjectFinancialEntry>(supabase.from("project_financial_entries").select("id,project_id,description,category,amount,received_on,payment_method,notes,created_by,created_at,entry_type").eq("project_id", projectId).order("created_at", { ascending: false }));
    } else {
      throw new Error(financeResult.error.message);
    }
  }

  const thumbnail = thumbnails[0] ?? null;
  if (thumbnail) {
    try { thumbnail.signed_url = await signedThumbnailUrl(thumbnail.bucket_id, thumbnail.object_path); }
    catch { thumbnail.signed_url = null; }
  }

  const profileMap = new Map(users.map((item) => [item.id, item]));
  const mappedFiles = files.map((item) => ({ ...item, author: item.created_by ? profileMap.get(item.created_by) ?? null : null }));
  const mappedComments = comments.map((item) => { const author = item.author_id ? profileMap.get(item.author_id) : null; return { ...item, author: author ? { id: author.id, name: author.name, email: author.email ?? null } : null }; });

  return {
    project: projectResult.data as unknown as Project,
    clients,
    users,
    dateTypes,
    dates,
    thumbnail,
    activities,
    events: events as ProjectWorkspace["events"],
    files: mappedFiles,
    comments: mappedComments,
    checklist,
    history,
    finance,
  };
}

export async function updateProjectGeneral(projectId: string, payload: Record<string, unknown>) {
  const workflow: Record<string, unknown> = {};
  for (const key of ["stage", "status", "responsible_user_id", "responsible_name"]) {
    if (key in payload) { workflow[key] = payload[key]; delete payload[key]; }
  }
  if (Object.keys(workflow).length) {
    const response = await supabase.rpc("update_project_workflow", { p_project_id: projectId, p_patch: workflow });
    if (response.error) throw new Error(response.error.message);
  }
  if (Object.keys(payload).length) {
    const result = await supabase.from("projects").update(payload).eq("id", projectId);
    if (result.error) throw new Error(result.error.message);
  }
}

export async function addProjectComment(projectId: string, comment: string) {
  const result = await supabase.from("project_comments").insert({ project_id: projectId, comment: comment.trim() });
  if (result.error) throw new Error(result.error.message);
}

export async function addProjectFile(projectId: string, input: { name: string; category: string; drive_url: string; notes?: string | null }) {
  const result = await supabase.from("project_files").insert({ project_id: projectId, ...input });
  if (result.error) throw new Error(result.error.message);
}

export async function addProjectActivity(projectId: string, input: { title: string; description?: string | null; due_date?: string | null; responsible_user_id?: string | null; responsible_name?: string | null }) {
  const result = await supabase.from("project_activities").insert({ project_id: projectId, status: "not_started", priority: "normal", ...input });
  if (result.error) throw new Error(result.error.message);
}

export async function addProjectEvent(projectId: string, input: { title: string; event_type: string; starts_at: string; ends_at?: string | null; location?: string | null; notes?: string | null }) {
  const result = await supabase.from("calendar_events").insert({ project_id: projectId, status: "scheduled", ...input });
  if (result.error) throw new Error(result.error.message);
}

export async function updateChecklistItem(itemId: string, action: "complete" | "reopen" | "waive", reason?: string | null) {
  const response = await supabase.rpc("update_project_checklist_item", { p_item_id: itemId, p_action: action, p_reason: reason ?? null });
  if (response.error) throw new Error(response.error.message);
}

export async function updateProjectActivityStatus(activityId: string, completed: boolean) {
  const response = await supabase.rpc("set_activity_status", { p_activity_id: activityId, p_status: completed ? "completed" : "in_progress", p_force: false, p_reason: null });
  if (response.error && /function .* does not exist|schema cache/i.test(response.error.message)) {
    const fallback = await supabase.from("project_activities").update({ status: completed ? "completed" : "in_progress", completed_at: completed ? new Date().toISOString() : null }).eq("id", activityId);
    if (fallback.error) throw new Error(fallback.error.message);
    return;
  }
  if (response.error) throw new Error(response.error.message);
}

export async function updateProjectEventStatus(eventId: string, completed: boolean) {
  const result = await supabase.from("calendar_events").update({ status: completed ? "completed" : "scheduled", completed_at: completed ? new Date().toISOString() : null }).eq("id", eventId);
  if (result.error) throw new Error(result.error.message);
}
