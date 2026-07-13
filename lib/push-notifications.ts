import { supabase } from "./supabase";

export type PushState = "unsupported" | "blocked" | "disabled" | "enabled";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function supportsPushNotifications() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export async function registerAppServiceWorker() {
  if (!supportsPushNotifications()) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function getPushState(): Promise<PushState> {
  if (!supportsPushNotifications()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const registration = await registerAppServiceWorker();
  if (!registration) return "unsupported";
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? "enabled" : "disabled";
}

export async function enablePushNotifications(userId: string) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("A chave pública VAPID não foi configurada.");
  if (!supportsPushNotifications()) throw new Error("Este navegador não oferece suporte a notificações push.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("A permissão de notificações não foi concedida.");

  const registration = await registerAppServiceWorker();
  if (!registration) throw new Error("Não foi possível registrar o aplicativo no dispositivo.");
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  const json = subscription.toJSON();
  const keys = json.keys;
  if (!json.endpoint || !keys?.p256dh || !keys.auth) throw new Error("A assinatura do dispositivo está incompleta.");

  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    device_name: `${navigator.platform || "Dispositivo"} · ${navigator.userAgent.includes("iPhone") ? "iPhone" : "Navegador"}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Boa_Vista",
    enabled: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) throw error;
  return subscription;
}

export async function disablePushNotifications() {
  if (!supportsPushNotifications()) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  const { error } = await supabase.from("push_subscriptions").update({ enabled: false, updated_at: new Date().toISOString() }).eq("endpoint", endpoint);
  if (error) throw error;
  await subscription.unsubscribe();
}
