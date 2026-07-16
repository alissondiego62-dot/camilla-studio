"use client";

import { useCallback, useMemo, useState } from "react";
import { Modal } from "@/app/components/ui/Modal";
import { Button } from "@/app/components/ui/Button";
import { SelectField } from "@/app/components/ui/FormField";
import { EmptyState, ErrorState, LoadingState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { useModuleData } from "@/app/hooks/useModuleData";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { dateOnly } from "@/app/config/regions";
import type { ProfileRow } from "./types";
import {
  assignActivityToUser, assignProjectToUser, listAssignableActivities, listAssignableProjects,
  loadUserAssignments, removeActivityFromUser, removeProjectFromUser,
} from "./users.service";

export function UserDetailsDrawer({ user, onClose, canManage=false }: { user: ProfileRow; onClose:()=>void; canManage?:boolean }) {
  const loader=useCallback(async()=>{const [assigned,allProjects,allActivities]=await Promise.all([loadUserAssignments(user.id),listAssignableProjects(),listAssignableActivities()]);return{...assigned,allProjects,allActivities}},[user.id]);
  const {data,loading,error,reload}=useModuleData(loader,{projects:[],activities:[],allProjects:[],allActivities:[]});
  const {pending,error:actionError,success,run}=useAsyncAction();
  const [projectId,setProjectId]=useState("");const [activityId,setActivityId]=useState("");
  const availableProjects=useMemo(()=>data.allProjects.filter(item=>!data.projects.some(linked=>linked.id===item.id)),[data]);
  const availableActivities=useMemo(()=>data.allActivities.filter(item=>item.responsible_user_id!==user.id),[data,user.id]);
  async function mutate(action:()=>Promise<unknown>,message:string){const result=await run(action,message);if(result.ok)void reload()}
  return <Modal title={`Vínculos de ${user.name}`} onClose={onClose}>
    <FeedbackMessage error={actionError} success={success}/>
    {error?<ErrorState message={error} onRetry={()=>void reload()}/>:loading?<LoadingState/>:<div className="cs-grid-2">
      <section className="cs-card"><h2>Projetos atribuídos</h2>
        {canManage&&<div className="cs-inline-form"><SelectField label="Adicionar projeto" value={projectId} onChange={event=>setProjectId(event.target.value)}><option value="">Selecione</option>{availableProjects.map(item=><option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</SelectField><Button variant="primary" disabled={!projectId||pending} onClick={()=>void mutate(async()=>{await assignProjectToUser(user.id,projectId);setProjectId("")},"Projeto vinculado.")}>Vincular</Button></div>}
        {data.projects.length?<ul className="cs-clean-list">{data.projects.map(item=><li key={item.id}><div><strong>{item.code}</strong> — {item.name}</div>{canManage&&<Button variant="danger" disabled={pending} onClick={()=>void mutate(()=>removeProjectFromUser(user.id,item.id),"Projeto desvinculado.")}>Remover</Button>}</li>)}</ul>:<EmptyState title="Sem projetos" description="Este usuário não possui projetos atribuídos."/>}
      </section>
      <section className="cs-card"><h2>Atividades atribuídas</h2>
        {canManage&&<div className="cs-inline-form"><SelectField label="Adicionar atividade" value={activityId} onChange={event=>setActivityId(event.target.value)}><option value="">Selecione</option>{availableActivities.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</SelectField><Button variant="primary" disabled={!activityId||pending} onClick={()=>void mutate(async()=>{await assignActivityToUser(user.id,activityId);setActivityId("")},"Atividade atribuída.")}>Atribuir</Button></div>}
        {data.activities.length?<ul className="cs-clean-list">{data.activities.map(item=><li key={item.id}><div>{item.title}<small>{item.due_date?` · ${dateOnly(item.due_date)}`:" · Sem prazo"}</small></div>{canManage&&<Button variant="danger" disabled={pending} onClick={()=>void mutate(()=>removeActivityFromUser(user.id,item.id),"Atividade desvinculada.")}>Remover</Button>}</li>)}</ul>:<EmptyState title="Sem atividades" description="Este usuário não possui atividades atribuídas."/>}
      </section>
    </div>}
  </Modal>;
}
