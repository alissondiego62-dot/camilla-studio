"use client";
import { ReactNode, useEffect } from "react";

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onClose]);
  return <div className="v3-modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="v3-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
      <header><h2>{title}</h2><button aria-label="Fechar" onClick={onClose}>×</button></header>
      <div className="v3-modal-body">{children}</div>
    </section>
  </div>;
}
