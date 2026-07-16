import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.2";

function env(name:string){return Deno.env.get(name)||""}
function allowedOrigins(){return new Set((env("ALLOWED_ORIGINS")||env("SITE_URL")).split(",").map(value=>value.trim()).filter(Boolean))}
function originAllowed(origin:string){return !origin||allowedOrigins().has(origin)||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)}
function headers(origin:string){const value:Record<string,string>={"Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Vary":"Origin"};if(origin&&originAllowed(origin))value["Access-Control-Allow-Origin"]=origin;return value}
function response(origin:string,body:Record<string,unknown>,status:number){return new Response(JSON.stringify(body),{status,headers:headers(origin)})}
async function hash(value:string){const bytes=new TextEncoder().encode(`${env("AUDIT_HASH_SALT")}:${value.trim().toLowerCase()}`);const digest=await crypto.subtle.digest("SHA-256",bytes);return[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("")}

Deno.serve(async request=>{
  const origin=request.headers.get("origin")||"";
  if(!originAllowed(origin))return response(origin,{error:"Origem não autorizada."},403);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
  if(request.method!=="POST")return response(origin,{error:"Método não permitido."},405);
  const url=env("SUPABASE_URL"),service=env("SUPABASE_SERVICE_ROLE_KEY"),salt=env("AUDIT_HASH_SALT");
  if(!url||!service||!salt)return response(origin,{ok:false},503);
  let body:{event_type?:string;email?:string;reason?:string};
  try{body=await request.json()}catch{return response(origin,{error:"Dados inválidos."},400)}
  if(body.event_type!=="login_failure")return response(origin,{error:"Evento inválido."},400);
  const client=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const forwarded=request.headers.get("x-forwarded-for")?.split(",")[0]||"unknown";
  const sourceHash=await hash(forwarded);
  const recent=await client.from("security_audit_events").select("id",{count:"exact",head:true}).eq("event_type","login_failure").eq("source_hash",sourceHash).gte("created_at",new Date(Date.now()-60_000).toISOString());
  if(!recent.error&&(recent.count||0)>=20)return response(origin,{ok:true},202);
  const result=await client.from("security_audit_events").insert({
    event_type:"login_failure",
    email_hash:await hash(body.email||"unknown"),
    source_hash:sourceHash,
    user_agent:(request.headers.get("user-agent")||"").slice(0,300),
    success:false,
    metadata:{reason_code:(body.reason||"unknown").slice(0,120)},
  });
  if(result.error){console.error("auth-audit",result.error);return response(origin,{ok:false},503)}
  return response(origin,{ok:true},202);
});
