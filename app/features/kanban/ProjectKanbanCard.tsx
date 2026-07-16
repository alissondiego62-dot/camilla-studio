/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { priorityLabels, projectStageLabel, statusLabels } from "@/app/domain/architecture-config";
import { DeadlineBadge } from "@/app/components/ui/DeadlineBadge";
import { ProgressBar } from "@/app/components/ui/ProgressBar";
import { KanbanCardActions } from "./KanbanCardActions";
import { KanbanCardShortcuts } from "./KanbanCardShortcuts";
import type { AssignableUser, KanbanProject, WorkflowPatch } from "./types";

export function ProjectKanbanCard({ project, users, canStage, canStatus, canResponsible, pending, onPatch, onDragStart, onDragEnd }: {
  project: KanbanProject; users: AssignableUser[]; canStage: boolean; canStatus: boolean; canResponsible: boolean; pending: boolean;
  onPatch: (patch: WorkflowPatch) => void; onDragStart: () => void; onDragEnd: () => void;
}) {
  const image = project.thumbnail_url || (project.cover_url?.startsWith("http") ? project.cover_url : null);
  const checklist = project.checklist_total ? project.checklist_completed / project.checklist_total * 100 : 0;
  const extraDates = project.planned_dates.filter((item) => !item.is_main_deadline).slice(0, 2);
  return (
    <article
      className={`cs-project-card cs-project-card-v3 ${pending ? "is-pending" : ""}`}
      draggable={canStage && !pending}
      onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", project.id); onDragStart(); }}
      onDragEnd={onDragEnd}
      data-priority={project.priority}
    >
      <div className="cs-project-card-image">{image ? <img src={image} alt={`Miniatura do projeto ${project.name}`} loading="lazy" /> : <span aria-label="Projeto sem miniatura">{project.code.slice(0, 2).toUpperCase()}</span>}</div>
      <div className="cs-project-card-body">
        <header><div><small>{project.code}</small><Link href={`/projects/${project.id}`}><h3>{project.name}</h3></Link></div><span className="cs-priority-pill">{priorityLabels[project.priority as keyof typeof priorityLabels] ?? project.priority}</span></header>
        <p className="cs-project-client">{project.client_name ?? "Cliente não informado"}</p>
        <dl className="cs-project-card-facts">
          <div><dt>Responsável</dt><dd>{project.responsible_name ?? "Não atribuído"}</dd></div>
          <div><dt>Status</dt><dd>{statusLabels[project.status as keyof typeof statusLabels] ?? project.status}</dd></div>
          <div><dt>Etapa</dt><dd>{projectStageLabel(project.stage)}</dd></div>
        </dl>
        <DeadlineBadge date={project.main_deadline} prefix="Prazo" updatedAt={project.updated_at} />
        {extraDates.length > 0 && <div className="cs-planned-date-summary">{extraDates.map((item) => <DeadlineBadge key={item.id} date={item.starts_at} completedAt={item.completed_at} updatedAt={item.updated_at} prefix={item.title} />)}</div>}
        {project.checklist_total > 0 && <ProgressBar value={checklist} label={`Checklist de ${project.name}`} />}
        <KanbanCardShortcuts projectId={project.id} history={project.history_count} files={project.files_count} agenda={project.agenda_count} comments={project.comments_count} latestHistory={project.latest_history_at} latestFile={project.latest_file_at} latestAgenda={project.latest_agenda_at} latestComment={project.latest_comment_at} />
        <KanbanCardActions project={project} users={users} canStage={canStage} canStatus={canStatus} canResponsible={canResponsible} pending={pending} onPatch={onPatch} />
      </div>
    </article>
  );
}
