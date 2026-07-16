"use client";

import type { FormEvent } from "react";
import { Modal } from "@/app/components/ui/Modal";
import { Button } from "@/app/components/ui/Button";
import { FormField } from "@/app/components/ui/FormField";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { updateLinkedFileMetadata } from "./file-manager.service";
import type { LinkedFile } from "./types";

export function FileMetadataModal({ file, onClose, onSaved }: { file: LinkedFile; onClose: () => void; onSaved: () => Promise<void> }) {
  const action = useAsyncAction();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await action.run(() => updateLinkedFileMetadata(file.id, {
      name: String(form.get("name") || ""),
      category: String(form.get("category") || "other"),
      notes: String(form.get("notes") || "") || null,
      drive_url: file.origin === "supabase_storage" ? null : String(form.get("drive_url") || "").trim(),
      download_allowed: form.get("download_allowed") === "on",
    }), "Dados do arquivo atualizados.");
    if (result.ok) { await onSaved(); onClose(); }
  }
  return <Modal title="Editar arquivo" onClose={onClose}><form className="cs-form-grid" onSubmit={submit}>
    <FeedbackMessage error={action.error} success={action.success} />
    <FormField className="cs-span-2" label="Nome" name="name" defaultValue={file.name} required />
    <FormField label="Categoria" name="category" defaultValue={file.category} required />
    {file.origin !== "supabase_storage" && <FormField className="cs-span-2" label="Link" name="drive_url" type="url" defaultValue={file.drive_url ?? ""} required />}
    <label className="cs-span-2"><span>Observações</span><textarea name="notes" rows={3} defaultValue={file.notes ?? ""} /></label>
    <label className="cs-check-option cs-span-2"><input type="checkbox" name="download_allowed" defaultChecked={file.download_allowed} /> Permitir download</label>
    <div className="cs-form-actions"><Button type="button" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={action.pending}>Salvar</Button></div>
  </form></Modal>;
}
