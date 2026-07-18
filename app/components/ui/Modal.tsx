"use client";

import { useId, useRef } from "react";
import type { ReactNode } from "react";
import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";
import { useFocusTrap } from "@/app/components/a11y/FocusTrap";

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  useBodyScrollLock(true);
  useFocusTrap(dialogRef, onClose);

  return (
    <div className="cs-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section ref={dialogRef} className="cs-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2 id={titleId}>{title}</h2>
          <button type="button" aria-label={`Fechar ${title}`} onClick={onClose}>×</button>
        </header>
        <div className="cs-modal-body">{children}</div>
      </section>
    </div>
  );
}
