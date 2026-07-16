"use client";

import { projectStageLabel } from "@/app/domain/architecture-config";
import { ProjectKanbanCard } from "./ProjectKanbanCard";
import type { AssignableUser, KanbanProject, WorkflowPatch } from "./types";

export function KanbanColumn({ stage, projects, users, canStage, canStatus, canResponsible, pendingIds, activeDrop, onDrop, onDragEnter, onPatch, onDragStart, onDragEnd }: {
  stage: string; projects: KanbanProject[]; users: AssignableUser[]; canStage: boolean; canStatus: boolean; canResponsible: boolean;
  pendingIds: Set<string>; activeDrop: boolean; onDrop: (projectId: string, stage: string) => void; onDragEnter: (stage: string | null) => void;
  onPatch: (project: KanbanProject, patch: WorkflowPatch) => void; onDragStart: (id: string) => void; onDragEnd: () => void;
}) {
  return (
    <section
      className={`cs-kanban-column ${activeDrop ? "is-drop-target" : ""}`}
      onDragOver={(event) => { if (canStage) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }}
      onDragEnter={() => canStage && onDragEnter(stage)}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onDragEnter(null); }}
      onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData("text/plain"); if (id) onDrop(id, stage); onDragEnter(null); }}
    >
      <header className="cs-kanban-column-header"><h2>{projectStageLabel(stage)}</h2><span>{projects.length}</span></header>
      <div className="cs-kanban-lane">
        {projects.length === 0 ? <p className="cs-kanban-empty">Nenhum projeto</p> : projects.map((project) => (
          <ProjectKanbanCard key={project.id} project={project} users={users} canStage={canStage} canStatus={canStatus} canResponsible={canResponsible} pending={pendingIds.has(project.id)} onPatch={(patch) => onPatch(project, patch)} onDragStart={() => onDragStart(project.id)} onDragEnd={onDragEnd} />
        ))}
      </div>
    </section>
  );
}
