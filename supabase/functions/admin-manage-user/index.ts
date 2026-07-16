import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.2";

type Payload = { action?: string; user_id?: string; name?: string; email?: string; permission_profile_id?: string; team_ids?: string[] };
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function env(name:string){return Deno.env.get(name)||""}
function allowedOrigins(){return new Set((env("ALLOWED_ORIGINS")||env("SITE_URL")).split(",").map(v=>v.trim()).filter(Boolean))}
function originAllowed(origin:string){return !origin||allowedOrigins().has(origin)||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)}
function headers(origin:string){const h:Record<string,string>={"Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Vary":"Origin"};if(originAllowed(origin)&&origin)h["Access-Control-Allow-Origin"]=origin;return h}
function json(origin:string,body:Record<string,unknown>,status=200){return new Response(JSON.stringify(body),{status,headers:headers(origin)})}
function legacyRole(code:string){if(code==="administrator"||code==="owner")return"admin";if(code==="manager")return"manager";if(["architect","collaborator","assistant"].includes(code))return"production";return"viewer"}

Deno.serve(async(request)=>{
  const origin=request.headers.get("origin")||"";
  if(!originAllowed(origin))return json(origin,{error:"Origem não autorizada."},403);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
  if(request.method!=="POST")return json(origin,{error:"Método não permitido."},405);
  const authorization=request.headers.get("authorization")||"";
  if(!authorization.startsWith("Bearer "))return json(origin,{error:"Sessão ausente."},401);
  const url=env("SUPABASE_URL"),anon=env("SUPABASE_ANON_KEY"),service=env("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!anon||!service)return json(origin,{error:"Serviço administrativo não configurado."},503);
  const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:authData,error:authError}=await userClient.auth.getUser();
  if(authError||!authData.user)return json(origin,{error:"Sessão expirada."},401);
  const permission=await userClient.rpc("has_permission",{p_module:"users",p_action:"manage_users",p_min_scope:"own"});
  if(permission.error||permission.data!==true)return json(origin,{error:"Você não possui permissão para gerenciar usuários."},403);
  let payload:Payload;try{payload=await request.json()}catch{return json(origin,{error:"Dados inválidos."},400)}
  const action=String(payload.action||"invite");const targetId=String(payload.user_id||"");
  const audit=async(event_type:string,target_id:string|null,metadata:Record<string,unknown>)=>{await admin.from("security_audit_events").insert({event_type,actor_user_id:authData.user.id,target_type:"profile",target_id,success:true,metadata})};
  try{
    if(action==="invite"){
      const name=String(payload.name||"").trim(),email=String(payload.email||"").trim().toLowerCase(),profileId=String(payload.permission_profile_id||"");
      if(name.length<2||name.length>120||!emailPattern.test(email)||!profileId)return json(origin,{error:"Nome, e-mail e perfil são obrigatórios."},400);
      const profile=await admin.from("permission_profiles").select("code").eq("id",profileId).single();if(profile.error)return json(origin,{error:"Perfil inválido."},400);
      const redirect=(env("SITE_URL")||origin||undefined)?.replace(/\/$/,"")+"/";
      const invitation=await admin.auth.admin.inviteUserByEmail(email,{data:{name},redirectTo:redirect});
      if(invitation.error||!invitation.data.user){const duplicate=/already|registered|exists/i.test(invitation.error?.message||"");return json(origin,{error:duplicate?"Este e-mail já possui cadastro.":"Não foi possível enviar o convite."},duplicate?409:400)}
      const userId=invitation.data.user.id;
      const saved=await admin.from("profiles").upsert({id:userId,name,email,role:legacyRole(String(profile.data.code)),active:true,permission_profile_id:profileId,blocked_at:null,archived_at:null},{onConflict:"id"});
      if(saved.error){await admin.auth.admin.deleteUser(userId);throw saved.error}
      if(payload.team_ids?.length){const teams=await admin.from("team_members").insert(payload.team_ids.map(team_id=>({team_id,user_id:userId,created_by:authData.user.id})));if(teams.error){await admin.from("profiles").delete().eq("id",userId);await admin.auth.admin.deleteUser(userId);throw teams.error}}
      await audit("user_invited",userId,{email_domain:email.split("@")[1],permission_profile_id:profileId,team_count:payload.team_ids?.length||0});
      return json(origin,{ok:true,message:"Convite enviado."},201);
    }
    if(!targetId)return json(origin,{error:"Usuário não informado."},400);
    const target=await admin.from("profiles").select("id,email,name,role,permission_profile_id,active,blocked_at,session_revoked_at").eq("id",targetId).single();if(target.error)return json(origin,{error:"Usuário não encontrado."},404);
    if(action==="update"){
      const name=String(payload.name||"").trim(),email=String(payload.email||"").trim().toLowerCase(),profileId=String(payload.permission_profile_id||"");
      if(name.length<2||!emailPattern.test(email)||!profileId)return json(origin,{error:"Dados do usuário inválidos."},400);
      const profile=await admin.from("permission_profiles").select("code").eq("id",profileId).single();if(profile.error)return json(origin,{error:"Perfil inválido."},400);
      const previousTeams=await admin.from("team_members").select("team_id").eq("user_id",targetId);if(previousTeams.error)throw previousTeams.error;
      const authUpdate=await admin.auth.admin.updateUserById(targetId,{email,user_metadata:{name}});if(authUpdate.error)throw authUpdate.error;
      const rollbackProfile=async()=>{await admin.auth.admin.updateUserById(targetId,{email:String(target.data.email),user_metadata:{name:String(target.data.name||"")}});await admin.from("profiles").update({name:target.data.name,email:target.data.email,role:target.data.role,permission_profile_id:target.data.permission_profile_id,updated_at:new Date().toISOString()}).eq("id",targetId);await admin.from("team_members").delete().eq("user_id",targetId);if(previousTeams.data?.length)await admin.from("team_members").insert(previousTeams.data.map(item=>({team_id:item.team_id,user_id:targetId,created_by:authData.user.id})))};
      const saved=await admin.from("profiles").update({name,email,role:legacyRole(String(profile.data.code)),permission_profile_id:profileId,updated_at:new Date().toISOString()}).eq("id",targetId);if(saved.error){await rollbackProfile();throw saved.error}
      const removed=await admin.from("team_members").delete().eq("user_id",targetId);if(removed.error){await rollbackProfile();throw removed.error}if(payload.team_ids?.length){const teams=await admin.from("team_members").insert(payload.team_ids.map(team_id=>({team_id,user_id:targetId,created_by:authData.user.id})));if(teams.error){await rollbackProfile();throw teams.error}}
      await audit("user_updated",targetId,{permission_profile_id:profileId,team_count:payload.team_ids?.length||0});return json(origin,{ok:true});
    }
    if(action==="activate"||action==="deactivate"){
      const active=action==="activate";const result=await admin.from("profiles").update({active,archived_at:active?null:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",targetId);if(result.error)throw result.error;await audit(`user_${action}d`,targetId,{});return json(origin,{ok:true});
    }
    if(action==="block"||action==="unblock"){
      const blocked=action==="block";const wasBlocked=Boolean(target.data.blocked_at);const authResult=await admin.auth.admin.updateUserById(targetId,{ban_duration:blocked?"876000h":"none"});if(authResult.error)throw authResult.error;
      const result=await admin.from("profiles").update({blocked_at:blocked?new Date().toISOString():null,blocked_reason:blocked?"Bloqueio administrativo":null,session_revoked_at:blocked?new Date().toISOString():target.data.session_revoked_at,updated_at:new Date().toISOString()}).eq("id",targetId);if(result.error){await admin.auth.admin.updateUserById(targetId,{ban_duration:wasBlocked?"876000h":"none"});throw result.error}await audit(`user_${action}ed`,targetId,{});return json(origin,{ok:true});
    }
    if(action==="revoke_sessions"){
      const result=await admin.from("profiles").update({session_revoked_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",targetId);if(result.error)throw result.error;await audit("user_sessions_revoked",targetId,{});return json(origin,{ok:true});
    }
    if(action==="reset_password"){
      const redirect=(env("SITE_URL")||origin||undefined)?.replace(/\/$/,"")+"/";const reset=await admin.auth.resetPasswordForEmail(String(target.data.email),{redirectTo:redirect});if(reset.error)throw reset.error;await audit("password_reset_requested",targetId,{});return json(origin,{ok:true});
    }
    return json(origin,{error:"Ação administrativa inválida."},400);
  }catch(error){console.error("admin-manage-user",action,error);return json(origin,{error:error instanceof Error?error.message:"Falha administrativa inesperada."},500)}
});
