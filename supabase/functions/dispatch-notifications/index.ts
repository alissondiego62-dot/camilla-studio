import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const headers = { "Content-Type": "application/json" };
const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cronSecret = Deno.env.get("CRON_SECRET") || "";
const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@camillastudio.com";
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
if (vapidPublic && vapidPrivate) webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

type NotificationRow = { id:string;user_id:string;type_code:string;title:string;body:string|null;link:string|null;priority:string;created_at:string };
type Subscription = { id:string;user_id:string;endpoint:string;p256dh:string;auth:string };

Deno.serve(async (request) => {
  if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers });
  if (!vapidPublic || !vapidPrivate) return new Response(JSON.stringify({ error: "Configuração VAPID ausente" }), { status: 503, headers });
  const { data: notifications, error } = await supabase.from("notifications").select("id,user_id,type_code,title,body,link,priority,created_at").is("archived_at", null).is("read_at", null).gte("created_at", new Date(Date.now()-7*86400000).toISOString()).order("created_at").limit(500);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  if (!notifications?.length) return new Response(JSON.stringify({ sent: 0 }), { headers });
  const userIds=[...new Set(notifications.map((item)=>item.user_id))];
  const [{ data: subscriptions }, { data: userRules }, { data: catalog }] = await Promise.all([
    supabase.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth").in("user_id",userIds).eq("enabled",true),
    supabase.from("notification_user_rules").select("user_id,type_code,enabled,push").in("user_id",userIds),
    supabase.from("notification_type_catalog").select("type_code,default_enabled,default_push"),
  ]);
  const ruleMap=new Map((userRules||[]).map((item)=>[`${item.user_id}:${item.type_code}`,item]));
  const catalogMap=new Map((catalog||[]).map((item)=>[item.type_code,item]));
  let sent=0,failed=0,skipped=0;
  for(const notification of notifications as NotificationRow[]){
    const rule=ruleMap.get(`${notification.user_id}:${notification.type_code}`);const fallback=catalogMap.get(notification.type_code);
    if((rule && (!rule.enabled||!rule.push)) || (!rule && (!fallback?.default_enabled||!fallback?.default_push))){skipped++;continue;}
    for(const subscription of (subscriptions||[]).filter((item)=>item.user_id===notification.user_id) as Subscription[]){
      const claimed=await supabase.from("notification_deliveries").insert({user_id:notification.user_id,subscription_id:subscription.id,notification_id:notification.id,notification_type:notification.type_code,delivery_key:`central:${notification.id}`,scheduled_for:new Date().toISOString(),channel:"push",status:"pending",attempted_at:new Date().toISOString()}).select("id").maybeSingle();
      if(claimed.error){skipped++;continue;}
      try{
        await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},JSON.stringify({title:notification.title,body:notification.body||"Há uma novidade no Camilla Studio.",tag:`notification-${notification.id}`,url:notification.link||"/notifications",renotify:notification.priority==="urgent"}),{TTL:3600});
        await supabase.from("notification_deliveries").update({status:"sent",sent_at:new Date().toISOString()}).eq("id",claimed.data?.id);sent++;
      }catch(reason){
        const status=(reason as {statusCode?:number}).statusCode;const message=reason instanceof Error?reason.message:String(reason);
        await supabase.from("notification_deliveries").update({status:"failed",error_message:message}).eq("id",claimed.data?.id);
        if(status===404||status===410)await supabase.from("push_subscriptions").update({enabled:false}).eq("id",subscription.id);failed++;
      }
    }
  }
  return new Response(JSON.stringify({sent,failed,skipped}),{headers});
});
