import { ensureSupabase, assertNoError } from "@/app/services/supabase/base-service";
import { supabase } from "@/lib/supabase";
import type {
  ClientActivitySummary, ClientAgendaSummary, ClientDirectoryRow, ClientEmail, ClientFilters,
  ClientFinancialEntry, ClientFinancialSummary, ClientFormOptions, ClientMutation, ClientNote,
  ClientPhone, ClientProjectSummary, ClientRow, ClientWorkspace,
} from "./types";
import type { LinkedFile } from "@/app/features/file-manager/types";
import type { HistoryEntry } from "@/app/features/history/types";

const missingStage07 = (message: string) => /client_directory_view|client_notes|search_clients|schema cache|does not exist/i.test(message);
const number = (value: unknown) => Number(value ?? 0);

export async function listClients(filters: ClientFilters): Promise<ClientDirectoryRow[]> {
  if (!ensureSupabase()) return [];
  const response = await supabase.rpc("search_clients", {
    p_query: filters.query.trim() || null,
    p_filters: {
      person_type: filters.personType || null,
      relationship_status: filters.relationshipStatus || null,
      source_code: filters.sourceCode || null,
      segment_code: filters.segmentCode || null,
      responsible_user_id: filters.responsibleId || null,
      include_archived: filters.includeArchived,
    },
    p_limit: 250,
    p_offset: 0,
  });
  if (!response.error) return (response.data ?? []) as ClientDirectoryRow[];
  if (!missingStage07(response.error.message)) throw new Error(response.error.message);
  let fallback = supabase.from("clients").select("id,name,legal_name,trade_name,person_type,cpf,cnpj,document,state_registration,municipal_registration,phone,whatsapp,email,website,postal_code,address,address_number,address_complement,neighborhood,city,state,primary_contact_name,primary_contact_role,internal_responsible_user_id,source_code,segment_code,relationship_status,notes,created_by,created_at,updated_by,updated_at,archived_at,archived_by").order("name");
  if (!filters.includeArchived) fallback = fallback.is("archived_at", null);
  if (filters.personType) fallback = fallback.eq("person_type", filters.personType);
  if (filters.relationshipStatus) fallback = fallback.eq("relationship_status", filters.relationshipStatus);
  if (filters.query) fallback = fallback.or(`name.ilike.%${filters.query}%,phone.ilike.%${filters.query}%,email.ilike.%${filters.query}%`);
  const result = await fallback;
  assertNoError(result);
  return (result.data ?? []).map((row) => ({ ...row, total_projects: 0, active_projects: 0, pending_activities: 0, overdue_activities: 0, last_contact_at: null, next_commitment_at: null })) as ClientDirectoryRow[];
}

export async function listClientFormOptions(): Promise<ClientFormOptions> {
  if (!ensureSupabase()) return { users: [], relationshipStatuses: [], sources: [], segments: [], noteTypes: [], fileCategories: [] };
  const [users, categories] = await Promise.all([
    supabase.from("profiles").select("id,name,email").eq("active", true).is("blocked_at", null).is("archived_at", null).order("name"),
    supabase.from("system_categories").select("module,code,name,color").in("module", ["client_relationship_status", "client_source", "client_segment", "client_note_type", "client_file_category"]).eq("active", true).is("archived_at", null).order("position"),
  ]);
  assertNoError(users);
  if (categories.error && !/client_|schema cache/i.test(categories.error.message)) throw new Error(categories.error.message);
  const rows = categories.data ?? [];
  const by = (module: string) => rows.filter((row) => row.module === module).map(({ code, name, color }) => ({ code, name, color }));
  return {
    users: (users.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name), email: String(row.email ?? "") })),
    relationshipStatuses: by("client_relationship_status"), sources: by("client_source"), segments: by("client_segment"),
    noteTypes: by("client_note_type"), fileCategories: by("client_file_category"),
  };
}

export async function saveClient(clientId: string | null, input: ClientMutation) {
  const response = await supabase.rpc("save_client", { p_client_id: clientId, p_payload: input });
  if (response.error && missingStage07(response.error.message)) {
    const row = Object.fromEntries(Object.entries(input).filter(([key]) => !["phones", "emails", "internal_responsible"].includes(key)));
    const result = clientId
      ? await supabase.from("clients").update(row).eq("id", clientId).select("id").single()
      : await supabase.from("clients").insert({ ...row, relationship_status: row.relationship_status || "active" }).select("id").single();
    assertNoError(result); return String(result.data?.id ?? clientId ?? "");
  }
  assertNoError(response); return String(response.data);
}

