import { supabase } from "@/lib/supabase";

export async function markRecordView(recordId: string, area: "history" | "files" | "agenda" | "comments", module = "projects", recordType = "project") {
  const result = await supabase.rpc("mark_record_view", { p_module: module, p_record_type: recordType, p_record_id: recordId, p_area: area });
  if (result.error && !/function .* does not exist|schema cache/i.test(result.error.message)) throw new Error(result.error.message);
}
