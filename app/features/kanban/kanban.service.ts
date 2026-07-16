import { ensureSupabase, assertNoError } from "@/app/services/supabase/base-service";
import { supabase } from "@/lib/supabase";
import type { AssignableUser, KanbanPlannedDate, KanbanProject, WorkflowPatch } from "./types";

function relationMissing(message: string) {
  return /project_kanban_view|project_dates|project_thumbnails|schema cache|does not exist/i.test(message);
}

async function signedThumbnail(bucket: string | null, path: string | null) {
  if (!bucket || !path || !ensureSupabase()) return null;
  const response = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return response.error ? null : response.data.signedUrl;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function mapViewRows(rows: Array<Record<string, unknown>>): Promise<KanbanProject[]> {
  return Promise.all(rows.map(async (row) => {
    const bucket = typeof row.thumbnail_bucket === "string" ? row.thumbnail_bucket : null;
    const path = typeof row.thumbnail_path === "string" ? row.thumbnail_path : null;
    const planned = Array.isArray(row.planned_dates) ? row.planned_dates as KanbanPlannedDate[] : [];
    return {
      id: String(row.id), code: String(row.code), name: String(row.name), project_type: String(row.project_type ?? ""),
      stage: String(row.stage), status: String(row.status), priority: String(row.priority ?? "normal"),
      main_deadline: typeof row.main_deadline === "string" ? row.main_deadline : null,
      responsible_user_id: typeof row.responsible_user_id === "string" ? row.responsible_user_id : null,
      responsible_name: typeof row.responsible_name === "string" ? row.responsible_name : null,
      cover_url: typeof row.cover_url === "string" ? row.cover_url : null,
      client_id: typeof row.client_id === "string" ? row.client_id : null,
      client_name: typeof row.client_name === "string" ? row.client_name : null,
      thumbnail_bucket: bucket, thumbnail_path: path, thumbnail_url: await signedThumbnail(bucket, path),
      planned_dates: planned,
      checklist_total: numberValue(row.checklist_total), checklist_completed: numberValue(row.checklist_completed),
      files_count: numberValue(row.files_count), comments_count: numberValue(row.comments_count), agenda_count: numberValue(row.agenda_count), history_count: numberValue(row.history_count),
      unread_files_count: numberValue(row.unread_files_count), unread_comments_count: numberValue(row.unread_comments_count), unread_agenda_count: numberValue(row.unread_agenda_count), unread_history_count: numberValue(row.unread_history_count),
      latest_file_at: typeof row.latest_file_at === "string" ? row.latest_file_at : null,
      latest_comment_at: typeof row.latest_comment_at === "string" ? row.latest_comment_at : null,
      latest_agenda_at: typeof row.latest_agenda_at === "string" ? row.latest_agenda_at : null,
      latest_history_at: typeof row.latest_history_at === "string" ? row.latest_history_at : null,
      updated_at: String(row.updated_at),
    };
  }));
}

export async function listKanbanProjects(): Promise<KanbanProject[]> {
  if (!ensureSupabase()) return [];
  const view = await supabase.from("project_kanban_view").select("*").order("stage_position").order("updated_at", { ascending: false });
  if (!view.error) return mapViewRows((view.data ?? []) as Array<Record<string, unknown>>);
  if (!relationMissing(view.error.message)) throw new Error(view.error.message);

  const projects = await supabase
    .from("projects")
    .select("id,code,name,project_type,stage,status,priority,main_deadline,responsible_user_id,responsible_name,cover_url,client_id,updated_at,client:clients(name)")
    .is("archived_at", null)
    .order("updated_at", { ascending: false });
  assertNoError(projects);
  return (projects.data ?? []).map((raw) => {
    const row = raw as unknown as Record<string, unknown> & { client?: { name?: string } | null };
    return {
      id: String(row.id), code: String(row.code), name: String(row.name), project_type: String(row.project_type ?? ""),
      stage: String(row.stage), status: String(row.status), priority: String(row.priority ?? "normal"),
      main_deadline: typeof row.main_deadline === "string" ? row.main_deadline : null,
      responsible_user_id: typeof row.responsible_user_id === "string" ? row.responsible_user_id : null,
      responsible_name: typeof row.responsible_name === "string" ? row.responsible_name : null,
      cover_url: typeof row.cover_url === "string" ? row.cover_url : null,
      client_id: typeof row.client_id === "string" ? row.client_id : null,
      client_name: row.client?.name ?? null,
      thumbnail_bucket: null, thumbnail_path: null, thumbnail_url: null, planned_dates: [],
      checklist_total: 0, checklist_completed: 0, files_count: 0, comments_count: 0, agenda_count: 0, history_count: 0,
      unread_files_count: 0, unread_comments_count: 0, unread_agenda_count: 0, unread_history_count: 0,
      latest_file_at: null, latest_comment_at: null, latest_agenda_at: null, latest_history_at: null,
      updated_at: String(row.updated_at),
    };
  });
}

export async function getKanbanProject(id: string): Promise<KanbanProject> {
  if (!ensureSupabase()) throw new Error("Supabase não configurado.");
  const view = await supabase.from("project_kanban_view").select("*").eq("id", id).maybeSingle();
  if (!view.error && view.data) return (await mapViewRows([view.data as Record<string, unknown>]))[0];
  if (view.error && !relationMissing(view.error.message)) throw new Error(view.error.message);
  const fallback = (await listKanbanProjects()).find((project) => project.id === id);
  if (!fallback) throw new Error("Projeto não encontrado após a atualização.");
  return fallback;
}

export async function listAssignableUsers(): Promise<AssignableUser[]> {
  if (!ensureSupabase()) return [];
  const result = await supabase.from("profiles").select("id,name,email").eq("active", true).is("blocked_at", null).is("archived_at", null).order("name");
  if (result.error && /blocked_at|archived_at|schema cache/i.test(result.error.message)) {
    const fallback = await supabase.from("profiles").select("id,name,email").eq("active", true).order("name");
    assertNoError(fallback);
    return (fallback.data ?? []) as AssignableUser[];
  }
  assertNoError(result);
  return (result.data ?? []) as AssignableUser[];
}

export async function updateProjectWorkflow(id: string, patch: WorkflowPatch) {
  const response = await supabase.rpc("update_project_workflow", { p_project_id: id, p_patch: patch });
  if (response.error) {
    if (/function .*update_project_workflow.*does not exist|schema cache/i.test(response.error.message)) {
      throw new Error("A função de movimentação segura não está disponível. Aplique o SQL da Etapa 03 antes de alterar o Kanban.");
    }
    throw new Error(response.error.message);
  }
}