export async function archiveClient(id: string) { const r = await supabase.rpc("archive_client", { p_client_id: id }); assertNoError(r); }
export async function reactivateClient(id: string) { const r = await supabase.rpc("reactivate_client", { p_client_id: id }); assertNoError(r); }
export async function deleteClientSafely(id: string) { const r = await supabase.rpc("delete_client_safely", { p_client_id: id }); assertNoError(r); }

export async function saveClientNote(clientId: string, note: { id?: string | null; note_type: string; content: string; important: boolean; occurred_at?: string | null }) {
  const r = await supabase.rpc("save_client_note", { p_note_id: note.id ?? null, p_client_id: clientId, p_payload: note }); assertNoError(r); return String(r.data);
}
export async function archiveClientNote(id: string) { const r = await supabase.rpc("archive_client_note", { p_note_id: id }); assertNoError(r); }
export async function pinClientNote(id: string, pinned: boolean) { const r = await supabase.rpc("pin_client_note", { p_note_id: id, p_pinned: pinned }); assertNoError(r); }

async function listClientProjects(clientId: string): Promise<ClientProjectSummary[]> {
  const [projects, thumbs] = await Promise.all([
    supabase.from("projects").select("id,code,name,stage,status,priority,main_deadline,responsible_name,contract_value,archived_at").eq("client_id", clientId).order("updated_at", { ascending: false }),
    supabase.from("project_thumbnails").select("project_id,bucket_id,object_path").eq("active", true).is("removed_at", null),
  ]);
  assertNoError(projects);
  const thumbMap = new Map<string, string>();
  if (!thumbs.error) {
    for (const thumb of thumbs.data ?? []) {
      if (thumb.bucket_id && thumb.object_path) {
        const signed = await supabase.storage.from(String(thumb.bucket_id)).createSignedUrl(String(thumb.object_path), 3600);
        if (!signed.error && signed.data?.signedUrl) thumbMap.set(String(thumb.project_id), signed.data.signedUrl);
      }
    }
  }
  return (projects.data ?? []).map((row) => ({ ...row, contract_value: row.contract_value == null ? null : number(row.contract_value), thumbnail_url: thumbMap.get(String(row.id)) ?? null })) as ClientProjectSummary[];
}

async function listClientActivitiesInternal(clientId: string): Promise<ClientActivitySummary[]> {
  const result = await supabase.from("project_activities").select("id,title,status,priority,due_date,due_at,starts_at,progress,project:projects(id,code,name)").eq("client_id", clientId).is("deleted_at", null).order("updated_at", { ascending: false });
  assertNoError(result); return (result.data ?? []) as unknown as ClientActivitySummary[];
}
export const listClientActivities = listClientActivitiesInternal;

async function listClientAgenda(clientId: string): Promise<ClientAgendaSummary[]> {
  const result = await supabase.from("agenda_items").select("item_key,source_type,source_id,title,starts_at,ends_at,all_day,status,item_type,project_id,project_name,activity_id,responsible_name").eq("client_id", clientId).order("starts_at", { ascending: true }).limit(250);
  if (result.error && /client_id|schema cache/i.test(result.error.message)) return [];
  assertNoError(result); return (result.data ?? []) as ClientAgendaSummary[];
}

async function listClientFiles(clientId: string): Promise<LinkedFile[]> {
  const result = await supabase.from("project_files").select("id,project_id,client_id,activity_id,financial_entry_id,name,category,drive_url,drive_file_id,drive_folder_id,drive_parent_folder_id,drive_modified_at,mime_type,file_size,origin,storage_bucket,storage_path,version,version_group_id,replaces_file_id,notes,download_allowed,archived_at,created_by,created_at,updated_at").eq("client_id", clientId).is("archived_at", null).order("created_at", { ascending: false });
  assertNoError(result); return (result.data ?? []) as LinkedFile[];
}

async function listClientNotes(clientId: string): Promise<ClientNote[]> {
  const result = await supabase.from("client_notes").select("id,client_id,note_type,content,important,pinned_at,occurred_at,created_by,updated_by,created_at,updated_at,archived_at").eq("client_id", clientId).is("archived_at", null).order("pinned_at", { ascending: false, nullsFirst: false }).order("occurred_at", { ascending: false });
  if (result.error && missingStage07(result.error.message)) return [];
  assertNoError(result);
  const rows = (result.data ?? []) as ClientNote[];
  const ids = [...new Set(rows.map((row) => row.created_by).filter(Boolean))] as string[];
  const profiles = ids.length ? await supabase.from("profiles").select("id,name,email").in("id", ids) : { data: [], error: null };
  if (profiles.error) throw new Error(profiles.error.message);
  const map = new Map((profiles.data ?? []).map((row) => [String(row.id), row]));
  return rows.map((row) => ({ ...row, author: row.created_by ? map.get(row.created_by) ?? null : null }));
}

