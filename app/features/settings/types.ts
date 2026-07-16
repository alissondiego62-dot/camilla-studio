import type { PermissionScope } from "@/app/types/permissions";
export type SystemSettingRow={key:string;value:unknown;description:string|null;updated_at:string|null};
export type WorkflowKind="project_stages"|"project_statuses"|"activity_statuses";
export type WorkflowRow={id:string;code:string;name:string;color:string|null;position:number;active:boolean;final:boolean;archived_at:string|null};
export type CategoryRow={id:string;module:string;code:string;name:string;color:string|null;active:boolean;position:number};
export type ProfilePermissionRow={profile_id:string;module:string;action:string;allowed:boolean;scope:PermissionScope};
export type AuditRow={id:string|number;event_type:string;actor_user_id:string|null;target_type:string|null;target_id:string|null;metadata:Record<string,unknown>;created_at:string;actor_name?:string|null};
export type VersionRow={id:string;version:string;released_at:string;notes:string;environment:string;created_by:string|null};
