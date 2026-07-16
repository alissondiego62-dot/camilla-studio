"use client";
import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { archiveLinkedFile, openLinkedFile } from "./file-manager.service";
import { FileUploadModal } from "./FileUploadModal";
import { FileVersionList } from "./FileVersionList";
import { FileMetadataModal } from "./FileMetadataModal";
import type { LinkedFile } from "./types";

export function FileActions({ file, canReplace, canArchive, onChanged }: { file: LinkedFile; canReplace: boolean; canArchive: boolean; onChanged: () => Promise<void> }) {
  const action = useAsyncAction(); const [replace, setReplace] = useState(false); const [versions, setVersions] = useState(false); const [editing, setEditing] = useState(false);
  async function archive() { if (!confirm("Arquivar este arquivo? As versões serão preservadas.")) return; const result = await action.run(() => archiveLinkedFile(file.id), "Arquivo arquivado."); if (result.ok) await onChanged(); }
  const relation = { project_id: file.project_id, client_id: file.client_id, activity_id: file.activity_id, financial_entry_id: file.financial_entry_id };
  return <div className="cs-file-actions"><Button variant="text" onClick={() => void openLinkedFile(file)}>Abrir</Button>{file.download_allowed && <Button variant="text" onClick={() => void openLinkedFile(file, true)}>Baixar</Button>}<Button variant="text" onClick={() => setVersions(true)}>Versões</Button>{canReplace && <Button variant="text" onClick={() => setEditing(true)}>Editar dados</Button>}{canReplace && <Button variant="text" onClick={() => setReplace(true)}>Substituir</Button>}{canArchive && <Button variant="text" onClick={() => void archive()}>Arquivar</Button>}{replace && <FileUploadModal relation={relation} replaces={file} onClose={() => setReplace(false)} onSaved={onChanged} />}{versions && <FileVersionList file={file} onClose={() => setVersions(false)} />}{editing && <FileMetadataModal file={file} onClose={() => setEditing(false)} onSaved={onChanged} />}</div>;
}
