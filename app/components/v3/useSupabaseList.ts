"use client";

import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export function useSupabaseList<T>(table: string, select = "*", orderBy = "created_at") {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) { setItems([]); setLoading(false); return; }
    setLoading(true); setError("");
    const result = await supabase.from(table).select(select).order(orderBy, { ascending: false });
    if (result.error) setError(result.error.message);
    else setItems((result.data ?? []) as unknown as T[]);
    setLoading(false);
  }, [table, select, orderBy]);

  useEffect(() => { void reload(); }, [reload]);
  return { items, setItems, loading, error, reload };
}
