import { supabase } from "@/lib/supabase";
import { ensureSupabase } from "@/app/services/supabase/base-service";
import type { PermissionProfileSummary } from "@/app/types/permissions";
import type { ProfileRow, TeamRow, UserAssignmentSummary, UserFormValues, UserPermissionOverride } from "./types";

function message(error: { message: string } | null) { if (error) throw new Error(error.message); }

export async function listProfiles(): Promise<ProfileRow[]> {
  if (!ensureSupabase()) return [];
  const result = await supabase.from("profiles").select("id,name,email,camilla_role,role,active,last_access_at,created_at,blocked_at,session_revoked_at,permission_profile_id").order("created_at", { ascending: false });
  if (result.error) {
    const fallback = await supabase.from("profiles").select("id,name,email,role,active,created_at").order("created_at", { ascending: false });
    message(fallback.error);
    return (fallback.data ?? []).map((row) => ({ ...row, camilla_role: null, last_access_at: null, blocked_at: null, session_revoked_at: null, permission_profile_id: null, profile_name: null, profile_code: null, team_ids: [] })) as ProfileRow[];
  }
  const profiles = (result.data ?? []) as Omit<ProfileRow,"profile_name"|"profile_code"|"team_ids">[];
  const [permissionProfiles, memberships] = await Promise.all([
    supabase.from("permission_profiles").select("id,code,name"),
    supabase.from("team_members").select("user_id,team_id"),
  ]);
  const profileMap = new Map((permissionProfiles.data ?? []).map((item) => [String(item.id), item]));
  const teamMap = new Map<string,string[]>();
  for (const item of memberships.data ?? []) { const ids = teamMap.get(String(item.user_id)) ?? []; ids.push(String(item.team_id)); teamMap.set(String(item.user_id), ids); }
  return profiles.map((profile) => {
    const linked = profile.permission_profile_id ? profileMap.get(profile.permission_profile_id) : null;
    return { ...profile, profile_name: linked?.name ?? null, profile_code: linked?.code ?? null, team_ids: teamMap.get(profile.id) ?? [] };
  });
}

export async function listPermissionProfiles(): Promise<PermissionProfileSummary[]> {
  if (!ensureSupabase()) return [];
  const result = await supabase.from("permission_profiles").select("id,code,name,description,system,active").eq("active", true).order("position");
  if (result.error) return [];
  return (result.data ?? []) as PermissionProfileSummary[];
}

export async function listTeams(): Promise<TeamRow[]> {
  if (!ensureSupabase()) return [];
  const result = await supabase.from("teams").select("id,name,description,active").order("name");
  if (result.error) return [];
  const members = await supabase.from("team_members").select("team_id");
  const counts = new Map<string,number>();
  for (const row of members.data ?? []) counts.set(String(row.team_id), (counts.get(String(row.team_id)) ?? 0) + 1);
  return (result.data ?? []).map((team) => ({ ...team, members_count: counts.get(String(team.id)) ?? 0 })) as TeamRow[];
}

async function invokeAdmin(action: string, payload: Record<string, unknown>) {
  const response = await supabase.functions.invoke("admin-manage-user", { body: { action, ...payload } });
  if (response.error) throw new Error(response.error.message);
  if (response.data?.error) throw new Error(String(response.data.error));
  return response.data;
}

export async function inviteUser(values: UserFormValues) { return invokeAdmin("invite", values); }
export async function updateUser(userId: string, values: UserFormValues) { return invokeAdmin("update", { user_id: userId, ...values }); }
export async function setUserStatus(userId: string, action: "activate"|"deactivate"|"block"|"unblock") { return invokeAdmin(action, { user_id: userId }); }
export async function requestPasswordReset(userId: string) { return invokeAdmin("reset_password", { user_id: userId }); }
export async function revokeUserSessions(userId: string) { return invokeAdmin("revoke_sessions", { user_id: userId }); }

export async function loadUserAssignments(userId: string): Promise<UserAssignmentSummary> {
  if (!ensureSupabase()) return { projects: [], activities: [] };
  const memberships = await supabase.from("project_members").select("project_id").eq("user_id", userId);
  const projectIds = (memberships.data ?? []).map((row) => String(row.project_id));
  const projects = projectIds.length ? await supabase.from("projects").select("id,code,name").in("id", projectIds).order("name") : { data: [], error: null };
  const activities = await supabase.from("project_activities").select("id,title,due_date,project_id").eq("responsible_user_id", userId).order("due_date", { ascending: true });
  if (projects.error) throw new Error(projects.error.message); if (activities.error) throw new Error(activities.error.message);
  return { projects: (projects.data ?? []) as UserAssignmentSummary["projects"], activities: (activities.data ?? []) as UserAssignmentSummary["activities"] };
}

export async function saveTeam(team: {id?:string;name:string;description:string;active:boolean}) {
  const payload = { name: team.name.trim(), description: team.description.trim() || null, active: team.active };
  const result = team.id ? await supabase.from("teams").update(payload).eq("id", team.id) : await supabase.from("teams").insert(payload);
  message(result.error);
}

export async function listAssignableProjects(): Promise<Array<{id:string;code:string;name:string}>> {
  if (!ensureSupabase()) return [];
  const result = await supabase.from("projects").select("id,code,name").order("name");
  message(result.error);
  return (result.data ?? []) as Array<{id:string;code:string;name:string}>;
}

export async function listAssignableActivities(): Promise<Array<{id:string;title:string;due_date:string|null;project_id:string|null;responsible_user_id:string|null}>> {
  if (!ensureSupabase()) return [];
  const result = await supabase.from("project_activities").select("id,title,due_date,project_id,responsible_user_id").order("title");
  message(result.error);
  return (result.data ?? []) as Array<{id:string;title:string;due_date:string|null;project_id:string|null;responsible_user_id:string|null}>;
}

export async function assignProjectToUser(userId:string,projectId:string) {
  const result=await supabase.from("project_members").upsert({user_id:userId,project_id:projectId,member_role:"collaborator"},{onConflict:"project_id,user_id"});
  message(result.error);
}
export async function removeProjectFromUser(userId:string,projectId:string) {
  const result=await supabase.from("project_members").delete().eq("user_id",userId).eq("project_id",projectId);
  message(result.error);
}
export async function assignActivityToUser(userId:string,activityId:string) {
  const result=await supabase.from("project_activities").update({responsible_user_id:userId,updated_at:new Date().toISOString()}).eq("id",activityId);
  message(result.error);
}
export async function removeActivityFromUser(userId:string,activityId:string) {
  const result=await supabase.from("project_activities").update({responsible_user_id:null,updated_at:new Date().toISOString()}).eq("id",activityId).eq("responsible_user_id",userId);
  message(result.error);
}

export async function listUserOverrides(userId:string): Promise<UserPermissionOverride[]> {
  if(!ensureSupabase())return [];
  const result=await supabase.from("user_permission_overrides").select("id,user_id,module,action,allowed,scope,reason,expires_at").eq("user_id",userId).order("module").order("action");
  message(result.error);
  return (result.data ?? []) as UserPermissionOverride[];
}
export async function saveUserOverride(value:{user_id:string;module:string;action:string;allowed:boolean;scope:string;reason:string|null;expires_at:string|null}) {
  const result=await supabase.from("user_permission_overrides").upsert({...value,updated_at:new Date().toISOString()},{onConflict:"user_id,module,action"});
  message(result.error);
}
export async function deleteUserOverride(userId:string,module:string,action:string) {
  const result=await supabase.from("user_permission_overrides").delete().eq("user_id",userId).eq("module",module).eq("action",action);
  message(result.error);
}
