"use client";

import Link from "next/link";

export function KanbanCardShortcuts({ projectId, history, files, agenda, comments, unreadHistory, unreadFiles, unreadAgenda, unreadComments }: {
  projectId: string; history: number; files: number; agenda: number; comments: number;
  unreadHistory: number; unreadFiles: number; unreadAgenda: number; unreadComments: number;
}) {
  const items = [
    { section: "history", icon: "↺", label: "Histórico", count: history, unread: unreadHistory },
    { section: "files", icon: "↗", label: "Arquivos", count: files, unread: unreadFiles },
    { section: "agenda", icon: "◷", label: "Agenda", count: agenda, unread: unreadAgenda },
    { section: "comments", icon: "◌", label: "Comentários", count: comments, unread: unreadComments },
  ];
  return <nav className="cs-kanban-shortcuts" aria-label="Atalhos do projeto">{items.map((item) => <Link key={item.section} href={`/projects/${projectId}?section=${item.section}`} aria-label={`${item.label}: ${item.count}; ${item.unread} não visualizados`} title={item.label}><span aria-hidden="true">{item.icon}</span><b>{item.count}</b>{item.unread > 0 && <em>{item.unread > 99 ? "99+" : item.unread}</em>}</Link>)}</nav>;
}
