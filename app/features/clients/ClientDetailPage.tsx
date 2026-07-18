"use client";
import { useCallback, useMemo, useState } from "react";
import { ErrorState, LoadingState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { useModuleData } from "@/app/hooks/useModuleData";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { usePermissions } from "@/app/hooks/usePermissions";
import { markRecordView } from "@/app/features/notifications/record-views.service";
import { archiveClient, loadClientWorkspace, reactivateClient } from "./clients.service";
import { ClientHeader } from "./ClientHeader";
import { ClientNavigation } from "./ClientNavigation";
import type { ClientSection } from "./ClientNavigation";
import { ClientOverviewPanel } from "./ClientOverviewPanel";
import { ClientProjectsPanel } from "./ClientProjectsPanel";
import { ClientActivitiesPanel } from "./ClientActivitiesPanel";
import { ClientAgendaPanel } from "./ClientAgendaPanel";
import { ClientFinancialPanel } from "./ClientFinancialPanel";
import { ClientFilesPanel } from "./ClientFilesPanel";
import { ClientNotesPanel } from "./ClientNotesPanel";
import { ClientHistoryPanel } from "./ClientHistoryPanel";
import { ClientFormDrawer } from "./ClientFormDrawer";
import type { ClientWorkspace } from "./types";
import { isFinancialAdministrator } from "@/app/services/security/financial-access";

const allowed=new Set<ClientSection>(["overview","projects","activities","agenda","finance","files","notes","history"]);
export function ClientDetailPage({clientId}:{clientId:string}){
 const{can,access}=usePermissions();
 const showFinance=isFinancialAdministrator(access.profileCode);
 const loader=useCallback(()=>loadClientWorkspace(clientId,showFinance),[clientId,showFinance]);
 const{data,loading,error,reload}=useModuleData<ClientWorkspace|null>(loader,null);const action=useAsyncAction();const[editing,setEditing]=useState(false);
 const[selected,setSelected]=useState<ClientSection>(()=>{if(typeof window==="undefined")return"overview";const value=new URLSearchParams(window.location.search).get("section") as ClientSection|null;return value&&allowed.has(value)?value:"overview"});
 const section=selected==="finance"&&!showFinance?"overview":selected;
 function changeSection(next:ClientSection){setSelected(next);if(["agenda","files","history"].includes(next))void markRecordView(clientId,next as "agenda"|"files"|"history","clients","client");const url=new URL(window.location.href);if(next==="overview")url.searchParams.delete("section");else url.searchParams.set("section",next);window.history.replaceState({},"",url)}
 const counts=useMemo(()=>({projects:data?.projects.length??0,activities:data?.activities.length??0,agenda:data?.agenda.length??0,finance:data?.finance?.entries.length??0,files:data?.files.length??0,notes:data?.notes.length??0,history:data?.history.length??0}),[data]);
 async function archive(){if(!data||!confirm(`Arquivar ${data.client.name}?`))return;const result=await action.run(()=>archiveClient(clientId),"Cliente arquivado.");if(result.ok)await reload()}
 async function reactivate(){const result=await action.run(()=>reactivateClient(clientId),"Cliente reativado.");if(result.ok)await reload()}
 if(loading)return <LoadingState label="Carregando cliente…"/>;if(error||!data)return <ErrorState message={error||"Cliente não encontrado."} onRetry={()=>void reload()}/>;
 return <div className="cs-client-detail"><ClientHeader client={data.client} canEdit={can("clients","edit")} canArchive={can("clients",data.client.archived_at?"reactivate":"archive")} onEdit={()=>setEditing(true)} onArchive={()=>void archive()} onReactivate={()=>void reactivate()}/><FeedbackMessage error={action.error} success={action.success}/><ClientNavigation active={section} onChange={changeSection} counts={counts} showFinance={showFinance}/><main className="cs-client-detail-content">{section==="overview"&&<ClientOverviewPanel data={data} showFinancial={showFinance}/>} {section==="projects"&&<ClientProjectsPanel clientId={clientId} projects={data.projects} canCreate={can("projects","create")} showValues={showFinance}/>} {section==="activities"&&<ClientActivitiesPanel clientId={clientId} activities={data.activities}/>} {section==="agenda"&&<ClientAgendaPanel clientId={clientId} items={data.agenda}/>} {section==="finance"&&showFinance&&data.finance&&<ClientFinancialPanel finance={data.finance}/>} {section==="files"&&<ClientFilesPanel clientId={clientId} files={data.files} canAdd={can("files","add_file")} canReplace={can("files","add_file")||can("files","edit")} canArchive={can("files","archive")||can("files","remove_file")} onChanged={reload}/>} {section==="notes"&&<ClientNotesPanel clientId={clientId} notes={data.notes} types={data.options.noteTypes} canManage={can("clients","manage_notes")||can("clients","edit")} onChanged={reload}/>} {section==="history"&&<ClientHistoryPanel history={data.history}/>}</main>{editing&&<ClientFormDrawer client={data.client} phones={data.phones} emails={data.emails} options={data.options} canManageContacts={can("clients","manage_contacts")} onClose={()=>setEditing(false)} onSaved={async()=>{await reload()}}/>}</div>
}
