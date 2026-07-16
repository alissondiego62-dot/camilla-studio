import { supabase } from "@/lib/supabase";
import { ensureSupabase, assertNoError } from "@/app/services/supabase/base-service";
import type { HistoryEntry } from "./types";

export async function listHistory(filters: { module?: string; action?: string; query?: string; limit?: number } = {}) {
  if (!ensureSupabase()) return [];
  let request = supabase.from("history_entries").select("*").order("created_at", { ascending: false }).limit(filters.limit ?? 500);
  if (filters.module) request = request.eq("module", filters.module);
  if (filters.action) request = request.eq("action", filters.action);
  if (filters.query) request = request.ilike("description", `%${filters.query}%`);
  const result = await request;
  if (result.error && /history_entries.*does not exist|schema cache/i.test(result.error.message)) {
    const fallback = await supabase.from("project_history").select("id,project_id,action_type,description,field_name,old_value,new_value,metadata,author_id,created_at").order("created_at", { ascending: false }).limit(filters.limit ?? 500);
    assertNoError(fallback);
    return (fallback.data ?? []).map((row) => ({ id: `project:${row.id}`, module: "projects", record_type: "project", record_id: row.project_id, project_id: row.project_id, actor_user_id: row.author_id, action: row.action_type, field_name: row.field_name, old_value: row.old_value, new_value: row.new_value, description: row.description, metadata: row.metadata ?? {}, source_table: "project_history", source_id: String(row.id), created_at: row.created_at, actor: null })) as HistoryEntry[];
  }
  assertNoError(result);
  const rows = (result.data ?? []) as HistoryEntry[];
  const ids = [...new Set(rows.map((row) => row.actor_user_id).filter(Boolean))] as string[];
  const profiles = ids.length ? await supabase.from("profiles").select("id,name,email").in("id", ids) : { data: [], error: null };
  if (profiles.error) throw new Error(profiles.error.message);
  const map = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));
  return rows.map((row) => ({ ...row, actor: row.actor_user_id ? map.get(row.actor_user_id) ?? null : null }));
}
