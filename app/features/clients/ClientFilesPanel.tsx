"use client";
import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/DataState";
import { dateTime } from "@/app/config/regions";
import { FileActions } from "@/app/features/file-manager/FileActions";
import { FileUploadModal } from "@/app/features/file-manager/FileUploadModal";
import type { LinkedFile } from "@/app/features/file-manager/types";
export function ClientFilesPanel({clientId,files,canAdd,canReplace,canArchive,onChanged}:{clientId:string;files:LinkedFile[];canAdd:boolean;canReplace:boolean;canArchive:boolean;onChanged:()=>Promise<void>}){const[open,setOpen]=useState(false);return <section className="cs-client-panel"><div className="cs-section-heading"><div><h2>Arquivos</h2><p>Contratos, propostas, documentos, referências, imagens e links do Drive.</p></div>{canAdd&&<Button variant="primary" onClick={()=>setOpen(true)}>Adicionar arquivo</Button>}</div>{files.length===0?<EmptyState title="Nenhum arquivo" description="Anexe documentos diretamente à ficha do cliente."/>:<div className="cs-record-list cs-linked-file-list">{files.map(file=><article key={file.id}><div><h4>{file.name}</h4><p>{file.category} · versão {file.version} · {dateTime(file.created_at)}</p><small>{file.origin==="supabase_storage"?file.mime_type||"Arquivo":"Google Drive / link externo"}</small>{file.project_id&&<small>Relacionado também a um projeto.</small>}</div><FileActions file={file} canReplace={canReplace} canArchive={canArchive} onChanged={onChanged}/></article>)}</div>}{open&&<FileUploadModal relation={{client_id:clientId}} onClose={()=>setOpen(false)} onSaved={onChanged}/>}</section>}
