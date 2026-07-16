"use client";

import Link from "next/link";

function recent(value: string | null) {
  return Boolean(value && Date.now() - new Date(value).getTime() <= 7 * 86_400_000);
}

export function KanbanCardShortcuts({ projectId, history, files, agenda, comments, latestHistory, latestFile, latestAgenda, latestComment }: {
  projectId: string; history: number; files: number; agenda: number; comments: number;
  latestHistory: string | null; latestFile: string | null; latestAgenda: string | null; latestComment: string | null;
}) {
  const items = [
    { section: "history", icon: "↺", label: "Histórico", count: history, fresh: recent(latestHistory) },
    { section: "files", icon: "↗", label: "Arquivos", count: files, fresh: recent(latestFile) },
    { section: "agenda", icon: "◷", label: "Agenda", count: agenda, fresh: recent(latestAgenda) },
    { section: "comments", icon: "◌", label: "Comentários", count: comments, fresh: recent(latestComment) },
  ];
  return (
    <nav className="cs-kanban-shortcuts" aria-label="Atalhos do projeto">
      {items.map((item) => (
        <Link key={item.section} href={`/projects/${projectId}?section=${item.section}`} aria-label={`${item.label}: ${item.count}`} title={item.label}>
          <span aria-hidden="true">{item.icon}</span><b>{item.count}</b>{item.fresh && <i aria-label="Atualização recente" />}
        </Link>
      ))}
    </nav>
  );
}
