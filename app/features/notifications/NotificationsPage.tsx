"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
import { Button } from "@/app/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/app/components/ui/DataState";
import { dateTime } from "@/app/config/regions";
import { useModuleData } from "@/app/hooks/useModuleData";
import { useNotifications } from "@/app/providers/NotificationProvider";
import { listNotifications } from "./notifications.service";
import type { StudioNotification } from "./types";

const moduleLabels: Record<string, string> = { projects: "Projetos", comments: "Comentários", files: "Arquivos", agenda: "Agenda", activities: "Atividades", finance: "Financeiro", users: "Usuários", settings: "Configurações" };

export function NotificationsPage() {
  const [module, setModule] = useState(""); const [unreadOnly, setUnreadOnly] = useState(false);
  const loader = useCallback(() => listNotifications(module, unreadOnly, 250), [module, unreadOnly]);
  const { data, loading, error, reload } = useModuleData<StudioNotification[]>(loader, []);
  const center = useNotifications();
  const modules = useMemo(() => [...new Set(data.map((item) => item.module))], [data]);
  async function read(item: StudioNotification) { if (!item.read_at) await center.markRead(item.id); await reload(); }
  async function readAll() { await center.markAllRead(module || null); await reload(); }
  return <ModuleFrame title="Notificações" subtitle="Alertas, atribuições e novidades relacionadas ao seu trabalho" actions={<Button onClick={() => void readAll()} disabled={!data.some((item) => !item.read_at)}>Marcar todas como lidas</Button>}>
    <div className="cs-toolbar cs-notification-filters"><select value={module} onChange={(e) => setModule(e.target.value)}><option value="">Todos os módulos</option>{modules.map((item) => <option value={item} key={item}>{moduleLabels[item] ?? item}</option>)}</select><label><input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} /> Somente não lidas</label></div>
    {error ? <ErrorState message={error} onRetry={() => void reload()} /> : loading ? <LoadingState /> : data.length === 0 ? <EmptyState title="Nenhuma notificação" description="As novidades destinadas a você aparecerão aqui." /> : <div className="cs-notification-list">{data.map((item) => <article key={item.id} className={item.read_at ? "" : "is-unread"} data-priority={item.priority}>
      <div><span className="cs-badge">{moduleLabels[item.module] ?? item.module}</span><h3>{item.title}</h3>{item.body && <p>{item.body}</p>}<small>{dateTime(item.created_at)}</small></div>
      <div className="cs-notification-actions">{item.link && <Link className="cs-link-button" href={item.link} onClick={() => void read(item)}>Abrir</Link>}{!item.read_at && <Button variant="text" onClick={() => void read(item)}>Marcar como lida</Button>}</div>
    </article>)}</div>}
  </ModuleFrame>;
}
