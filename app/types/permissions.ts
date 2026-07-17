export const permissionScopes = ["none", "own", "assigned", "team", "all"] as const;
export type PermissionScope = (typeof permissionScopes)[number];

export const permissionModules = [
  "dashboard", "projects", "kanban", "activities", "agenda", "clients", "files", "reports",
  "finance_professional", "finance_personal", "users", "teams", "settings", "checklists",
  "notifications", "history", "comments", "integrations", "versions", "security",
] as const;
export type PermissionModule = (typeof permissionModules)[number];

export const permissionActions = [
  "view", "create", "edit", "delete", "archive", "reactivate", "approve", "export", "view_team", "view_financial",
  "change_status", "change_stage", "change_deadline", "add_file", "remove_file", "view_values",
  "settle_finance", "cancel_entry", "view_history", "view_productivity", "connect_drive", "disconnect_drive", "test_drive", "upload_drive", "share_drive", "revoke_drive_share", "refresh_drive_metadata", "view_consolidated", "manage_accounts", "manage_cards", "manage_categories", "manage_templates", "manage_suppliers", "manage_cost_centers", "manage_recurrence", "manage_installments", "manage_transfers", "approve_finance", "change_environment", "view_audit", "export_values", "manage_users", "manage_settings", "download", "view_versions", "view_internal", "create_internal", "view_financial", "manage_notes", "manage_contacts",
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
