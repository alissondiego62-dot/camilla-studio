"use client";
import { useCallback, useState } from "react";
export function useAsyncAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const clearFeedback = useCallback(() => { setError(""); setSuccess(""); }, []);
  const run = useCallback(async <T,>(action: () => Promise<T>, successMessage?: string) => {
    setPending(true); setError(""); setSuccess("");
    try {
      const data = await action();
      if (successMessage) setSuccess(successMessage);
      return { ok: true as const, data };
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ocorreu um erro inesperado.");
      return { ok: false as const };
    } finally { setPending(false); }
  }, []);
  return { pending, error, success, clearFeedback, run };
}
