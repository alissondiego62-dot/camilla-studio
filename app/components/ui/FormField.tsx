"use client";

import { useId } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

type SharedFieldProps = { label: string; hint?: string; error?: string; className?: string };

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return <span>{label}{required && <><span className="cs-required-mark" aria-hidden="true"> *</span><span className="cs-sr-only"> (obrigatório)</span></>}</span>;
}

export function FormField({ label, hint, error, className = "", id, required, ...props }: InputHTMLAttributes<HTMLInputElement> & SharedFieldProps) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [props["aria-describedby"], hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <label className={className} htmlFor={fieldId}>
      <FieldLabel label={label} required={required} />
      <input id={fieldId} required={required} aria-required={required || undefined} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props} />
      {hint && <small id={hintId} className="cs-field-hint">{hint}</small>}
      {error && <small id={errorId} className="cs-field-error" role="alert">{error}</small>}
    </label>
  );
}

export function SelectField({ label, hint, error, children, className = "", id, required, ...props }: SelectHTMLAttributes<HTMLSelectElement> & SharedFieldProps & { children: ReactNode }) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [props["aria-describedby"], hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <label className={className} htmlFor={fieldId}>
      <FieldLabel label={label} required={required} />
      <select id={fieldId} required={required} aria-required={required || undefined} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props}>{children}</select>
      {hint && <small id={hintId} className="cs-field-hint">{hint}</small>}
      {error && <small id={errorId} className="cs-field-error" role="alert">{error}</small>}
    </label>
  );
}
