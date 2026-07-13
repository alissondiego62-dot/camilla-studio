import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = { "Content-Type": "application/json" };
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@camillastudio.com";
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

type Subscription = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; timezone: string };
type Preference = { user_id: string; daily_summary_enabled: boolean; daily_summary_time: string; event_reminder_enabled: boolean; reminder_minutes: number; timezone: string };
type CalendarEvent = { id: string; title: string; starts_at: string; location: string | null; project_id: string | null; completed_at: string | null };

function partsInZone(date: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: string) => values.find((part) => part.type === type)?.value || "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}`, hour: Number(get("hour")), minute: Number(get("minute")) };
}

function formatTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

async function claimDelivery(subscription: Subscription, type: "daily_summary" | "event_reminder", key: string, scheduledFor: string, eventId?: string | null) {
  const { error } = await supabase.from("notification_deliveries").insert({ user_id: subscription.user_id, subscription_id: subscription.id, event_id: eventId || null, notification_type: type, delivery_key: key, scheduled_for: scheduledFor });
  return !error;
}

async function releaseDelivery(subscriptionId: string, type: "daily_summary" | "event_reminder", key: string) {
  await supabase.from("notification_deliveries").delete().eq("subscription_id", subscriptionId).eq("notification_type", type).eq("delivery_key", key);
}

async function send(subscription: Subscription, payload: Record<string, unknown>) {
  try {
    await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(payload), { TTL: 3600 });
    return true;
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) await supabase.from("push_subscriptions").update({ enabled: false }).eq("id", subscription.id);
    console.error("push failed", subscription.id, error);
    return false;
  }
}

Deno.serve(async () => {
  const now = new Date();
  const { data: subscriptions, error: subscriptionError } = await supabase.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth,timezone").eq("enabled", true);
  if (subscriptionError) return new Response(JSON.stringify({ error: subscriptionError.message }), { status: 500, headers: corsHeaders });
  if (!subscriptions?.length) return new Response(JSON.stringify({ sent: 0, message: "No subscriptions" }), { headers: corsHeaders });

  const userIds = [...new Set(subscriptions.map((item) => item.user_id))];
  const { data: preferences } = await supabase.from("notification_preferences").select("*").in("user_id", userIds);
  const prefMap = new Map<string, Preference>((preferences || []).map((item) => [item.user_id, item as Preference]));

  const windowStart = new Date(now.getTime() + 9 * 60_000).toISOString();
  const windowEnd = new Date(now.getTime() + 11 * 60_000).toISOString();
  const { data: reminderEvents } = await supabase.from("calendar_events").select("id,title,starts_at,location,project_id,completed_at").is("completed_at", null).gte("starts_at", windowStart).lt("starts_at", windowEnd).order("starts_at");

  let sent = 0;
  for (const subscription of subscriptions as Subscription[]) {
    const preference = prefMap.get(subscription.user_id) || { user_id: subscription.user_id, daily_summary_enabled: true, daily_summary_time: "08:00:00", event_reminder_enabled: true, reminder_minutes: 10, timezone: subscription.timezone || "America/Boa_Vista" };
    const zone = preference.timezone || subscription.timezone || "America/Boa_Vista";
    const local = partsInZone(now, zone);

    if (preference.event_reminder_enabled) {
      for (const event of (reminderEvents || []) as CalendarEvent[]) {
        const key = `${event.id}:${event.starts_at}`;
        if (!await claimDelivery(subscription, "event_reminder", key, event.starts_at, event.id)) continue;
        const ok = await send(subscription, {
          title: "Compromisso em 10 minutos",
          body: `${event.title} · ${formatTime(event.starts_at, zone)}${event.location ? ` · ${event.location}` : ""}`,
          tag: `event-${event.id}`,
          eventId: event.id,
          url: `/?view=agenda&event=${event.id}`,
          renotify: true,
        });
        if (ok) sent++; else await releaseDelivery(subscription.id, "event_reminder", key);
      }
    }

    const configured = String(preference.daily_summary_time || "08:00").slice(0, 5);
    if (preference.daily_summary_enabled && local.time === configured) {
      const startUtc = new Date(now.getTime() - (local.hour * 60 + local.minute) * 60_000);
      const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60_000);
      const { data: todayEvents } = await supabase.from("calendar_events").select("id,title,starts_at,location,project_id,completed_at").is("completed_at", null).gte("starts_at", startUtc.toISOString()).lt("starts_at", endUtc.toISOString()).order("starts_at");
      const key = local.date;
      if (await claimDelivery(subscription, "daily_summary", key, now.toISOString(), null)) {
        const events = (todayEvents || []) as CalendarEvent[];
        const preview = events.slice(0, 4).map((event) => `${formatTime(event.starts_at, zone)} — ${event.title}`).join("\n");
        const body = events.length ? `Você possui ${events.length} compromisso${events.length === 1 ? "" : "s"} hoje.\n${preview}${events.length > 4 ? `\n+${events.length - 4} compromisso(s)` : ""}` : "Nenhum compromisso pendente para hoje.";
        const ok = await send(subscription, { title: "Agenda de hoje", body, tag: `daily-${local.date}`, url: "/?view=agenda", badgeCount: events.length });
        if (ok) sent++; else await releaseDelivery(subscription.id, "daily_summary", key);
      }
    }
  }
  return new Response(JSON.stringify({ sent, subscriptions: subscriptions.length }), { headers: corsHeaders });
});
