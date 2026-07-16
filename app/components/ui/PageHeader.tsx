import type { ReactNode } from "react";
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return <header className="cs-page-header"><div><span className="cs-kicker">CAMILLA STUDIO</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="cs-page-actions">{actions}</div>}</header>;
}
