"use client";
import { ErrorState } from "@/app/components/ui/DataState";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) { return <ErrorState message="Não foi possível abrir o projeto." onRetry={reset} />; }
