import { supabase } from "@/lib/supabase";
import { ensureSupabase, assertNoError } from "@/app/services/supabase/base-service";
import type { NotificationCatalogItem, NotificationPreference, NotificationProfile, NotificationProfileRule, NotificationTypeRule, StudioNotification } from "./types";

export async function listNotifications(module = "", unreadOnly = false, limit = 100): Promise<StudioNotification[]> {
  if (!ensureSupabase()) return [];
  let query = supabase.from("notifications").select("*").is("archived_at", null).order("created_at", { ascending: false }).limit(limit);
  if (module) query = query.eq("module", module);
  if (unreadOnly) query = query.is("read_at", null);
  const result = await query;
  if (result.error && /notifications.*does not exist|schema cache/i.test(result.error.message)) return [];
  assertNoError(result);
  return (result.data ?? []) as StudioNotification[];
}

export async function unreadNotificationCount() {
  if (!ensureSupabase()) return 0;
  const result = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null).is("archived_at", null);
  if (result.error && /notifications.*does not exist|schema cache/i.test(result.error.message)) return 0;
  assertNoError(result);
  return result.count ?? 0;
}

export async function markNotificationRead(id: string) {
  const result = await supabase.rpc("mark_notification_read", { p_notification_id: id });
  if (result.error) throw new Error(result.error.message);
}

export async function markAllNotificationsRead(module?: string | null) {
  const result = await supabase.rpc("mark_all_notifications_read", { p_module: module || null });
  if (result.error) throw new Error(result.error.message);
}

export async function archiveNotification(id: string) {
  const result = await supabase.from("notifications").update({ archived_at: new Date().toISOString() }).eq("id", id);
  assertNoError(result);
}

export async function loadNotificationPreferences(): Promise<{ preference: NotificationPreference | null; rules: NotificationTypeRule[] }> {
  if (!ensureSupabase()) return { preference: null, rules: [] };
  const [preference, rules] = await Promise.all([
    supabase.from("notification_preferences").select("user_id,daily_summary_enabled,daily_summary_time,event_reminder_enabled,reminder_minutes,timezone").maybeSingle(),
    supabase.rpc("current_notification_rules"),
  ]);
  if (preference.error && !/0 rows|schema cache|does not exist/i.test(preference.error.message)) throw new Error(preference.error.message);
  if (rules.error && !/function .* does not exist|schema cache/i.test(rules.error.message)) throw new Error(rules.error.message);
  return { preference: (preference.data ?? null) as NotificationPreference | null, rules: (rules.data ?? []) as NotificationTypeRule[] };
}

export async function saveNotificationPreferences(input: Partial<NotificationPreference>, rules: NotificationTypeRule[]) {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error("Sessão inválida.");
  const preference = await supabase.from("notification_preferences").upsert({
    user_id: userId,
    daily_summary_enabled: input.daily_summary_enabled ?? true,
    daily_summary_time: input.daily_summary_time ?? "08:00:00",
    event_reminder_enabled: input.event_reminder_enabled ?? true,
    reminder_minutes: input.reminder_minutes ?? 60,
    timezone: input.timezone ?? "America/Boa_Vista",
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  assertNoError(preference);
  const result = await supabase.rpc("save_current_notification_rules", { p_rules: rules });
  if (result.error) throw new Error(result.error.message);
}

export function subscribeToNotifications(userId: string, onChange: () => void) {
  return supabase.channel(`notifications:${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, onChange)
    .subscribe();
}

export async function loadProfileNotificationConfiguration(): Promise<{ profiles: NotificationProfile[]; catalog: NotificationCatalogItem[]; rules: NotificationProfileRule[] }> {
  if (!ensureSupabase()) return { profiles: [], catalog: [], rules: [] };
  const [profiles, catalog, rules] = await Promise.all([
    supabase.from("permission_profiles").select("id,code,name").eq("active", true).is("archived_at", null).order("position"),
    supabase.from("notification_type_catalog").select("type_code,label,module,default_enabled,default_in_app,default_push,default_lead_minutes").eq("active", true).order("position"),
    supabase.from("notification_profile_rules").select("permission_profile_id,type_code,enabled,in_app,push,lead_minutes"),
  ]);
  assertNoError(profiles); assertNoError(catalog); assertNoError(rules);
  return { profiles: (profiles.data ?? []) as NotificationProfile[], catalog: (catalog.data ?? []) as NotificationCatalogItem[], rules: (rules.data ?? []) as NotificationProfileRule[] };
}

export async function saveProfileNotificationRules(profileId: string, rules: NotificationTypeRule[]) {
  const payload = rules.map((rule) => ({ permission_profile_id: profileId, type_code: rule.type_code, enabled: rule.enabled, in_app: rule.in_app, push: rule.push, lead_minutes: rule.lead_minutes, updated_at: new Date().toISOString() }));
  const result = await supabase.from("notification_profile_rules").upsert(payload, { onConflict: "permission_profile_id,type_code" });
  assertNoError(result);
}
