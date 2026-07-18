import { assertNoError, ensureSupabase } from "@/app/services/supabase/base-service";
import { supabase } from "@/lib/supabase";
import type {
  ActivityComment, ActivityMutation, ActivityPageResult, ActivityRow, ActivitySavedView,
  ActivityWorkspaceOptions,
} from "./types";

const activitySelect = `
  id,project_id,client_id,parent_id,title,description,notes_document,group_name,
  responsible_user_id,responsible_name,priority,starts_at,due_at,due_date,all_day,
  completed_at,completed_by,position,created_by,created_at,updated_by,updated_at,
  status,progress,archived_at,archived_by,deleted_at,stage,tags,
  project:projects(id,code,name,client_id,client:clients(id,name)),
  client:clients(id,name)
`;

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

async function enrichActivities(rows: unknown[]): Promise<ActivityRow[]> {
  const items = (rows as Array<Record<string, unknown>>).map((row) => {
    const project = normalizeRelation(row.project as ActivityRow["project"] | ActivityRow["project"][]);
    const client = normalizeRelation(row.client as ActivityRow["client"] | ActivityRow["client"][]);
    return { ...row, project, client, notes_document: row.notes_document || { version: 1, blocks: [] }, tags: row.tags ?? [] } as ActivityRow;
  });
  const userIds = [...new Set(items.map((item) => item.responsible_user_id).filter(Boolean) as string[])];
  const ids = items.map((item) => item.id);
  const [profiles, participants] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("id,name,email").in("id", userIds) : Promise.resolve({ data: [], error: null }),
    ids.length ? supabase.from("activity_participants").select("activity_id,user_id,participant_role").in("activity_id", ids) : Promise.resolve({ data: [], error: null }),
  ]);
  if (profiles.error && !/activity_participants|schema cache|does not exist/i.test(profiles.error.message)) throw new Error(profiles.error.message);
  if (participants.error && !/activity_participants|schema cache|does not exist/i.test(participants.error.message)) throw new Error(participants.error.message);
  const profileMap = new Map((profiles.data ?? []).map((profile) => [String(profile.id), profile]));
  const participantMap = new Map<string, ActivityRow["participants"]>();
  const participantUserIds = [...new Set((participants.data ?? []).map((row) => String(row.user_id)))];
  let participantProfiles: Array<{ id: string; name: string; email: string }> = [];
  if (participantUserIds.length) {
    const result = await supabase.from("profiles").select("id,name,email").in("id", participantUserIds);
    if (!result.error) participantProfiles = result.data as Array<{ id: string; name: string; email: string }>;
  }
  const participantProfileMap = new Map(participantProfiles.map((profile) => [profile.id, profile]));
  for (const row of participants.data ?? []) {
    const activityId = String(row.activity_id);
    const current = participantMap.get(activityId) ?? [];
    current.push({ user_id: String(row.user_id), participant_role: String(row.participant_role), profile: participantProfileMap.get(String(row.user_id)) ?? null });
    participantMap.set(activityId, current);
  }
  return items.map((item) => ({
    ...item,
    responsible_name: item.responsible_name ?? (item.responsible_user_id ? String(profileMap.get(item.responsible_user_id)?.name ?? "") || null : null),
    participants: participantMap.get(item.id) ?? [],
  }));
}

