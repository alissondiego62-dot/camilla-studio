import type { PermissionScope } from "@/app/types/permissions";

export type ProfileRow = {
  id: string; name: string; email: string; camilla_role: string | null; role: string | null; active: boolean;
  last_access_at: string | null; created_at: string | null; blocked_at: string | null; session_revoked_at: string | null;
  permission_profile_id: string | null; profile_name: string | null; profile_code: string | null; team_ids: string[];
};
export type TeamRow = { id: string; name: string; description: string | null; active: boolean; members_count?: number };
export type AssignedProject = {id:string;code:string;name:string};
export type AssignedActivity = {id:string;title:string;due_date:string|null;project_id:string|null};
export type UserAssignmentSummary = { projects: AssignedProject[]; activities: AssignedActivity[] };
export type AssignableProject = AssignedProject;
export type AssignableActivity = AssignedActivity & {responsible_user_id:string|null};
export type UserFormValues = { name: string; email: string; permission_profile_id: string; team_ids: string[] };
export type UserPermissionOverride = {
  id: string; user_id: string; module: string; action: string; allowed: boolean; scope: PermissionScope;
  reason: string | null; expires_at: string | null;
};
