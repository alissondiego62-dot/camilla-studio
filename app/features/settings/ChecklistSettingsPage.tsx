"use client";

import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { activeStages, projectStageLabel } from "@/app/domain/architecture-config";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { EmptyState, ErrorState, LoadingState } from "@/app/components/ui/DataState";
import { FormField, SelectField } from "@/app/components/ui/FormField";
import { useModuleData } from "@/app/hooks/useModuleData";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { usePermissions } from "@/app/hooks/usePermissions";
import type { ChecklistTemplate, ChecklistTemplateItem } from "@/app/features/checklists/types";
import { archiveChecklistItem, duplicateChecklistTemplate, listChecklistTemplates, reorderChecklistItems, saveChecklistItem, saveChecklistTemplate } from "@/app/features/checklists/checklists.service";

const stages = activeStages;

export function ChecklistSettingsPage() {
  const { can } = usePermissions();
  const loader = useCallback(() => listChecklistTemplates(), []);
  const { data, loading, error, reload } = useModuleData(loader, []);
  const [template, setTemplate] = useState<ChecklistTemplate | undefined>();
  const [item, setItem] = useState<ChecklistTemplateItem | undefined>();
  const [templateOpen, setTemplateOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const { pending, error: actionError, success, run } = useAsyncAction();
  const activeTemplates = data.filter((current) => current.stage_code !== "construction");

  async function submitTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await run(() => saveChecklistTemplate({ id: template?.id, name: String(form.get("name")), description: String(form.get("description") ?? ""), stage_code: String(form.get("stage_code")), active: form.get("active") === "on" }), "Modelo salvo.");
    if (result.ok) { setTemplateOpen(false); await reload(); }
  }
  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!template) return;
    const form = new FormData(event.currentTarget);
    const result = await run(() => saveChecklistItem({ id: item?.id, template_id: template.id, title: String(form.get("title")), section: String(form.get("section") ?? ""), required: form.get("required") === "on", active: form.get("active") === "on", position: Number(form.get("position") ?? template.items.length) }), "Item salvo.");
    if (result.ok) { setItemOpen(false); await reload(); }
  }
  async function duplicate(current: ChecklistTemplate, targetStage?: string) { const result = await run(() => duplicateChecklistTemplate(current.id, targetStage), targetStage ? "Modelo copiado para outra etapa." : "Modelo duplicado."); if (result.ok) await reload(); }
  async function move(current: ChecklistTemplate, index: number, direction: -1 | 1) { const next = index + direction; if (next < 0 || next >= current.items.length) return; const ordered = [...current.items]; [ordered[index], ordered[next]] = [ordered[next], ordered[index]]; const result = await run(() => reorderChecklistItems(ordered.map((row, position) => ({ id: row.id, position }))), "Ordem atualizada."); if (result.ok) await reload(); }

  return (
    <ModuleFrame title="Checklists" subtitle="Modelos versionados e cópias imutáveis por etapa" actions={can("checklists", "create") ? <Button variant="primary" onClick={() => { setTemplate(undefined); setTemplateOpen(true); }}>Criar checklist</Button> : undefined}>
      <FeedbackMessage error={actionError} success={success} />
      {error && <ErrorState message={error} onRetry={() => void reload()} />}
      {loading ? <LoadingState /> : activeTemplates.length === 0 ? <EmptyState title="Nenhum modelo" description="Crie o primeiro checklist padrão depois de aplicar o SQL da Etapa 03." /> : (
        <div className="cs-checklist-admin">
          {activeTemplates.map((current) => <article className="cs-card" key={current.id}>
            <header className="cs-card-header"><div><span className="cs-kicker">{projectStageLabel(current.stage_code)}</span><h2>{current.name}</h2><p>{current.description || "Sem descrição"} · versão {current.version}</p></div><span className={`cs-badge ${current.active ? "is-success" : "is-muted"}`}>{current.active ? "Ativo" : "Inativo"}</span></header>
            <div className="cs-checklist-items">{current.items.filter((row) => row.active).map((row, index) => <div className="cs-checklist-admin-item" key={row.id}><span>{index + 1}</span><div><strong>{row.title}</strong><small>{row.section || "Sem grupo"} · {row.required ? "Obrigatório" : "Opcional"}</small></div>{can("checklists", "edit") && <div className="cs-row-actions"><Button variant="text" onClick={() => void move(current, index, -1)} disabled={index === 0 || pending}>↑</Button><Button variant="text" onClick={() => void move(current, index, 1)} disabled={index === current.items.filter((entry) => entry.active).length - 1 || pending}>↓</Button><Button variant="text" onClick={() => { setTemplate(current); setItem(row); setItemOpen(true); }}>Editar</Button><Button variant="danger" onClick={() => void run(() => archiveChecklistItem(row.id), "Item desativado.").then((result) => { if (result.ok) void reload(); })}>Desativar</Button></div>}</div>)}</div>
            {can("checklists", "edit") && <footer className="cs-row-actions"><Button onClick={() => { setTemplate(current); setItem(undefined); setItemOpen(true); }}>Adicionar item</Button><Button onClick={() => { setTemplate(current); setTemplateOpen(true); }}>Editar modelo</Button><Button onClick={() => void duplicate(current)}>Duplicar</Button><select aria-label="Copiar para etapa" defaultValue="" onChange={(event) => { if (event.target.value) void duplicate(current, event.target.value); event.target.value = ""; }}><option value="">Copiar para etapa…</option>{stages.filter((stage) => stage !== current.stage_code).map((stage) => <option key={stage} value={stage}>{projectStageLabel(stage)}</option>)}</select></footer>}
          </article>)}
        </div>
      )}
      {templateOpen && <Modal title={template ? "Editar checklist" : "Novo checklist"} onClose={() => setTemplateOpen(false)}><form className="cs-form-grid" onSubmit={submitTemplate}><FormField label="Nome" name="name" required defaultValue={template?.name} /><SelectField label="Etapa" name="stage_code" required defaultValue={template?.stage_code ?? stages[0]}>{stages.map((stage) => <option key={stage} value={stage}>{projectStageLabel(stage)}</option>)}</SelectField><label className="cs-span-2"><span>Descrição</span><textarea name="description" rows={3} defaultValue={template?.description ?? ""} /></label><label className="cs-check-option"><input type="checkbox" name="active" defaultChecked={template?.active ?? true} /><span>Ativo</span></label><div className="cs-span-2"><FeedbackMessage error={actionError} /></div><div className="cs-form-actions"><Button type="button" onClick={() => setTemplateOpen(false)}>Cancelar</Button><Button variant="primary" loading={pending}>Salvar</Button></div></form></Modal>}
      {itemOpen && template && <Modal title={item ? "Editar item" : "Adicionar item"} onClose={() => setItemOpen(false)}><form className="cs-form-grid" onSubmit={submitItem}><FormField className="cs-span-2" label="Item" name="title" required defaultValue={item?.title} /><FormField label="Grupo" name="section" defaultValue={item?.section ?? ""} /><FormField label="Posição" name="position" type="number" min="0" defaultValue={item?.position ?? template.items.length} /><label className="cs-check-option"><input type="checkbox" name="required" defaultChecked={item?.required ?? true} /><span>Obrigatório</span></label><label className="cs-check-option"><input type="checkbox" name="active" defaultChecked={item?.active ?? true} /><span>Ativo</span></label><div className="cs-span-2"><FeedbackMessage error={actionError} /></div><div className="cs-form-actions"><Button type="button" onClick={() => setItemOpen(false)}>Cancelar</Button><Button variant="primary" loading={pending}>Salvar item</Button></div></form></Modal>}
    </ModuleFrame>
  );
}
