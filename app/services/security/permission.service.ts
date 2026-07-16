import { supabase } from "@/lib/supabase";
import { legacyProfileMap } from "@/app/config/default-permission-matrix";
import type { AccessContext, EffectivePermission, PermissionAction, PermissionModule, PermissionScope } from "@/app/types/permissions";
import { permissionKey, scopeRank } from "@/app/types/permissions";

function fallbackPermissions(role?: string | null): EffectivePermission[] {
  const code = legacyProfileMap[role ?? "viewer"] ?? "viewer";
  const all = (module: PermissionModule, actions: PermissionAction[], scope: PermissionScope = "all") => actions.map((action) => ({ module, action, allowed: true, scope }));
  if (code === "administrator" || code === "owner") {
    const modules: PermissionModule[] = ["dashboard","projects","kanban","activities","agenda","clients","files","reports","finance_professional","users","teams","settings","checklists","notifications","history","comments","integrations","versions","security"];
    const actions: PermissionAction[] = ["view","create","edit","delete","archive","reactivate","approve","export","change_status","change_stage","change_deadline","add_file","remove_file","view_values","settle_finance","cancel_entry","manage_users","manage_settings","download","view_versions","view_internal","create_internal"];
    const permissions = modules.flatMap((module) => all(module, actions));
    if (code === "owner") permissions.push(...all("finance_personal", actions));
    return permissions;
  }
  if (code === "manager") return [
    ...all("dashboard", ["view"]), ...all("projects", ["view","create","edit","archive","reactivate","approve","export","change_status","change_stage","change_deadline"]),
    ...all("kanban", ["view","change_status","change_stage","change_deadline"]), ...all("activities", ["view","create","edit","delete","change_status","change_deadline"]),
    ...all("agenda", ["view","create","edit","delete","export"]), ...all("clients", ["view","create","edit","archive","reactivate","export"]),
    ...all("files", ["view","add_file","remove_file","export"]), ...all("reports", ["view","export"]), ...all("checklists", ["view","create","edit","approve"]),
  ];
  if (code === "finance") return [...all("dashboard", ["view"]), ...all("finance_professional", ["view","create","edit","archive","view_values","settle_finance","cancel_entry","export"]), ...all("clients", ["view"], "all"), ...all("projects", ["view"], "all")];
  const assigned: PermissionScope = "assigned";
  const operational = [
    ...all("dashboard", ["view"]), ...all("projects", ["view"], assigned), ...all("kanban", ["view"], assigned),
    ...all("activities", code === "viewer" ? ["view"] : ["view","edit","change_status"], assigned), ...all("agenda", ["view"], assigned),
    ...all("files", code === "viewer" ? ["view"] : ["view","add_file","download","view_versions"], assigned), ...all("comments", code === "viewer" ? ["view"] : ["view","create","edit"], assigned), ...all("history", ["view"], assigned), ...all("notifications", ["view","edit"], "own"), ...all("checklists", code === "viewer" ? ["view"] : ["view","edit"], assigned),
  ];
  return operational;
}

export async function loadAccessContext(role?: string | null): Promise<AccessContext> {
  const response = await supabase.rpc("current_access_context");
  if (!response.error && response.data) {
    const raw = response.data as Record<string, unknown>;
    return {
      valid: raw.valid !== false,
      profileCode: String(raw.profile_code ?? "viewer"),
      profileName: String(raw.profile_name ?? "Somente leitura"),
      permissions: Array.isArray(raw.permissions) ? raw.permissions as EffectivePermission[] : [],
      sessionRevokedAt: typeof raw.session_revoked_at === "string" ? raw.session_revoked_at : null,
      blockedAt: typeof raw.blocked_at === "string" ? raw.blocked_at : null,
    };
  }
  const code = legacyProfileMap[role ?? "viewer"] ?? "viewer";
  return { valid: true, profileCode: code, profileName: code, permissions: fallbackPermissions(role), sessionRevokedAt: null, blockedAt: null };
}

export function buildPermissionMap(permissions: EffectivePermission[]) {
  return new Map(permissions.map((item) => [permissionKey(item.module, item.action), item]));
}

export function permissionAllowed(permissions: EffectivePermission[], module: string, action: string, minimumScope: PermissionScope = "own") {
  const item = buildPermissionMap(permissions).get(permissionKey(module, action));
  return Boolean(item?.allowed && scopeRank[item.scope] >= scopeRank[minimumScope]);
}

export async function recordSecurityEvent(eventType: string, metadata: Record<string, unknown> = {}) {
  const result = await supabase.rpc("record_security_event", { p_event_type: eventType, p_metadata: metadata });
  if (result.error && !/function .* does not exist/i.test(result.error.message)) throw new Error(result.error.message);
}
