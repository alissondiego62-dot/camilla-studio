"use client";
import type { ReactNode } from "react";
import { usePermissions } from "@/app/hooks/usePermissions";
import type { PermissionScope } from "@/app/types/permissions";

export function PermissionGate({ module, action, scope = "own", fallback = null, children }: { module: string; action: string; scope?: PermissionScope; fallback?: ReactNode; children: ReactNode }) {
  const { can } = usePermissions();
  return can(module, action, scope) ? children : fallback;
}

export function AccessDenied({ message = "Seu perfil não possui permissão para acessar esta área." }: { message?: string }) {
  return <div className="cs-alert cs-alert-error" role="alert"><div><strong>Acesso restrito</strong><p>{message}</p></div></div>;
}
