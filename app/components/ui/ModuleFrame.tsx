import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";
export function ModuleFrame({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) { return <><PageHeader title={title} subtitle={subtitle} actions={actions}/><section className="cs-module">{children}</section></>; }
