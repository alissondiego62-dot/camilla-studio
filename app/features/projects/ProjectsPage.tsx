"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { priorityLabels, projectStageLabel, statusLabels } from "@/app/domain/architecture-config";
import { dateOnly } from "@/app/config/regions";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { EmptyState, ErrorState, LoadingState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { FormField } from "@/app/components/ui/FormField";
import { useModuleData } from "@/app/hooks/useModuleData";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { usePermissions } from "@/app/hooks/usePermissions";
import { createProject, listProjectFormOptions, listProjects } from "./projects.service";
import { listWorkflow } from "@/app/features/settings/settings.service";
import type { ProjectFormOptions } from "./types";

const emptyOptions: ProjectFormOptions = { clients: [], users: [] };

export function ProjectsPage() {
  const loader = useCallback(() => listProjects(), []);
  const optionLoader = useCallback(() => listProjectFormOptions(), []);
  const { data: items, loading, error, reload } = useModuleData(loader, []);
  const { data: options } = useModuleData(optionLoader, emptyOptions);
  const stageLoader = useCallback(() => listWorkflow("project_stages"), []);
  const statusLoader = useCallback(() => listWorkflow("project_statuses"), []);
  const { data: stageCatalog } = useModuleData(stageLoader, []);
  const { data: statusCatalog } = useModuleData(statusLoader, []);
  const activeStageCatalog = stageCatalog.filter((row) => row.active && !row.archived_at);
  const activeStatusCatalog = statusCatalog.filter((row) => row.active && !row.archived_at);
  const action = useAsyncAction();
  const { can } = usePermissions();
  const params = useSearchParams();
  const defaultClientId = params.get("client") ?? "";
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(() => params.get("new") === "1" && can("projects", "create"));

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((project) => `${project.code} ${project.name} ${project.client?.name ?? ""}`.toLowerCase().includes(term));
  }, [items, query]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const responsibleId = String(form.get("responsible_user_id") || "") || null;
    const responsible = options.users.find((user) => user.id === responsibleId);
    const result = await action.run(
      () => createProject({
        code: String(form.get("code") || "").trim(),
        name: String(form.get("name") || "").trim(),
        client_id: String(form.get("client_id") || "") || null,
        project_type: String(form.get("project_type") || "Arquitetura").trim(),
        subtype: String(form.get("subtype") || "").trim() || null,
        stage: String(form.get("stage") || "briefing_preliminary"),
        status: String(form.get("status") || "not_started"),
        priority: String(form.get("priority") || "normal"),
        responsible_user_id: responsibleId,
        responsible_name: responsible?.name ?? null,
        main_deadline: String(form.get("deadline") || "") || null,
        notes: String(form.get("notes") || "").trim() || null,
      }),
      "Projeto cadastrado com sucesso.",
    );
    if (result.ok) {
      setOpen(false);
      await reload();
    }
  }

  return (
    <ModuleFrame
      title="Projetos"
      subtitle="Cadastro, acompanhamento e acesso à página completa de cada projeto"
      actions={can("projects", "create") ? <Button variant="primary" onClick={() => { action.clearFeedback(); setOpen(true); }}>Novo projeto</Button> : undefined}
    >
      <div className="cs-toolbar">
        <input aria-label="Pesquisar projetos" placeholder="Pesquisar projeto ou cliente" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Button type="button" onClick={() => void reload()}>Atualizar</Button>
      </div>
      <FeedbackMessage error={action.error} success={action.success} />
      {error && <ErrorState message={error} onRetry={() => void reload()} />}
      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <EmptyState title="Nenhum projeto" description="Cadastre o primeiro projeto ou ajuste a pesquisa." />
      ) : (
        <div className="cs-table-wrap">
          <table className="cs-table cs-projects-table">
            <thead><tr><th>Projeto</th><th>Cliente</th><th>Etapa</th><th>Status</th><th>Responsável</th><th>Prazo</th><th /></tr></thead>
            <tbody>
              {filtered.map((project) => (
                <tr key={project.id}>
                  <td data-label="Projeto"><strong>{project.code}</strong><span>{project.name}</span></td>
                  <td data-label="Cliente">{project.client?.name ?? "—"}</td>
                  <td data-label="Etapa"><span className="cs-badge">{stageCatalog.find((row) => row.code === project.stage)?.name ?? projectStageLabel(project.stage)}</span></td>
                  <td data-label="Status">{statusCatalog.find((row) => row.code === project.status)?.name ?? statusLabels[project.status as keyof typeof statusLabels] ?? project.status}</td>
                  <td data-label="Responsável">{project.responsible_name ?? "Não definido"}</td>
                  <td data-label="Prazo">{dateOnly(project.main_deadline)}</td>
                  <td data-label="Ações"><Link className="cs-link-button" href={`/projects/${project.id}`}>Abrir projeto</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal title="Novo projeto" onClose={() => setOpen(false)}>
          <form className="cs-form-grid" onSubmit={submit}>
            <FormField label="Código" name="code" required />
            <FormField label="Nome" name="name" required />
            <label><span>Cliente</span><select name="client_id" defaultValue={defaultClientId}><option value="">Não informado</option>{options.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <label><span>Responsável</span><select name="responsible_user_id" defaultValue=""><option value="">Não atribuído</option>{options.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            <FormField label="Tipo" name="project_type" defaultValue="Arquitetura" required />
            <FormField label="Subtipo" name="subtype" />
            <label><span>Etapa inicial</span><select name="stage" defaultValue="briefing_preliminary">{activeStageCatalog.filter((stage) => !stage.final).map((stage) => <option key={stage.code} value={stage.code}>{stage.name}</option>)}</select></label>
            <label><span>Status</span><select name="status" defaultValue="not_started">{activeStatusCatalog.filter((status) => !status.final).map((status) => <option key={status.code} value={status.code}>{status.name}</option>)}</select></label>
            <label><span>Prioridade</span><select name="priority" defaultValue="normal">{Object.entries(priorityLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
            <FormField label="Prazo principal" name="deadline" type="date" />
            <label className="cs-span-2"><span>Observações</span><textarea name="notes" rows={3} /></label>
            <div className="cs-form-actions"><Button type="button" onClick={() => setOpen(false)}>Cancelar</Button><Button variant="primary" loading={action.pending}>Salvar</Button></div>
          </form>
        </Modal>
      )}
    </ModuleFrame>
  );
}
