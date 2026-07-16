import type { ReactNode } from "react";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
/** Compatibilidade temporária para componentes legados ainda não migrados. */
export function AppShell({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) { return <ModuleFrame title={title} subtitle={subtitle} actions={actions}>{children}</ModuleFrame>; }
