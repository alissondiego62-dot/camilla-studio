"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { listNotifications, markAllNotificationsRead, markNotificationRead, subscribeToNotifications, unreadNotificationCount } from "@/app/features/notifications/notifications.service";
import type { StudioNotification } from "@/app/features/notifications/types";

const NotificationContext = createContext<{
  items: StudioNotification[];
  unread: number;
  loading: boolean;
  reload: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: (module?: string | null) => Promise<void>;
} | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, configured } = useAuth();
  const [items, setItems] = useState<StudioNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!configured || !user) { setItems([]); setUnread(0); return; }
    setLoading(true);
    try {
      const [nextItems, nextUnread] = await Promise.all([listNotifications("", false, 20), unreadNotificationCount()]);
      setItems(nextItems); setUnread(nextUnread);
    } finally { setLoading(false); }
  }, [configured, user]);

  useEffect(() => { const timer = window.setTimeout(() => void reload(), 0); return () => window.clearTimeout(timer); }, [reload]);
  useEffect(() => {
    if (!configured || !user) return;
    const channel = subscribeToNotifications(user.id, () => void reload());
    return () => { void channel.unsubscribe(); };
  }, [configured, reload, user]);

  const value = useMemo(() => ({
    items, unread, loading, reload,
    async markRead(id: string) { await markNotificationRead(id); await reload(); },
    async markAllRead(module?: string | null) { await markAllNotificationsRead(module); await reload(); },
  }), [items, loading, reload, unread]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications deve ser usado dentro de NotificationProvider.");
  return context;
}
