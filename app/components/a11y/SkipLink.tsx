import type { ReactNode } from "react";

export function SkipLink({ href = "#main-content", children = "Pular para o conteúdo principal" }: { href?: string; children?: ReactNode }) {
  return <a className="cs-skip-link" href={href}>{children}</a>;
}
