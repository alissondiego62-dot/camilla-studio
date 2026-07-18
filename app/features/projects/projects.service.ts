import { supabase } from "@/lib/supabase";
import { ensureSupabase, assertNoError } from "@/app/services/supabase/base-service";
import type { NewProject, ProjectFinancialSummary, ProjectFormOptions, ProjectRow } from "./types";

function missingStage03(message: string) {
  return /project_dates|save_project_date|schema cache|does not exist/i.test(message);
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSummary(row: Record<string, unknown>): ProjectFinancialSummary {
  return {
    project_id: String(row.project_id ?? ""),
    contract_value: numberValue(row.contract_value),
    amount_received: numberValue(row.amount_received),
    balance_due: numberValue(row.balance_due),
    received_from_entries: numberValue(row.received_from_entries),
    legacy_amount_received: numberValue(row.legacy_amount_received),
    active_income_entries: numberValue(row.active_income_entries),
    overdue_amount: numberValue(row.overdue_amount),
    next_due_date: typeof row.next_due_date === "string" ? row.next_due_date : null,
  };
}

export async function listProjectFinancialSummaries(): Promise<ProjectFinancialSummary[]> {
  if (!ensureSupabase()) return [];
  const result = await supabase.rpc("list_project_financial_summaries");
  if (result.error) {
    if (/function .* does not exist|schema cache/i.test(result.error.message)) return [];
    throw new Error(result.error.message);
  }
  let rows: unknown[] = [];
  if (Array.isArray(result.data)) rows = result.data;
  else if (typeof result.data === "string") {
    try {
      const parsed = JSON.parse(result.data) as unknown;
      rows = Array.isArray(parsed) ? parsed : [];
    } catch { rows = []; }
  }
  return rows.map((row) => normalizeSummary(row as Record<string, unknown>));
}

export async function listProjects(includeFinancialSummary = false) {
  if (!ensureSupabase()) return [];
  const result = await supabase
    .from("projects")
    .select("id,code,name,project_type,subtype,stage,status,priority,main_deadline,responsible_user_id,responsible_name,cover_url,updated_at,archived_at,client_id,client:clients(name)")
    .is("archived_at", null)
    .order("updated_at", { ascending: false });
  assertNoError(result);
  const rows = (result.data ?? []) as unknown as ProjectRow[];
  if (!includeFinancialSummary) return rows;

  const summaries = await listProjectFinancialSummaries();
  const summaryMap = new Map(summaries.map((summary) => [summary.project_id, summary]));
  return rows.map((row) => ({ ...row, financial_summary: summaryMap.get(row.id) ?? null }));
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
  const { main_deadline, contract_value = 0, ...project } = input;
  const payload = { ...project, main_deadline, contract_value };
  const rpc = await supabase.rpc("create_project_with_contract", { p_payload: payload });

  let projectId = "";
  if (!rpc.error) {
    projectId = String(rpc.data ?? "");
  } else if (/function .* does not exist|schema cache/i.test(rpc.error.message)) {
    const insert = await supabase.from("projects").insert({ ...project, main_deadline }).select("id").single();
    assertNoError(insert);
    projectId = String(insert.data?.id ?? "");
    if (contract_value > 0) {
      const contract = await supabase.rpc("set_project_contract_value", { p_project_id: projectId, p_contract_value: contract_value });
      assertNoError(contract);
    }
  } else {
    throw new Error(rpc.error.message);
  }

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
