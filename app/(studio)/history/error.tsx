"use client";
import { ErrorState } from "@/app/components/ui/DataState";
export default function ErrorPage({ reset }: { reset: () => void }) { return <ErrorState message="Não foi possível abrir o histórico." onRetry={reset} />; }
