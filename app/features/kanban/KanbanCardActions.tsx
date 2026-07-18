"use client";

import type { AssignableUser, KanbanProject, WorkflowOption, WorkflowPatch } from "./types";

export function KanbanCardActions({ project, users, stages, statuses, canStage, canStatus, canResponsible, pending, onPatch }: {
  project: KanbanProject;
  users: AssignableUser[];
  stages: WorkflowOption[];
  statuses: WorkflowOption[];
  canStage: boolean;
  canStatus: boolean;
  canResponsible: boolean;
  pending: boolean;
  onPatch: (patch: WorkflowPatch) => void;
}) {
  if (!canStage && !canStatus && !canResponsible) return null;

  return (
    <div className="cs-kanban-card-controls" onClick={(event) => event.stopPropagation()}>
      {canStage && (
        <label className="cs-kanban-quick-action" title="Alterar etapa">
          <span className="cs-kanban-quick-action-icon" aria-hidden="true">⇄</span>
          <span className="cs-sr-only">Alterar etapa de {project.name}</span>
          <select
            aria-label={`Alterar etapa de ${project.name}`}
            value={project.stage}
            disabled={pending}
            onChange={(event) => onPatch({ stage: event.target.value })}
          >
            {stages.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </label>
      )}

      {canStatus && (
        <label className="cs-kanban-quick-action" title="Alterar status">
          <span className="cs-kanban-quick-action-icon" aria-hidden="true">◉</span>
          <span className="cs-sr-only">Alterar status de {project.name}</span>
          <select
            aria-label={`Alterar status de ${project.name}`}
            value={project.status}
            disabled={pending}
            onChange={(event) => onPatch({ status: event.target.value })}
          >
            {statuses.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </label>
      )}

      {canResponsible && (
        <label className="cs-kanban-quick-action" title="Alterar responsável">
          <span className="cs-kanban-quick-action-icon" aria-hidden="true">♙</span>
          <span className="cs-sr-only">Alterar responsável por {project.name}</span>
          <select
            aria-label={`Alterar responsável por ${project.name}`}
            value={project.responsible_user_id ?? ""}
            disabled={pending}
            onChange={(event) => {
              const id = event.target.value || null;
              const user = users.find((item) => item.id === id);
              onPatch({ responsible_user_id: id, responsible_name: user?.name ?? null });
            }}
          >
            <option value="">Não atribuído</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}
