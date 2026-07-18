"use client";

import { useCallback, useMemo, useState } from "react";
import { ErrorState, LoadingState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { useModuleData } from "@/app/hooks/useModuleData";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { usePermissions } from "@/app/hooks/usePermissions";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectNavigation } from "./ProjectNavigation";
import type { ProjectSection } from "./ProjectNavigation";
import { ProjectGeneralPanel } from "./ProjectGeneralPanel";
import { ProjectActivitiesPanel } from "./ProjectActivitiesPanel";
import { ProjectAgendaPanel } from "./ProjectAgendaPanel";
import { ProjectFilesPanel } from "./ProjectFilesPanel";
import { ProjectCommentsPanel } from "./ProjectCommentsPanel";
import { ProjectChecklistPanel } from "./ProjectChecklistPanel";
import { ProjectHistoryPanel } from "./ProjectHistoryPanel";
import { ProjectFinancialPanel } from "./ProjectFinancialPanel";
import { ProjectDatesPanel } from "@/app/features/project-dates/ProjectDatesPanel";
import { ProjectThumbnailPanel } from "@/app/features/project-thumbnail/ProjectThumbnailPanel";
import { markRecordView } from "@/app/features/notifications/record-views.service";
import { loadProjectWorkspace, updateProjectGeneral } from "./project-detail.service";
import type { ProjectWorkspace } from "./types";
import { isFinancialAdministrator } from "@/app/services/security/financial-access";

const emptyWorkspace = null as ProjectWorkspace | null;
const allowedSections = new Set<ProjectSection>(["overview", "dates", "activities", "agenda", "files", "comments", "checklist", "history", "finance"]);

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const { can, access } = usePermissions();
  const showFinance = isFinancialAdministrator(access.profileCode);
  const loader = useCallback(() => loadProjectWorkspace(projectId, showFinance), [projectId, showFinance]);
  const { data, loading, error, reload } = useModuleData<ProjectWorkspace | null>(loader, emptyWorkspace);
  const action = useAsyncAction();
  const [selectedSection, setSection] = useState<ProjectSection>(() => {
    if (typeof window === "undefined") return "overview";
    const value = new URLSearchParams(window.location.search).get("section") as ProjectSection | null;
    return value && allowedSections.has(value) ? value : "overview";
  });
  const section = selectedSection === "finance" && !showFinance ? "overview" : selectedSection;

  function changeSection(next: ProjectSection) {
    setSection(next);
    if (["history", "files", "agenda", "comments"].includes(next)) void markRecordView(projectId, next as "history" | "files" | "agenda" | "comments");
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("section"); else url.searchParams.set("section", next);
    window.history.replaceState({}, "", url);
  }

  const counts = useMemo(() => ({
    dates: data?.dates.length ?? 0,
    activities: data?.activities.length ?? 0,
    agenda: data?.events.length ?? 0,
    files: data?.files.length ?? 0,
    comments: data?.comments.length ?? 0,
    checklist: data?.checklist.filter((item) => item.stage === data.project.stage).length ?? 0,
    history: data?.history.length ?? 0,
    finance: data?.finance.length ?? 0,
  }), [data]);

  async function saveGeneral(payload: Record<string, unknown>) {
    const result = await action.run(() => updateProjectGeneral(projectId, payload), "Projeto atualizado.");
    if (result.ok) await reload();
  }

  if (loading) return <LoadingState label="Carregando projeto…" />;
  if (error || !data) return <ErrorState message={error || "Projeto não encontrado."} onRetry={() => void reload()} />;

  const canEditProject = can("projects", "edit");
  const canChangeDeadline = can("projects", "change_deadline") || canEditProject;
  const canCreateActivity = can("activities", "create");
  const canEditActivity = can("activities", "edit") || can("activities", "change_status");
  const canCreateAgenda = can("agenda", "create");
  const canEditAgenda = can("agenda", "edit");
  const canAddFile = can("files", "add_file");
  const canRemoveFile = can("files", "remove_file") || can("files", "archive");
  const canReplaceFile = can("files", "add_file") || can("files", "edit");
  const canDeleteComment = can("comments", "delete") || canEditProject;
  const canInternalComment = can("comments", "view_internal") || can("comments", "create_internal");
  const canChecklist = can("checklists", "edit");
  const canWaiveChecklist = can("checklists", "approve") || can("checklists", "manage_settings");

  return (
    <div className="cs-project-detail">
      <ProjectHeader project={data.project} />
      <FeedbackMessage error={action.error} success={action.success} />
      <ProjectNavigation active={section} onChange={changeSection} counts={counts} showFinance={showFinance} />
      <div className="cs-project-detail-content">
        {section === "overview" && <div className="cs-project-overview-grid"><ProjectGeneralPanel project={data.project} clients={data.clients} users={data.users} canEdit={canEditProject} pending={action.pending} onSave={(payload) => void saveGeneral(payload)} /><ProjectThumbnailPanel projectId={projectId} projectName={data.project.name} thumbnail={data.thumbnail} legacyUrl={data.project.cover_url} canAdd={canAddFile || canEditProject} canRemove={canRemoveFile || canEditProject} onChanged={reload} /></div>}
        {section === "dates" && <ProjectDatesPanel projectId={projectId} dates={data.dates} types={data.dateTypes} activities={data.activities} events={data.events} canEdit={canChangeDeadline} canCreateActivity={canCreateActivity} canCreateEvent={canCreateAgenda} onChanged={reload} />}
        {section === "activities" && <ProjectActivitiesPanel projectId={projectId} activities={data.activities} users={data.users} canCreate={canCreateActivity} canEdit={canEditActivity} onChanged={reload} />}
        {section === "agenda" && <ProjectAgendaPanel projectId={projectId} events={data.events} canCreate={canCreateAgenda} canEdit={canEditAgenda} onChanged={reload} />}
        {section === "files" && <ProjectFilesPanel projectId={projectId} files={data.files} canAdd={canAddFile} canReplace={canReplaceFile} canRemove={canRemoveFile} onChanged={reload} />}
        {section === "comments" && <ProjectCommentsPanel projectId={projectId} comments={data.comments} users={data.users.map((item) => ({ id: item.id, name: item.name, email: item.email || "" }))} canAdd={can("comments", "create") || canEditProject || canEditActivity} canDeleteAny={canDeleteComment} canInternal={canInternalComment} onChanged={reload} />}
        {section === "checklist" && <ProjectChecklistPanel items={data.checklist} currentStage={data.project.stage} canEdit={canChecklist} canWaive={canWaiveChecklist} onChanged={reload} />}
        {section === "history" && <ProjectHistoryPanel history={data.history} />}
        {section === "finance" && showFinance && <ProjectFinancialPanel project={data.project} entries={data.finance} summary={data.financeSummary} onChanged={reload} />}
      </div>
    </div>
  );
}
