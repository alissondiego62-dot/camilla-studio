"use client";
import { useCallback } from "react";
import { Modal } from "@/app/components/ui/Modal";
import { LoadingState, ErrorState } from "@/app/components/ui/DataState";
import { Button } from "@/app/components/ui/Button";
import { dateTime } from "@/app/config/regions";
import { useModuleData } from "@/app/hooks/useModuleData";
import { listFileVersions, openLinkedFile } from "./file-manager.service";
import type { LinkedFile } from "./types";

export function FileVersionList({ file, onClose }: { file: LinkedFile; onClose: () => void }) {
  const loader = useCallback(() => listFileVersions(file), [file]); const { data, loading, error, reload } = useModuleData(loader, []);
  return <Modal title={`Versões — ${file.name}`} onClose={onClose}>{error ? <ErrorState message={error} onRetry={() => void reload()} /> : loading ? <LoadingState /> : <div className="cs-record-list">{data.map((item) => <article key={item.id}><div><h4>Versão {item.version}</h4><p>{dateTime(item.created_at)} · {item.author?.name || item.author?.email || "Sistema"}</p><small>{item.archived_at ? "Versão anterior" : "Versão atual"}</small></div><Button onClick={() => void openLinkedFile(item)}>Abrir</Button></article>)}</div>}</Modal>;
}
