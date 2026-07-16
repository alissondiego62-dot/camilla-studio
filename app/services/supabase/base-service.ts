import { isSupabaseConfigured } from "@/lib/supabase";
export function ensureSupabase() {
  if (!isSupabaseConfigured) return false;
  return true;
}
export function assertNoError(result: { error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
}
