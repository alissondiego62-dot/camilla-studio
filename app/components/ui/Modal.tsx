"use client";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const titleId = useId(); const closeRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(true);
  useEffect(() => { closeRef.current?.focus(); const listener=(event:KeyboardEvent)=>{ if(event.key==="Escape") onClose(); }; window.addEventListener("keydown",listener); return()=>window.removeEventListener("keydown",listener); }, [onClose]);
  return <div className="cs-modal-backdrop" role="presentation" onMouseDown={onClose}><section className="cs-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={e=>e.stopPropagation()}><header><h2 id={titleId}>{title}</h2><button ref={closeRef} type="button" aria-label="Fechar" onClick={onClose}>×</button></header><div className="cs-modal-body">{children}</div></section></div>;
}
