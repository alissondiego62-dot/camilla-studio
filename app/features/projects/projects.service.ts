import { supabase } from "@/lib/supabase";
import { ensureSupabase, assertNoError } from "@/app/services/supabase/base-service";
import type { NewProject, ProjectFormOptions, ProjectRow } from "./types";

function missingStage03(message: string) {
  return /project_dates|save_project_date|schema cache|does not exist/i.test(message);
}

export async function listProjects() {
  if (!ensureSupabase()) return [];
  const result = await supabase
    .from("projects")
    .select("id,code,name,project_type,subtype,stage,status,priority,main_deadline,responsible_user_id,responsible_name,cover_url,updated_at,archived_at,client_id,client:clients(name)")
    .is("archived_at", null)
    .order("updated_at", { ascending: false });
  assertNoError(result);
  return (result.data ?? []) as unknown as ProjectRow[];
}

export async function listProjectFormOptions(): Promise<ProjectFormOptions> {
  if (!ensureSupabase()) return { clients: [], users: [] };
  const [clients, users] = await Promise.all([
    supabase.from("clients").select("id,name").is("archived_at", null).order("name"),
    supabase.from("profiles").select("id,name,email").eq("active", true).is("blocked_at", null).is("archived_at", null).order("name"),
  ]);
  if (clients.error && !/archived_at|schema cache/i.test(clients.error.message)) throw new Error(clients.error.message);
  if (users.error && !/blocked_at|archived_at|schema cache/i.test(users.error.message)) throw new Error(users.error.message);
  return {
    clients: (clients.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name) })),
    users: (users.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name), email: String(row.email) })),
  };
}

export async function createProject(input: NewProject) {
  const { main_deadline, ...project } = input;
  const insert = await supabase.from("projects").insert({ ...project, main_deadline }).select("id").single();
  assertNoError(insert);
  const projectId = String(insert.data?.id ?? "");
  if (!projectId) throw new Error("O projeto foi criado, mas o identificador não foi retornado.");

  if (main_deadline) {
    const response = await supabase.rpc("save_project_date", {
      p_payload: {
        project_id: projectId,
        purpose_code: "final_delivery",
        title: "Prazo principal",
        starts_at: `${main_deadline}T17:00:00-04:00`,
        all_day: true,
        is_main_deadline: true,
      },
    });
    if (response.error && !missingStage03(response.error.message)) throw new Error(response.error.message);
  }
  return projectId;
}
