"use client";
import { Button } from "./Button";
export function LoadingState({ label = "Carregando…" }: { label?: string }) { return <div className="cs-state"><span className="cs-spinner" aria-hidden="true"/><span>{label}</span></div>; }
export function EmptyState({ title, description }: { title: string; description: string }) { return <div className="cs-state"><strong>{title}</strong><p>{description}</p></div>; }
export function ErrorState({ title = "Não foi possível carregar", message, onRetry }: { title?: string; message: string; onRetry?: () => void }) { return <div className="cs-alert cs-alert-error" role="alert"><div><strong>{title}</strong><p>{message}</p></div>{onRetry && <Button type="button" onClick={onRetry}>Tentar novamente</Button>}</div>; }
