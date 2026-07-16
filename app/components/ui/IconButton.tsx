"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  count?: number;
  indicator?: boolean;
};

export function IconButton({ icon, label, count, indicator = false, className = "", ...props }: Props) {
  return (
    <button className={`cs-icon-button ${className}`.trim()} type="button" aria-label={label} title={label} {...props}>
      <span aria-hidden="true">{icon}</span>
      {typeof count === "number" && <b>{count}</b>}
      {indicator && <i aria-label="Há atualização recente" />}
    </button>
  );
}
