import { supabase } from "@/lib/supabase";
import { assertNoError } from "@/app/services/supabase/base-service";
import type { FileOrigin, LinkedFile } from "./types";

const bucket = "linked-files";
function safeName(name: string) { return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-"); }
function relationPath(input: { project_id?: string | null; client_id?: string | null; activity_id?: string | null; financial_entry_id?: string | null }) {
  if (input.project_id) return ["projects", input.project_id];
  if (input.client_id) return ["clients", input.client_id];
  if (input.activity_id) return ["activities", input.activity_id];
  if (input.financial_entry_id) return ["financial", input.financial_entry_id];
  throw new Error("Selecione um registro relacionado.");
}

export async function listLinkedFiles(filters: { projectId?: string; clientId?: string; activityId?: string; financialId?: string; includeArchived?: boolean } = {}) {
  let query = supabase.from("project_files").select("*").order("created_at", { ascending: false });
  if (!filters.includeArchived) query = query.is("archived_at", null);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.clientId) query = query.eq("client_id", filters.clientId);
  if (filters.activityId) query = query.eq("activity_id", filters.activityId);
  if (filters.financialId) query = query.eq("financial_entry_id", filters.financialId);
  const result = await query; assertNoError(result); return (result.data ?? []) as LinkedFile[];
}

export async function addDriveLink(input: { name: string; category: string; url: string; notes?: string | null; project_id?: string | null; client_id?: string | null; activity_id?: string | null; financial_entry_id?: string | null }) {
  const id = crypto.randomUUID();
  const result = await supabase.from("project_files").insert({ id, ...input, drive_url: input.url, origin: "google_drive" satisfies FileOrigin, version: 1, version_group_id: id });
  assertNoError(result);
}

export async function uploadLinkedFile(file: File, input: { name?: string; category: string; notes?: string | null; project_id?: string | null; client_id?: string | null; activity_id?: string | null; financial_entry_id?: string | null; replaces?: LinkedFile | null }) {
  if (file.size > 50 * 1024 * 1024) throw new Error("O arquivo excede o limite de 50 MB.");
  const id = crypto.randomUUID(); const [entity, relationId] = relationPath(input); const version = (input.replaces?.version ?? 0) + 1;
  const versionGroupId = input.replaces?.version_group_id ?? input.replaces?.id ?? id;
  const path = `${entity}/${relationId}/${id}/v${version}-${safeName(file.name)}`;
  const row = { id, project_id: input.project_id ?? null, client_id: input.client_id ?? null, activity_id: input.activity_id ?? null, financial_entry_id: input.financial_entry_id ?? null, name: input.name?.trim() || file.name, category: input.category, mime_type: file.type || "application/octet-stream", file_size: file.size, origin: "supabase_storage" satisfies FileOrigin, storage_bucket: bucket, storage_path: path, version, version_group_id: versionGroupId, replaces_file_id: input.replaces?.id ?? null, notes: input.notes ?? null, drive_url: null };
  const created = await supabase.from("project_files").insert(row); assertNoError(created);
  const uploaded = await supabase.storage.from(bucket).upload(path, file, { contentType: row.mime_type, upsert: false });
  if (uploaded.error) { await supabase.from("project_files").delete().eq("id", id); throw new Error(uploaded.error.message); }
  if (input.replaces) {
    const { data: authData } = await supabase.auth.getUser();
    const archived = await supabase.from("project_files").update({ archived_at: new Date().toISOString(), archived_by: authData.user?.id ?? null, updated_by: authData.user?.id ?? null }).eq("id", input.replaces.id);
    if (archived.error) throw new Error(`Arquivo enviado, mas a versão anterior não pôde ser arquivada: ${archived.error.message}`);
  }
  return id;
}

export async function openLinkedFile(file: LinkedFile, download = false) {
  if (file.origin !== "supabase_storage") { if (!file.drive_url) throw new Error("Link não informado."); window.open(file.drive_url, "_blank", "noopener,noreferrer"); return; }
  if (!file.storage_bucket || !file.storage_path) throw new Error("Arquivo sem caminho de armazenamento.");
  if (download && !file.download_allowed) throw new Error("O download deste arquivo não está autorizado.");
  const result = await supabase.storage.from(file.storage_bucket).createSignedUrl(file.storage_path, 120, download ? { download: file.name } : undefined);
  if (result.error) throw new Error(result.error.message); window.open(result.data.signedUrl, "_blank", "noopener,noreferrer");
}

export async function archiveLinkedFile(id: string) {
  const { data } = await supabase.auth.getUser();
  const result = await supabase.from("project_files").update({ archived_at: new Date().toISOString(), archived_by: data.user?.id ?? null, updated_by: data.user?.id ?? null }).eq("id", id);
  assertNoError(result);
}

export async function updateLinkedFileMetadata(id: string, input: { name: string; category: string; notes?: string | null; drive_url?: string | null; download_allowed: boolean }) {
  const { data } = await supabase.auth.getUser();
  const result = await supabase.from("project_files").update({ name: input.name.trim(), category: input.category.trim(), notes: input.notes ?? null, drive_url: input.drive_url ?? null, download_allowed: input.download_allowed, updated_by: data.user?.id ?? null }).eq("id", id);
  assertNoError(result);
}

export async function listFileVersions(file: LinkedFile) {
  const result = await supabase.from("project_files").select("*").eq("version_group_id", file.version_group_id || file.id).order("version", { ascending: false });
  assertNoError(result); return (result.data ?? []) as LinkedFile[];
}

export async function markFilesViewed(projectId: string) {
  const result = await supabase.rpc("mark_record_view", { p_module: "projects", p_record_type: "project", p_record_id: projectId, p_area: "files" });
  if (result.error && !/function .* does not exist|schema cache/i.test(result.error.message)) throw new Error(result.error.message);
}
