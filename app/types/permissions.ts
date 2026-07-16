export const permissionScopes = ["none", "own", "assigned", "team", "all"] as const;
export type PermissionScope = (typeof permissionScopes)[number];

export const permissionModules = [
  "dashboard", "projects", "kanban", "activities", "agenda", "clients", "files", "reports",
  "finance_professional", "finance_personal", "users", "teams", "settings", "checklists",
  "notifications", "integrations", "versions", "security",
] as const;
export type PermissionModule = (typeof permissionModules)[number];

export const permissionActions = [
  "view", "create", "edit", "delete", "archive", "reactivate", "approve", "export",
  "change_status", "change_stage", "change_deadline", "add_file", "remove_file", "view_values",
  "settle_finance", "cancel_entry", "manage_users", "manage_settings",
] as const;
export type PermissionAction = (typeof permissionActions)[number];

export type EffectivePermission = {
  module: PermissionModule | string;
  action: PermissionAction | string;
  allowed: boolean;
  scope: PermissionScope;
};

export type PermissionProfileSummary = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  system: boolean;
  active: boolean;
};

export type AccessContext = {
  valid: boolean;
  profileCode: string;
  profileName: string;
  permissions: EffectivePermission[];
  sessionRevokedAt: string | null;
  blockedAt: string | null;
};

export const scopeRank: Record<PermissionScope, number> = { none: 0, own: 1, assigned: 2, team: 3, all: 4 };

export function permissionKey(module: string, action: string) {
  return `${module}:${action}`;
}
