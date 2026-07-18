"use client";

import Link from "next/link";

function initials(name: string | null) {
  if (!name) return "--";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function KanbanCardShortcuts({ projectId, responsibleName, checklistCompleted, checklistTotal, files, comments, unreadFiles, unreadComments }: {
  projectId: string;
  responsibleName: string | null;
  checklistCompleted: number;
  checklistTotal: number;
  files: number;
  comments: number;
  unreadFiles: number;
  unreadComments: number;
}) {
  const items = [
    { section: "checklist", icon: "✓", label: "Checklist", count: checklistTotal > 0 ? `${checklistCompleted}/${checklistTotal}` : "0", unread: 0 },
    { section: "comments", icon: "◌", label: "Comentários", count: String(comments), unread: unreadComments },
    { section: "files", icon: "↗", label: "Arquivos", count: String(files), unread: unreadFiles },
  ];

  return (
    <div className="cs-kanban-card-footer-row">
      <nav className="cs-kanban-shortcuts" aria-label="Atalhos do projeto">
        {items.map((item) => (
          <Link
            key={item.section}
            href={`/projects/${projectId}?section=${item.section}`}
            aria-label={`${item.label}: ${item.count}${item.unread ? `; ${item.unread} não visualizados` : ""}`}
            title={item.label}
          >
            <span aria-hidden="true">{item.icon}</span>
            <b>{item.count}</b>
            {item.unread > 0 && <em>{item.unread > 99 ? "99+" : item.unread}</em>}
          </Link>
        ))}
      </nav>
      <span className="cs-kanban-responsible" title={responsibleName ? `Responsável: ${responsibleName}` : "Sem responsável"} aria-label={responsibleName ? `Responsável: ${responsibleName}` : "Sem responsável"}>
        {initials(responsibleName)}
      </span>
    </div>
  );
}
