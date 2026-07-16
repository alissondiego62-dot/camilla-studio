"use client";

import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/DataState";
import { dateTime } from "@/app/config/regions";
import { FileActions } from "@/app/features/file-manager/FileActions";
import { FileUploadModal } from "@/app/features/file-manager/FileUploadModal";
import { markFilesViewed } from "@/app/features/file-manager/file-manager.service";
import type { LinkedFile } from "@/app/features/file-manager/types";

export function ProjectFilesPanel({ projectId, files, canAdd, canReplace, canRemove, onChanged }: { projectId: string; files: LinkedFile[]; canAdd: boolean; canReplace: boolean; canRemove: boolean; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { void markFilesViewed(projectId); }, [projectId]);
  return <section className="cs-project-panel"><div className="cs-section-heading"><div><h3>Arquivos</h3><p>Uploads privados, links do Google Drive, versões e documentos relacionados.</p></div>{canAdd && <Button variant="primary" onClick={() => setOpen(true)}>Adicionar arquivo</Button>}</div>{files.length === 0 ? <EmptyState title="Nenhum arquivo" description="Os arquivos autorizados aparecerão aqui." /> : <div className="cs-record-list cs-linked-file-list">{files.map((item) => <article key={item.id}><div><h4>{item.name}</h4><p>{item.category} · versão {item.version} · {dateTime(item.created_at)}</p><small>{item.origin === "supabase_storage" ? `${item.mime_type || "Arquivo"} · ${item.file_size ? `${(item.file_size / 1024 / 1024).toFixed(2)} MB` : "Tamanho não informado"}` : "Google Drive / link externo"}</small>{item.notes && <small>{item.notes}</small>}</div><FileActions file={item} canReplace={canReplace} canArchive={canRemove} onChanged={onChanged} /></article>)}</div>}{open && <FileUploadModal relation={{ project_id: projectId }} onClose={() => setOpen(false)} onSaved={onChanged} />}</section>;
}