export async function listActivitiesPage(input: { page: number; pageSize: number; search?: string; includeArchived?: boolean }): Promise<ActivityPageResult> {
  if (!ensureSupabase()) return { items: [], count: 0 };
  const from = Math.max(0, input.page * input.pageSize);
  const to = from + input.pageSize - 1;
  let query = supabase.from("project_activities").select(activitySelect, { count: "exact" }).is("parent_id", null).is("deleted_at", null);
  query = input.includeArchived ? query : query.is("archived_at", null);
  if (input.search?.trim()) {
    const escaped = input.search.trim().replace(/[%_,]/g, " ");
    query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`);
  }
  const result = await query.order("position", { ascending: true }).order("updated_at", { ascending: false }).range(from, to);
  assertNoError(result);
  const mains = await enrichActivities(result.data ?? []);
  if (!mains.length) return { items: [], count: result.count ?? 0 };
  let childrenQuery = supabase.from("project_activities").select(activitySelect).in("parent_id", mains.map((item) => item.id)).is("deleted_at", null);
  childrenQuery = input.includeArchived ? childrenQuery : childrenQuery.is("archived_at", null);
  const childrenResult = await childrenQuery.order("position", { ascending: true });
  assertNoError(childrenResult);
  const children = await enrichActivities(childrenResult.data ?? []);
  return { items: [...mains, ...children], count: result.count ?? mains.length };
}

export async function listActivityWorkspaceOptions(): Promise<ActivityWorkspaceOptions> {
  if (!ensureSupabase()) return { statuses: [], projects: [], clients: [], users: [], stages: [] };
  const [statuses, projects, clients, users, stages] = await Promise.all([
    supabase.from("activity_statuses").select("code,name,color,position,active").eq("active", true).is("archived_at", null).order("position"),
    supabase.from("projects").select("id,code,name,client_id").is("archived_at", null).order("name"),
    supabase.from("clients").select("id,name").is("archived_at", null).order("name"),
    supabase.from("profiles").select("id,name,email").eq("active", true).is("blocked_at", null).is("archived_at", null).order("name"),
    supabase.from("project_stages").select("code,name").eq("active", true).is("archived_at", null).order("position"),
  ]);
  for (const result of [statuses, projects, clients, users, stages]) if (result.error) throw new Error(result.error.message);
  return {
    statuses: statuses.data ?? [], projects: projects.data ?? [], clients: clients.data ?? [], users: users.data ?? [], stages: stages.data ?? [],
  } as ActivityWorkspaceOptions;
}

export async function createActivity(input: ActivityMutation) {
  const result = await supabase.rpc("save_activity", { p_activity_id: null, p_payload: input });
  assertNoError(result);
  return String(result.data);
}

export async function updateActivity(id: string, input: ActivityMutation) {
  const result = await supabase.rpc("save_activity", { p_activity_id: id, p_payload: input });
  assertNoError(result);
  const row = await supabase.from("project_activities").select(activitySelect).eq("id", id).single();
  assertNoError(row);
  return (await enrichActivities([row.data]))[0];
}

export async function setActivityStatus(id: string, status: string, force = false, reason = "") {
  const result = await supabase.rpc("set_activity_status", { p_activity_id: id, p_status: status, p_force: force, p_reason: reason || null });
  assertNoError(result);
  const row = await supabase.from("project_activities").select(activitySelect).eq("id", id).single();
  assertNoError(row);
  return (await enrichActivities([row.data]))[0];
}

export async function bulkUpdateActivities(ids: string[], changes: ActivityMutation) {
  const result = await supabase.rpc("bulk_update_activities", { p_activity_ids: ids, p_changes: changes });
  assertNoError(result);
  return Number(result.data ?? ids.length);
}

export async function duplicateActivity(id: string) {
  const result = await supabase.rpc("duplicate_activity", { p_activity_id: id });
  assertNoError(result);
  return String(result.data);
}

export async function moveActivity(id: string, parentId: string | null, position?: number) {
  const result = await supabase.rpc("move_activity", { p_activity_id: id, p_parent_id: parentId, p_position: position ?? null });
  assertNoError(result);
}

export async function reorderActivity(id: string, position: number) {
  const result = await supabase.rpc("reorder_activity", { p_activity_id: id, p_position: position });
  assertNoError(result);
}

export async function archiveActivity(id: string) {
  const result = await supabase.rpc("archive_activity", { p_activity_id: id }); assertNoError(result);
}
export async function reactivateActivity(id: string) {
  const result = await supabase.rpc("reactivate_activity", { p_activity_id: id }); assertNoError(result);
}
export async function deleteActivityLogically(id: string) {
  const result = await supabase.rpc("delete_activity_logically", { p_activity_id: id }); assertNoError(result);
}

export async function listSavedActivityViews(): Promise<ActivitySavedView[]> {
  if (!ensureSupabase()) return [];
  const result = await supabase.from("activity_saved_views").select("id,user_id,name,view_type,filters,sorting,grouping,visible_properties,column_order,column_widths,page_size,is_default,include_archived,created_at,updated_at").order("is_default", { ascending: false }).order("updated_at", { ascending: false });
  if (result.error && /activity_saved_views|schema cache|does not exist/i.test(result.error.message)) return [];
  assertNoError(result); return (result.data ?? []) as ActivitySavedView[];
}

export async function saveActivityView(input: Omit<ActivitySavedView, "id" | "user_id" | "created_at" | "updated_at"> & { id?: string }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sessão inválida.");
  if (input.is_default) await supabase.from("activity_saved_views").update({ is_default: false }).eq("user_id", auth.user.id);
  const payload = { ...input, user_id: auth.user.id };
  const result = input.id
    ? await supabase.from("activity_saved_views").update(payload).eq("id", input.id).select("*").single()
    : await supabase.from("activity_saved_views").insert(payload).select("*").single();
  assertNoError(result); return result.data as ActivitySavedView;
}

export async function deleteActivityView(id: string) {
  const result = await supabase.from("activity_saved_views").delete().eq("id", id); assertNoError(result);
}

export async function listActivityComments(activityId: string): Promise<ActivityComment[]> {
  const result = await supabase.from("project_comments").select("id,activity_id,parent_comment_id,author_id,comment,comment_kind,important,edited_at,deleted_at,created_at,updated_at").eq("activity_id", activityId).order("created_at", { ascending: true });
  assertNoError(result);
  const rows = (result.data ?? []) as ActivityComment[];
  const ids = [...new Set(rows.map((item) => item.author_id).filter(Boolean) as string[])];
  if (!ids.length) return rows;
  const profiles = await supabase.from("profiles").select("id,name,email").in("id", ids);
  if (profiles.error) return rows;
  const map = new Map((profiles.data ?? []).map((profile) => [String(profile.id), profile]));
  return rows.map((item) => ({ ...item, author: item.author_id ? map.get(item.author_id) ?? null : null }));
}

export async function saveActivityComment(input: { activityId: string; comment: string; parentId?: string | null; kind?: "comment" | "internal_note"; important?: boolean; mentions?: string[]; commentId?: string | null }) {
  const result = await supabase.rpc("save_activity_comment", {
    p_activity_id: input.activityId, p_comment: input.comment.trim(), p_parent_id: input.parentId ?? null,
    p_kind: input.kind ?? "comment", p_important: input.important ?? false, p_mentions: input.mentions ?? [], p_comment_id: input.commentId ?? null,
  });
  assertNoError(result); return String(result.data);
}

export async function deleteActivityComment(commentId: string) {
  const result = await supabase.rpc("delete_project_comment", { p_comment_id: commentId }); assertNoError(result);
}

export async function listActivityEvents(activityId: string) {
  const result = await supabase.from("calendar_events").select("id,title,starts_at,ends_at,status,event_type,location").eq("activity_id", activityId).order("starts_at");
  assertNoError(result); return result.data ?? [];
}

export async function createActivityEvent(activity: ActivityRow, input: { title: string; starts_at: string; ends_at: string | null; event_type: string; location: string | null }) {
  const result = await supabase.from("calendar_events").insert({ ...input, activity_id: activity.id, project_id: activity.project_id, status: "scheduled", responsible_user_id: activity.responsible_user_id });
  assertNoError(result);
}
