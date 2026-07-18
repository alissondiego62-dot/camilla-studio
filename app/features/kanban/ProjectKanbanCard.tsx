/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { priorityLabels, statusLabels } from "@/app/domain/architecture-config";
import { DeadlineBadge } from "@/app/components/ui/DeadlineBadge";
import { KanbanCardActions } from "./KanbanCardActions";
import { KanbanCardShortcuts } from "./KanbanCardShortcuts";
import type { AssignableUser, KanbanPlannedDate, KanbanProject, WorkflowOption, WorkflowPatch } from "./types";

function timestamp(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function collectDeadlines(project: KanbanProject): KanbanPlannedDate[] {
  const dates = [...project.planned_dates];
  const hasMain = dates.some((item) => item.is_main_deadline || item.starts_at === project.main_deadline);
  if (project.main_deadline && !hasMain) {
    dates.push({
      id: `main-${project.id}`,
      purpose_code: "main_deadline",
      title: "Prazo principal",
      starts_at: project.main_deadline,
      status: "planned",
      completed_at: null,
      updated_at: project.updated_at,
      is_main_deadline: true,
    });
  }
  return dates.sort((a, b) => timestamp(a.starts_at) - timestamp(b.starts_at));
}

export function ProjectKanbanCard({ project, users, stages, statuses, canStage, canStatus, canResponsible, pending, onPatch, onDragStart, onDragEnd }: {
  project: KanbanProject;
  users: AssignableUser[];
  stages: WorkflowOption[];
  statuses: WorkflowOption[];
  canStage: boolean;
  canStatus: boolean;
  canResponsible: boolean;
  pending: boolean;
  onPatch: (patch: WorkflowPatch) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const image = project.thumbnail_url || (project.cover_url?.startsWith("http") ? project.cover_url : null);
  const deadlines = collectDeadlines(project);
  const statusName = statuses.find((item) => item.code === project.status)?.name
    ?? statusLabels[project.status as keyof typeof statusLabels]
    ?? project.status;

  return (
    <article
      className={`cs-project-card cs-project-card-v3 ${pending ? "is-pending" : ""}`}
      draggable={canStage && !pending}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", project.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      data-priority={project.priority}
    >
      <div className="cs-project-card-image">
        {image
          ? <img src={image} alt={`Miniatura do projeto ${project.name}`} loading="lazy" />
          : <span aria-label="Projeto sem miniatura">{project.code.slice(0, 2).toUpperCase()}</span>}
      </div>

      <div className="cs-project-card-body">
        <header>
          <div>
            <small>{project.code}</small>
            <Link href={`/projects/${project.id}`}><h3>{project.name}</h3></Link>
          </div>
          <span className="cs-priority-pill">{priorityLabels[project.priority as keyof typeof priorityLabels] ?? project.priority}</span>
        </header>

        <p className="cs-project-client">{project.client_name ?? "Cliente não informado"}</p>

        <div className="cs-project-status-line">
          <span className="cs-project-status-dot" style={{ backgroundColor: statuses.find((item) => item.code === project.status)?.color ?? undefined }} aria-hidden="true" />
          <span title={statusName}>{statusName}</span>
        </div>

        {deadlines.length > 0 && (
          <section className="cs-kanban-deadlines" aria-label={`Prazos de ${project.name}`}>
            <strong>Prazos</strong>
            <div>
              {deadlines.map((item) => (
                <DeadlineBadge
                  key={item.id}
                  date={item.starts_at}
                  completedAt={item.completed_at}
                  updatedAt={item.updated_at}
                  prefix={item.title || (item.is_main_deadline ? "Prazo principal" : "Prazo")}
                />
              ))}
            </div>
          </section>
        )}

        <KanbanCardShortcuts
          projectId={project.id}
          responsibleName={project.responsible_name}
          checklistCompleted={project.checklist_completed}
          checklistTotal={project.checklist_total}
          files={project.files_count}
          comments={project.comments_count}
          unreadFiles={project.unread_files_count}
          unreadComments={project.unread_comments_count}
        />

        <KanbanCardActions
          project={project}
          users={users}
          stages={stages}
          statuses={statuses}
          canStage={canStage}
          canStatus={canStatus}
          canResponsible={canResponsible}
          pending={pending}
          onPatch={onPatch}
        />
      </div>
    </article>
  );
}
