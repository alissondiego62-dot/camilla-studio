"use client";

import { useCallback } from "react";
import type { FormEvent } from "react";
import { priorityLabels } from "@/app/domain/architecture-config";
import { Button } from "@/app/components/ui/Button";
import { FormField } from "@/app/components/ui/FormField";
import type { Project } from "@/app/domain/architecture-types";
import type { ProjectOption } from "./types";
import { useModuleData } from "@/app/hooks/useModuleData";
import { listWorkflow } from "@/app/features/settings/settings.service";

export function ProjectGeneralPanel({ project, clients, users, canEdit, pending, onSave }: {
  project: Project; clients: ProjectOption[]; users: ProjectOption[]; canEdit: boolean; pending: boolean; onSave: (payload: Record<string, unknown>) => void;
}) {
  const stageLoader = useCallback(() => listWorkflow("project_stages"), []);
  const statusLoader = useCallback(() => listWorkflow("project_statuses"), []);
  const { data: stages } = useModuleData(stageLoader, []);
  const { data: statuses } = useModuleData(statusLoader, []);
  const stageOptions = stages.filter((row) => (row.active && !row.archived_at) || row.code === project.stage);
  const statusOptions = statuses.filter((row) => (row.active && !row.archived_at) || row.code === project.status);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const responsibleId = String(form.get("responsible_user_id") || "") || null;
    const responsible = users.find((user) => user.id === responsibleId);
    onSave({
      code: String(form.get("code") || "").trim(),
      name: String(form.get("name") || "").trim(),
      client_id: String(form.get("client_id") || "") || null,
      project_type: String(form.get("project_type") || "").trim(),
      subtype: String(form.get("subtype") || "").trim() || null,
      stage: String(form.get("stage") || project.stage),
      status: String(form.get("status") || project.status),
      priority: String(form.get("priority") || project.priority),
      responsible_user_id: responsibleId,
      responsible_name: responsible?.name ?? null,
      notes: String(form.get("notes") || "").trim() || null,
    });
  }
  return (
    <section className="cs-card">
      <div className="cs-section-heading"><div><h3>Dados gerais</h3><p>Informações principais, etapa, status, cliente e responsável.</p></div></div>
      <form className="cs-form-grid" onSubmit={submit}>
        <FormField label="Código" name="code" required defaultValue={project.code} disabled={!canEdit} />
        <FormField label="Nome" name="name" required defaultValue={project.name} disabled={!canEdit} />
        <label><span>Cliente</span><select name="client_id" defaultValue={project.client_id ?? ""} disabled={!canEdit}><option value="">Não informado</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
        <label><span>Responsável</span><select name="responsible_user_id" defaultValue={project.responsible_user_id ?? ""} disabled={!canEdit}><option value="">Não atribuído</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
        <FormField label="Tipo" name="project_type" defaultValue={project.project_type} disabled={!canEdit} />
        <FormField label="Subtipo" name="subtype" defaultValue={project.subtype ?? ""} disabled={!canEdit} />
        <label><span>Etapa</span><select name="stage" defaultValue={project.stage === "construction" ? "revision" : project.stage} disabled={!canEdit}>{stageOptions.map((stage) => <option key={stage.code} value={stage.code}>{stage.name}{!stage.active ? " (inativa)" : ""}</option>)}</select></label>
        <label><span>Status</span><select name="status" defaultValue={project.status} disabled={!canEdit}>{statusOptions.map((status) => <option key={status.code} value={status.code}>{status.name}{!status.active ? " (inativo)" : ""}</option>)}</select></label>
        <label><span>Prioridade</span><select name="priority" defaultValue={project.priority} disabled={!canEdit}>{Object.entries(priorityLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
        <label className="cs-span-2"><span>Observações</span><textarea name="notes" rows={4} defaultValue={project.notes ?? ""} disabled={!canEdit} /></label>
        {canEdit && <div className="cs-form-actions"><span /><Button variant="primary" loading={pending}>Salvar alterações</Button></div>}
      </form>
    </section>
  );
}
