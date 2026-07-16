"use client";

import { useMemo } from "react";
import { activeStages } from "@/app/domain/architecture-config";
import { useSynchronizedKanbanScroll } from "@/app/hooks/useSynchronizedKanbanScroll";
import { KanbanColumn } from "./KanbanColumn";
import type { AssignableUser, KanbanProject, WorkflowPatch } from "./types";

export function KanbanBoard({ projects, users, canStage, canStatus, canResponsible, pendingIds, dropStage, onDropStage, onDropTarget, onPatch, onDragStart, onDragEnd }: {
  projects: KanbanProject[]; users: AssignableUser[]; canStage: boolean; canStatus: boolean; canResponsible: boolean; pendingIds: Set<string>; dropStage: string | null;
  onDropStage: (projectId: string, stage: string) => void; onDropTarget: (stage: string | null) => void; onPatch: (project: KanbanProject, patch: WorkflowPatch) => void; onDragStart: (id: string) => void; onDragEnd: () => void;
}) {
  const dependencyKey = useMemo(() => projects.map((project) => `${project.id}:${project.stage}`).join("|"), [projects]);
  const { boardRef, topScrollRef, scrollWidth, synchronize } = useSynchronizedKanbanScroll({ enabled: true, dependencyKey });
  return (
    <div className="cs-kanban-shell">
      <div className="cs-kanban-top-scroll" ref={topScrollRef} onScroll={(event) => synchronize(event.currentTarget, boardRef.current)} aria-label="Rolagem horizontal superior do Kanban"><div style={{ width: scrollWidth }} /></div>
      <section className="cs-kanban cs-kanban-v3" ref={boardRef} onScroll={(event) => synchronize(event.currentTarget, topScrollRef.current)} aria-label="Kanban de projetos">
        {activeStages.map((stage) => <KanbanColumn key={stage} stage={stage} projects={projects.filter((project) => project.stage === stage)} users={users} canStage={canStage} canStatus={canStatus} canResponsible={canResponsible} pendingIds={pendingIds} activeDrop={dropStage === stage} onDrop={onDropStage} onDragEnter={onDropTarget} onPatch={onPatch} onDragStart={onDragStart} onDragEnd={onDragEnd} />)}
      </section>
    </div>
  );
}
