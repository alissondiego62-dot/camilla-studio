"use client";

import { useCallback, useMemo, useState } from "react";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
import { Button } from "@/app/components/ui/Button";
import { ErrorState, LoadingState, EmptyState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { useModuleData } from "@/app/hooks/useModuleData";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { usePermissions } from "@/app/hooks/usePermissions";
import { KanbanBoard } from "./KanbanBoard";
import { getKanbanProject, listAssignableUsers, listKanbanProjects, updateProjectWorkflow } from "./kanban.service";
import type { KanbanProject, WorkflowPatch } from "./types";

export function KanbanPage() {
  const loader = useCallback(() => listKanbanProjects(), []);
  const usersLoader = useCallback(() => listAssignableUsers(), []);
  const { data: projects, setData: setProjects, loading, error, reload } = useModuleData(loader, []);
  const { data: users } = useModuleData(usersLoader, []);
  const action = useAsyncAction();
  const { can } = usePermissions();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropStage, setDropStage] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const canStage = can("kanban", "change_stage") || can("projects", "change_stage");
  const canStatus = can("kanban", "change_status") || can("projects", "change_status");
  const canResponsible = can("projects", "edit");
  const sorted = useMemo(() => [...projects].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [projects]);

  async function patchProject(project: KanbanProject, patch: WorkflowPatch) {
    if (pendingIds.has(project.id)) return;
    const before = projects;
    const next = { ...project, ...patch };
    setPendingIds((current) => new Set(current).add(project.id));
    setProjects((current) => current.map((item) => item.id === project.id ? next : item));
    const result = await action.run(async () => {
      await updateProjectWorkflow(project.id, patch);
      return getKanbanProject(project.id);
    }, "Projeto atualizado.");
    if (!result.ok) setProjects(before);
    else setProjects((current) => current.map((item) => item.id === project.id ? result.data : item));
    setPendingIds((current) => { const copy = new Set(current); copy.delete(project.id); return copy; });
  }

  function dropProject(projectId: string, stage: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project || project.stage === stage || !canStage) return;
    void patchProject(project, { stage });
    setDragId(null);
  }

  return (
    <ModuleFrame title="Kanban" subtitle="Projetos organizados por etapa, com prazos, checklist e atalhos operacionais" actions={<Button onClick={() => void reload()}>Atualizar</Button>}>
      <FeedbackMessage error={action.error} success={action.success} />
      {error && <ErrorState message={error} onRetry={() => void reload()} />}
      {loading ? <LoadingState /> : sorted.length === 0 ? <EmptyState title="Nenhum projeto no Kanban" description="Os projetos cadastrados aparecerão organizados por etapa." /> : (
        <KanbanBoard projects={sorted} users={users} canStage={canStage} canStatus={canStatus} canResponsible={canResponsible} pendingIds={pendingIds} dropStage={dropStage} onDropStage={dropProject} onDropTarget={setDropStage} onPatch={(project, patch) => void patchProject(project, patch)} onDragStart={setDragId} onDragEnd={() => { setDragId(null); setDropStage(null); }} />
      )}
      {dragId && <div className="cs-drag-announcement" role="status">Arraste para a etapa desejada ou use o seletor de etapa no card.</div>}
    </ModuleFrame>
  );
}
