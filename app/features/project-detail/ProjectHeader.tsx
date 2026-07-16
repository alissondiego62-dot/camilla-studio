"use client";

import Link from "next/link";
import { projectStageLabel, statusLabels } from "@/app/domain/architecture-config";
import { DeadlineBadge } from "@/app/components/ui/DeadlineBadge";
import type { Project } from "@/app/domain/architecture-types";

export function ProjectHeader({ project }: { project: Project }) {
  return (
    <header className="cs-project-detail-header">
      <div>
        <Link href="/projects" className="cs-back-link">← Voltar para projetos</Link>
        <span className="cs-kicker">{project.code}</span>
        <h1>{project.name}</h1>
        <p>{project.client?.name ?? "Cliente não informado"}</p>
      </div>
      <div className="cs-project-header-status">
        <span className="cs-badge">{projectStageLabel(project.stage)}</span>
        <span className="cs-badge cs-badge-soft">{statusLabels[project.status] ?? project.status}</span>
        <DeadlineBadge date={project.main_deadline} prefix="Prazo principal" updatedAt={project.updated_at} />
      </div>
    </header>
  );
}
