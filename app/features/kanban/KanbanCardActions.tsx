"use client";

import { activeStages, projectStageLabel, statusLabels } from "@/app/domain/architecture-config";
import type { AssignableUser, KanbanProject, WorkflowPatch } from "./types";

export function KanbanCardActions({ project, users, canStage, canStatus, canResponsible, pending, onPatch }: {
  project: KanbanProject; users: AssignableUser[]; canStage: boolean; canStatus: boolean; canResponsible: boolean; pending: boolean;
  onPatch: (patch: WorkflowPatch) => void;
}) {
  if (!canStage && !canStatus && !canResponsible) return null;
  return (
    <div className="cs-kanban-card-controls" onClick={(event) => event.stopPropagation()}>
      {canStatus && <label><span>Status</span><select aria-label={`Status de ${project.name}`} value={project.status} disabled={pending} onChange={(event) => onPatch({ status: event.target.value })}>{Object.entries(statusLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>}
      {canStage && <label><span>Etapa</span><select aria-label={`Etapa de ${project.name}`} value={project.stage} disabled={pending} onChange={(event) => onPatch({ stage: event.target.value })}>{activeStages.map((stage) => <option key={stage} value={stage}>{projectStageLabel(stage)}</option>)}</select></label>}
      {canResponsible && <label><span>Responsável</span><select aria-label={`Responsável por ${project.name}`} value={project.responsible_user_id ?? ""} disabled={pending} onChange={(event) => { const id = event.target.value || null; const user = users.find((item) => item.id === id); onPatch({ responsible_user_id: id, responsible_name: user?.name ?? null }); }}><option value="">Não atribuído</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>}
    </div>
  );
}
