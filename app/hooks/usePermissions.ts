"use client";
import { useCallback } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import type { PermissionScope } from "@/app/types/permissions";
import { permissionAllowed } from "@/app/services/security/permission.service";

export function usePermissions() {
  const { access } = useAuth();
  const can = useCallback((module: string, action: string, scope: PermissionScope = "own") => permissionAllowed(access.permissions, module, action, scope), [access.permissions]);
  const scopeFor = useCallback((module: string, action: string): PermissionScope => access.permissions.find((item) => item.module === module && item.action === action && item.allowed)?.scope ?? "none", [access.permissions]);
  return { can, scopeFor, access };
}
