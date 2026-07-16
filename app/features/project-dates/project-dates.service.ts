import { supabase } from "@/lib/supabase";
import type { ProjectDateInput } from "./types";

export async function saveProjectDate(input: ProjectDateInput) {
  const response = await supabase.rpc("save_project_date", { p_payload: input });
  if (response.error) {
    if (/function .*save_project_date.*does not exist|schema cache/i.test(response.error.message)) throw new Error("A estrutura de datas planejadas não está disponível. Aplique o SQL da Etapa 03.");
    throw new Error(response.error.message);
  }
  return String(response.data);
}

export async function archiveProjectDate(id: string) {
  const response = await supabase.rpc("archive_project_date", { p_date_id: id });
  if (response.error) throw new Error(response.error.message);
}

export async function completeProjectDate(id: string, completed: boolean) {
  const result = await supabase.from("project_dates").update({ completed_at: completed ? new Date().toISOString() : null, status: completed ? "completed" : "scheduled" }).eq("id", id);
  if (result.error) throw new Error(result.error.message);
}

export async function createActivityFromProjectDate(dateId: string) {
  const response = await supabase.rpc("create_activity_from_project_date", { p_date_id: dateId });
  if (response.error) throw new Error(response.error.message);
}

export async function createCalendarEventFromProjectDate(dateId: string) {
  const response = await supabase.rpc("create_calendar_event_from_project_date", { p_date_id: dateId });
  if (response.error) throw new Error(response.error.message);
}
