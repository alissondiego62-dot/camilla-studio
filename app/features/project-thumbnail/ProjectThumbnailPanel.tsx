/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import type { ProjectThumbnail } from "@/app/features/project-detail/types";
import { removeProjectThumbnail, uploadProjectThumbnail, validateThumbnailFile } from "./project-thumbnail.service";

export function ProjectThumbnailPanel({ projectId, projectName, thumbnail, legacyUrl, canAdd, canRemove, onChanged }: {
  projectId: string; projectName: string; thumbnail: ProjectThumbnail | null; legacyUrl: string | null; canAdd: boolean; canRemove: boolean; onChanged: () => Promise<void>;
}) {
  const action = useAsyncAction();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const current = preview || thumbnail?.signed_url || (legacyUrl?.startsWith("http") ? legacyUrl : null);

  async function upload() {
    if (!file) return;
    const result = await action.run(() => uploadProjectThumbnail(projectId, file), "Miniatura atualizada.");
    if (result.ok) { setFile(null); await onChanged(); }
  }
  async function remove() {
    if (!thumbnail) return;
    const result = await action.run(() => removeProjectThumbnail(thumbnail), "Miniatura removida.");
    if (result.ok) await onChanged();
  }

  return (
    <section className="cs-card cs-thumbnail-panel">
      <div className="cs-section-heading"><div><h3>Miniatura do projeto</h3><p>PNG, JPG, JPEG ou WEBP, até 8 MB.</p></div></div>
      <div className="cs-thumbnail-preview">{current ? <img src={current} alt={`Miniatura de ${projectName}`} /> : <span>{projectName.slice(0, 2).toUpperCase()}</span>}</div>
      <FeedbackMessage error={action.error} success={action.success} />
      {(canAdd || canRemove) && <div className="cs-thumbnail-actions">
        {canAdd && <label className="cs-file-input"><span>{thumbnail ? "Substituir miniatura" : "Selecionar miniatura"}</span><input type="file" accept="image/png,image/jpeg,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => { const selected = event.target.files?.[0] ?? null; if (selected) { try { validateThumbnailFile(selected); action.clearFeedback(); setFile(selected); } catch (reason) { setFile(null); void action.run(async () => { throw reason; }); } } }} /></label>}
        {file && <Button variant="primary" loading={action.pending} onClick={() => void upload()}>Enviar miniatura</Button>}
        {thumbnail && canRemove && <Button variant="danger" loading={action.pending} onClick={() => void remove()}>Remover</Button>}
      </div>}
      {thumbnail && <small>Versão {thumbnail.version} · enviada em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Boa_Vista", hour12: false }).format(new Date(thumbnail.created_at))}</small>}
    </section>
  );
}
