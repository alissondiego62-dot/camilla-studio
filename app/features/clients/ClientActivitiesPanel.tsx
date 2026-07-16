"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/app/components/ui/Modal";
import { Button } from "@/app/components/ui/Button";
import { dateOnly, dateTime } from "@/app/config/regions";
import { listClientActivities } from "./clients.service";
import type { ClientActivitySummary } from "./types";
export function ClientActivitiesPanel({clientId,clientName,onClose}:{clientId:string;clientName:string;onClose:()=>void}){const[items,setItems]=useState<ClientActivitySummary[]>([]);const[loading,setLoading]=useState(true);const load=useCallback(async()=>{setLoading(true);try{setItems(await listClientActivities(clientId))}finally{setLoading(false)}},[clientId]);useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer)},[load]);return <Modal title={`Atividades de ${clientName}`} onClose={onClose}><div className="cs-section-heading"><p>Atividades vinculadas diretamente ou por projeto.</p><Link className="cs-button cs-button-primary" href={`/activities?client=${clientId}&new=1`}>Nova atividade</Link></div>{loading?<p>Carregando…</p>:items.length===0?<p className="cs-empty-note">Nenhuma atividade vinculada.</p>:<div className="cs-record-list">{items.map((item)=><article key={item.id}><div><Link href={`/activities?activity=${item.id}`}><h4>{item.title}</h4></Link><p>{item.project?`${item.project.code} · ${item.project.name}`:"Atividade geral"}</p><small>{item.due_at?dateTime(item.due_at):dateOnly(item.due_date)} · {item.progress}%</small></div><span className="cs-badge">{item.status}</span></article>)}</div>}<div className="cs-form-actions"><Button onClick={onClose}>Fechar</Button></div></Modal>}
