"use client";

import { useMemo, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { ProgressBar } from "@/app/components/ui/ProgressBar";
import { EmptyState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { dateTime } from "@/app/config/regions";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import type { ProjectChecklistItem } from "@/app/domain/architecture-types";
import { updateChecklistItem } from "./project-detail.service";

export function ProjectChecklistPanel({ items, currentStage, canEdit, canWaive, onChanged }: { items: ProjectChecklistItem[]; currentStage: string; canEdit: boolean; canWaive: boolean; onChanged: () => Promise<void> }) {
  const action = useAsyncAction(); const [waive, setWaive] = useState<ProjectChecklistItem | null>(null); const [reason, setReason] = useState("");
  const current = items.filter((item) => item.stage === currentStage);
  const completed = current.filter((item) => item.completed_at || item.waived_at).length;
  const progress = current.length ? completed / current.length * 100 : 0;
  const sections = useMemo(() => { const map = new Map<string, ProjectChecklistItem[]>(); for (const item of current) { const list = map.get(item.section) ?? []; list.push(item); map.set(item.section, list); } return [...map.entries()]; }, [current]);
  async function run(item: ProjectChecklistItem, command: "complete" | "reopen") { const result = await action.run(() => updateChecklistItem(item.id, command), command === "complete" ? "Item concluído." : "Item reaberto."); if (result.ok) await onChanged(); }
  async function confirmWaive() { if (!waive) return; const result = await action.run(() => updateChecklistItem(waive.id, "waive", reason.trim()), "Item obrigatório dispensado com justificativa."); if (result.ok) { setWaive(null); setReason(""); await onChanged(); } }
  return <section className="cs-project-panel"><div className="cs-section-heading"><div><h3>Checklist operacional</h3><p>Snapshot da etapa atual. Alterações futuras no modelo não modificam este checklist.</p></div></div><FeedbackMessage error={action.error} success={action.success} />{current.length === 0 ? <EmptyState title="Nenhum checklist aplicado" description="O checklist da etapa é aplicado automaticamente quando existe um modelo ativo." /> : <><ProgressBar value={progress} label="Progresso do checklist" /><div className="cs-checklist-project">{sections.map(([section, rows]) => <section key={section}><h4>{section}</h4>{rows.map((item) => <article key={item.id} className={item.completed_at ? "is-complete" : item.waived_at ? "is-waived" : ""}><div><strong>{item.title}</strong><span>{item.required ? "Obrigatório" : "Opcional"}{item.completed_at ? ` · concluído em ${dateTime(item.completed_at)}` : item.waived_at ? ` · dispensado: ${item.waiver_reason}` : ""}</span></div>{canEdit && <div className="cs-row-actions"><Button variant="text" onClick={() => void run(item, item.completed_at || item.waived_at ? "reopen" : "complete")}>{item.completed_at || item.waived_at ? "Reabrir" : "Concluir"}</Button>{item.required && !item.completed_at && !item.waived_at && canWaive && <Button variant="text" onClick={() => setWaive(item)}>Dispensar</Button>}</div>}</article>)}</section>)}</div></>}{waive && <Modal title="Dispensar item obrigatório" onClose={() => setWaive(null)}><p>Informe a justificativa. A ação será registrada no histórico.</p><textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Justificativa obrigatória" /><div className="cs-form-actions"><Button type="button" onClick={() => setWaive(null)}>Cancelar</Button><Button variant="primary" disabled={!reason.trim()} loading={action.pending} onClick={() => void confirmWaive()}>Confirmar dispensa</Button></div></Modal>}</section>;
}
