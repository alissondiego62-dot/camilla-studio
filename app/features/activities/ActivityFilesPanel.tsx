"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { FileUploadModal } from "@/app/features/file-manager/FileUploadModal";
import { FileActions } from "@/app/features/file-manager/FileActions";
import { listLinkedFiles } from "@/app/features/file-manager/file-manager.service";
import type { LinkedFile } from "@/app/features/file-manager/types";
import { dateTime } from "@/app/config/regions";
export function ActivityFilesPanel({activityId,canAdd,canArchive}:{activityId:string;canAdd:boolean;canArchive:boolean}){const[items,setItems]=useState<LinkedFile[]>([]);const[loading,setLoading]=useState(true);const[open,setOpen]=useState(false);const load=useCallback(async()=>{setLoading(true);try{setItems(await listLinkedFiles({activityId}))}finally{setLoading(false)}},[activityId]);useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[load]);return <section className="cs-activity-files"><header><div><h3>Anexos</h3><p>Arquivos e links vinculados à atividade.</p></div>{canAdd&&<Button variant="primary" onClick={()=>setOpen(true)}>Adicionar arquivo</Button>}</header>{loading?<p>Carregando…</p>:items.length===0?<p className="cs-empty-note">Nenhum arquivo vinculado.</p>:<div className="cs-record-list">{items.map((file)=><article key={file.id}><div><h4>{file.name}</h4><p>{file.category} · versão {file.version}</p><small>{file.mime_type??file.origin} · {dateTime(file.created_at)}</small></div><FileActions file={file} canReplace={canAdd} canArchive={canArchive} onChanged={load}/></article>)}</div>}{open&&<FileUploadModal relation={{activity_id:activityId}} onClose={()=>setOpen(false)} onSaved={load}/>}</section>}