async function listClientHistory(clientId: string): Promise<HistoryEntry[]> {
  const result = await supabase.from("history_entries").select("id,module,record_type,record_id,project_id,actor_user_id,action,field_name,old_value,new_value,description,metadata,source_table,source_id,created_at").or(`and(module.eq.clients,record_id.eq.${clientId}),metadata->>client_id.eq.${clientId}`).order("created_at", { ascending: false }).limit(400);
  if (result.error && /metadata|operator|syntax/i.test(result.error.message)) {
    const fallback = await supabase.from("history_entries").select("id,module,record_type,record_id,project_id,actor_user_id,action,field_name,old_value,new_value,description,metadata,source_table,source_id,created_at").eq("module", "clients").eq("record_id", clientId).order("created_at", { ascending: false }).limit(400);
    assertNoError(fallback); return (fallback.data ?? []) as HistoryEntry[];
  }
  assertNoError(result); return (result.data ?? []) as HistoryEntry[];
}

async function loadClientFinance(clientId: string): Promise<ClientFinancialSummary> {
  const response = await supabase.rpc("get_client_financial_workspace", { p_client_id: clientId });
  assertNoError(response);
  const row = (response.data ?? {}) as Record<string, unknown>;
  const entries = Array.isArray(row.entries) ? row.entries : [];
  return {
    expected_revenue: number(row.expected_revenue), received_revenue: number(row.received_revenue), receivable: number(row.receivable),
    open_amount: number(row.open_amount), overdue_amount: number(row.overdue_amount), partial_payments: number(row.partial_payments),
    total_billed: number(row.total_billed), average_ticket: number(row.average_ticket), last_payment_at: row.last_payment_at ? String(row.last_payment_at) : null,
    entries: entries.map((entry) => {
      const value = entry as Record<string, unknown>;
      return { ...value, amount: number(value.amount), paid_amount: number(value.paid_amount), open_amount: number(value.open_amount) };
    }) as ClientFinancialEntry[],
  };
}

export async function loadClientWorkspace(clientId: string, includeFinancial: boolean): Promise<ClientWorkspace | null> {
  if (!ensureSupabase()) return null;
  const [clientResult, phones, emails, projects, activities, agenda, files, notes, history, options] = await Promise.all([
    supabase.from("clients").select("*,internal_responsible:profiles!clients_internal_responsible_user_id_fkey(id,name,email)").eq("id", clientId).maybeSingle(),
    supabase.from("client_phones").select("id,client_id,label,phone,is_primary,is_whatsapp,position,archived_at").eq("client_id", clientId).is("archived_at", null).order("position"),
    supabase.from("client_emails").select("id,client_id,label,email,is_primary,position,archived_at").eq("client_id", clientId).is("archived_at", null).order("position"),
    listClientProjects(clientId), listClientActivitiesInternal(clientId), listClientAgenda(clientId), listClientFiles(clientId), listClientNotes(clientId), listClientHistory(clientId), listClientFormOptions(),
  ]);
  if (clientResult.error && clientResult.error.code !== "PGRST116") throw new Error(clientResult.error.message);
  if (!clientResult.data) return null;
  if (phones.error && !missingStage07(phones.error.message)) throw new Error(phones.error.message);
  if (emails.error && !missingStage07(emails.error.message)) throw new Error(emails.error.message);
  const client = clientResult.data as unknown as ClientRow;
  const finance = includeFinancial ? await loadClientFinance(clientId) : null;
  const now = Date.now();
  const pending = activities.filter((item) => !["completed", "cancelled"].includes(item.status));
  const lastContact = notes.filter((item) => item.note_type === "contact").map((item) => item.occurred_at).sort().at(-1) ?? null;
  const nextCommitment = agenda.filter((item) => new Date(item.starts_at).getTime() >= now && item.status !== "cancelled").sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0]?.starts_at ?? null;
  return {
    client,
    phones: (phones.data ?? []) as ClientPhone[], emails: (emails.data ?? []) as ClientEmail[], projects, activities, agenda, files, notes, history,
    indicators: {
      total_projects: projects.length,
      active_projects: projects.filter((item) => !["completed", "cancelled"].includes(item.status) && item.archived_at == null).length,
      pending_activities: pending.length,
      overdue_activities: pending.filter((item) => item.due_at && new Date(item.due_at).getTime() < now).length,
      open_amount: includeFinancial ? finance?.open_amount ?? 0 : null,
      last_contact_at: lastContact,
      next_commitment_at: nextCommitment,
    },
    finance, options,
  };
}
