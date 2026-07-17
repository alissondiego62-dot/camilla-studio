"use client";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/app/components/ui/DataState";
import { dateOnly, dateTime } from "@/app/config/regions";
import { ProgressBar } from "@/app/components/ui/ProgressBar";
import type { ClientActivitySummary } from "./types";
export function ClientActivitiesPanel({clientId,activities=[]}:{clientId:string;clientName?:string;activities?:ClientActivitySummary[];onClose?:()=>void}){const[now]=useState(()=>Date.now());return <section className="cs-client-panel"><div className="cs-section-heading"><div><h2>Atividades</h2><p>Pendentes, atrasadas, concluídas e relacionadas aos projetos.</p></div><Link className="cs-button cs-button-primary" href={`/activities?client=${clientId}&new=1`}>Nova atividade</Link></div>{activities.length===0?<EmptyState title="Nenhuma atividade" description="Crie uma atividade já vinculada ao cliente."/>:<div className="cs-record-list">{activities.map(item=>{const overdue=Boolean(item.due_at&&new Date(item.due_at).getTime()<now&&!['completed','cancelled'].includes(item.status));return <article key={item.id}><div><Link href={`/activities?activity=${item.id}`}><h4>{item.title}</h4></Link><p>{item.project?`${item.project.code} · ${item.project.name}`:"Atividade geral"}</p><small>{item.due_at?dateTime(item.due_at):dateOnly(item.due_date)}{overdue&&<b className="cs-danger-text"> · Atrasada</b>}</small><ProgressBar value={item.progress}/></div><span className="cs-badge">{item.status}</span></article>})}</div>}</section>}
