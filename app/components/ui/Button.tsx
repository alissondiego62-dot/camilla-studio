"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "text" | "danger"; loading?: boolean; children: ReactNode };
export function Button({ variant = "secondary", loading = false, children, disabled, className = "", ...props }: Props) {
  return <button className={`cs-button cs-button-${variant} ${className}`.trim()} disabled={disabled || loading} {...props}>{loading ? "Processando…" : children}</button>;
}
