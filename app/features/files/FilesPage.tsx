"use client";

import { useCallback, useMemo, useState } from "react";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { EmptyState, ErrorState, LoadingState } from "@/app/components/ui/DataState";
import { dateTime } from "@/app/config/regions";
import { useModuleData } from "@/app/hooks/useModuleData";
import { usePermissions } from "@/app/hooks/usePermissions";
import { FileActions } from "@/app/features/file-manager/FileActions";
import { FileUploadModal } from "@/app/features/file-manager/FileUploadModal";
import type { FileRelationType } from "@/app/features/file-manager/types";
import { listFileRelations, listFiles } from "./files.service";

export function FilesPage() {
  const filesLoader = useCallback(() => listFiles(), []); const relationsLoader = useCallback(() => listFileRelations(), []);
  const { data: items, loading, error, reload } = useModuleData(filesLoader, []); const { data: relations, loading: relationsLoading, error: relationsError, reload: reloadRelations } = useModuleData(relationsLoader, { projects: [], clients: [], activities: [], financial: [] });
  const { can } = usePermissions(); const [selecting, setSelecting] = useState(false); const [uploading, setUploading] = useState(false); const [relationType, setRelationType] = useState<FileRelationType>("project"); const [relationId, setRelationId] = useState(""); const [query, setQuery] = useState("");
  const canAdd = can("files", "add_file"); const canReplace = can("files", "add_file") || can("files", "edit"); const canArchive = can("files", "archive") || can("files", "remove_file");
  const options = relations[relationType === "project" ? "projects" : relationType === "client" ? "clients" : relationType === "activity" ? "activities" : "financial"];
  const filtered = useMemo(() => items.filter((item) => `${item.name} ${item.category} ${item.project?.name ?? ""} ${item.client?.name ?? ""} ${item.activity?.title ?? ""}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const relation = relationType === "project" ? { project_id: relationId } : relationType === "client" ? { client_id: relationId } : relationType === "activity" ? { activity_id: relationId } : { financial_entry_id: relationId };
  function beginUpload() { if (!relationId) return; setSelecting(false); setUploading(true); }
  return <ModuleFrame title="Arquivos" subtitle="Uploads privados, links do Google Drive e versões relacionadas aos registros" actions={canAdd ? <Button variant="primary" onClick={() => setSelecting(true)} disabled={relationsLoading}>Adicionar arquivo</Button> : undefined}>
    <div className="cs-toolbar"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar arquivo…" /></div>
    {relationsError && <ErrorState title="Não foi possível carregar os vínculos" message={relationsError} onRetry={() => void reloadRelations()} />}
    {error ? <ErrorState message={error} onRetry={() => void reload()} /> : loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState title="Nenhum arquivo" description="Adicione um upload, link externo ou documento do Google Drive." /> : <div className="cs-record-list cs-linked-file-list">{filtered.map((item) => <article key={item.id}><div><h4>{item.name}</h4><p>{item.project?.name || item.client?.name || item.activity?.title || item.financial?.description || "Registro relacionado"}</p><small>{item.category} · versão {item.version || 1} · {dateTime(item.created_at)}</small></div><FileActions file={item} canReplace={canReplace} canArchive={canArchive} onChanged={reload} /></article>)}</div>}
    {selecting && <Modal title="Selecionar vínculo" onClose={() => setSelecting(false)}><div className="cs-form-grid"><label><span>Vincular a</span><select value={relationType} onChange={(e) => { setRelationType(e.target.value as FileRelationType); setRelationId(""); }}><option value="project">Projeto</option><option value="client">Cliente</option><option value="activity">Atividade</option><option value="financial">Lançamento financeiro</option></select></label><label><span>Registro</span><select value={relationId} onChange={(e) => setRelationId(e.target.value)}><option value="">Selecione</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><div className="cs-form-actions"><Button onClick={() => setSelecting(false)}>Cancelar</Button><Button variant="primary" disabled={!relationId} onClick={beginUpload}>Continuar</Button></div></div></Modal>}
    {uploading && <FileUploadModal relation={relation} onClose={() => { setUploading(false); setRelationId(""); }} onSaved={reload} />}
  </ModuleFrame>;
}
