"use client";
import { useMemo, useState } from "react";
import { Button } from "@/app/components/ui/Button";
import type { ActivityRow, ActivityWorkspaceOptions } from "../types";
import { statusLabel } from "../activity-display";
function isoDay(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
export function ActivityCalendarView({items,options,onOpen}:{items:ActivityRow[];options:ActivityWorkspaceOptions;onOpen:(id:string)=>void}){
 const[anchor,setAnchor]=useState(()=>new Date());
 const days=useMemo(()=>{const first=new Date(anchor.getFullYear(),anchor.getMonth(),1);const start=new Date(first);start.setDate(start.getDate()-start.getDay());return Array.from({length:42},(_,i)=>{const date=new Date(start);date.setDate(start.getDate()+i);return date})},[anchor]);
 const byDay=useMemo(()=>{const map=new Map<string,ActivityRow[]>();for(const item of items){const raw=item.due_at??item.due_date??item.starts_at;if(!raw)continue;const key=raw.slice(0,10);map.set(key,[...(map.get(key)??[]),item])}return map},[items]);
 return <section className="cs-activity-calendar"><header><div><Button onClick={()=>setAnchor(new Date(anchor.getFullYear(),anchor.getMonth()-1,1))}>‹</Button><Button onClick={()=>setAnchor(new Date())}>Hoje</Button><Button onClick={()=>setAnchor(new Date(anchor.getFullYear(),anchor.getMonth()+1,1))}>›</Button></div><h3>{anchor.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</h3></header><div className="cs-calendar-weekdays">{["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d)=><span key={d}>{d}</span>)}</div><div className="cs-calendar-grid">{days.map((date)=>{const key=isoDay(date);const events=byDay.get(key)??[];return <article key={key} className={date.getMonth()===anchor.getMonth()?"":"is-outside"}><time>{date.getDate()}</time>{events.slice(0,4).map((item)=><button type="button" key={item.id} onClick={()=>onOpen(item.id)} title={`${item.title} · ${statusLabel(item.status,options.statuses)}`}>{item.title}</button>)}{events.length>4&&<small>+{events.length-4} atividades</small>}</article>})}</div></section>
}
