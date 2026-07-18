"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";
import { useFocusTrap } from "@/app/components/a11y/FocusTrap";

export function Modal({ title, children, onClose, className = "", bodyClassName = "" }: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  bodyClassName?: string;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useBodyScrollLock(mounted);
  useFocusTrap(dialogRef, onClose, mounted);

  if (!mounted) return null;

  return createPortal(
    <div
      className="cs-modal-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className={`cs-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id={titleId}>{title}</h2>
          <button type="button" aria-label={`Fechar ${title}`} onClick={onClose}>×</button>
        </header>
        <div className={`cs-modal-body ${bodyClassName}`.trim()}>{children}</div>
      </section>
    </div>,
    document.body,
  );
}
