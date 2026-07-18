"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "text" | "danger";
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
};

export function Button({ variant = "secondary", loading = false, loadingLabel = "Processando…", children, disabled, className = "", ...props }: Props) {
  return (
    <button
      className={`cs-button cs-button-${variant} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}
