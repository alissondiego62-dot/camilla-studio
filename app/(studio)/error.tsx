"use client";
import { ErrorState } from "@/app/components/ui/DataState";
export default function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Não foi possível abrir esta página" message={error.message} onRetry={reset} />;
}
