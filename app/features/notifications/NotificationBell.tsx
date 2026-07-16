"use client";

import Link from "next/link";
import { useState } from "react";
import { dateTime } from "@/app/config/regions";
import { useNotifications } from "@/app/providers/NotificationProvider";

export function NotificationBell() {
  const { items, unread, loading, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  return <div className="cs-notification-bell">
    <button type="button" aria-label={`Notificações: ${unread} não lidas`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span aria-hidden="true">◉</span>{unread > 0 && <b>{unread > 99 ? "99+" : unread}</b>}
    </button>
    {open && <div className="cs-notification-popover">
      <header><strong>Notificações</strong>{unread > 0 && <button type="button" onClick={() => void markAllRead()}>Marcar todas</button>}</header>
      <div>{loading ? <p>Carregando…</p> : items.length === 0 ? <p>Nenhuma notificação.</p> : items.slice(0, 8).map((item) => <article className={item.read_at ? "" : "is-unread"} key={item.id}>
        <Link href={item.link || "/notifications"} onClick={() => { setOpen(false); if (!item.read_at) void markRead(item.id); }}>
          <strong>{item.title}</strong><span>{item.body}</span><small>{dateTime(item.created_at)}</small>
        </Link>
      </article>)}</div>
      <footer><Link href="/notifications" onClick={() => setOpen(false)}>Abrir central</Link></footer>
    </div>}
  </div>;
}
