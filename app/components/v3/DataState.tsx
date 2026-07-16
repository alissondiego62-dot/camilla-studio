"use client";

export function LoadingState({ label = "Carregando…" }: { label?: string }) {
  return <div className="v3-empty"><span className="v3-spinner" />{label}</div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="v3-empty"><strong>{title}</strong><p>{description}</p></div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="v3-alert v3-alert-error">{message}</div>;
}
