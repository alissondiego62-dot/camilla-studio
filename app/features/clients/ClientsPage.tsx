"use client";
import { useCallback, useState } from "react";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
import { EmptyState, ErrorState, LoadingState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { useModuleData } from "@/app/hooks/useModuleData";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { usePermissions } from "@/app/hooks/usePermissions";
import { archiveClient, listClientFormOptions, listClients, reactivateClient } from "./clients.service";
import { ClientCard } from "./ClientCard";
import { ClientFormDrawer } from "./ClientFormDrawer";
import { ClientsToolbar } from "./ClientsToolbar";
import type { ClientDirectoryRow, ClientFilters, ClientFormOptions } from "./types";
import { defaultClientFilters } from "./types";

const emptyOptions:ClientFormOptions={users:[],relationshipStatuses:[],sources:[],segments:[],noteTypes:[],fileCategories:[]};
export function ClientsPage(){
 const{can}=usePermissions();const[draft,setDraft]=useState<ClientFilters>(defaultClientFilters);const[applied,setApplied]=useState<ClientFilters>(defaultClientFilters);const[editing,setEditing]=useState<ClientDirectoryRow|null>(null);const[open,setOpen]=useState(false);const action=useAsyncAction();
 const loader=useCallback(()=>listClients(applied),[applied]);const optionsLoader=useCallback(()=>listClientFormOptions(),[]);const{data:items,loading,error,reload}=useModuleData(loader,[]);const{data:options}=useModuleData(optionsLoader,emptyOptions);
 async function archive(item:ClientDirectoryRow){if(!confirm(`Arquivar ${item.name}? Os vínculos serão preservados.`))return;const result=await action.run(()=>archiveClient(item.id),"Cliente arquivado.");if(result.ok)await reload()}
 async function reactivate(item:ClientDirectoryRow){const result=await action.run(()=>reactivateClient(item.id),"Cliente reativado.");if(result.ok)await reload()}
 return <ModuleFrame title="Clientes" subtitle="Cadastro completo, relacionamento e visão integrada"><ClientsToolbar filters={draft} options={options} canCreate={can("clients","create")} onFilters={setDraft} onApply={()=>setApplied({...draft})} onClear={()=>{setDraft(defaultClientFilters);setApplied(defaultClientFilters)}} onCreate={()=>{setEditing(null);setOpen(true)}} onReload={()=>void reload()}/><FeedbackMessage error={action.error} success={action.success}/>{error&&<ErrorState message={error} onRetry={()=>void reload()}/>} {loading?<LoadingState label="Carregando clientes…"/>:items.length===0?<EmptyState title="Nenhum cliente encontrado" description="Ajuste os filtros ou cadastre um novo cliente."/>:<div className="cs-card-grid cs-client-directory">{items.map(item=><ClientCard key={item.id} client={item} canEdit={can("clients","edit")} canArchive={can("clients",item.archived_at?"reactivate":"archive")} onEdit={()=>{setEditing(item);setOpen(true)}} onArchive={()=>void archive(item)} onReactivate={()=>void reactivate(item)}/>)}</div>}{open&&<ClientFormDrawer client={editing} options={options} canManageContacts={!editing||can("clients","manage_contacts")} onClose={()=>setOpen(false)} onSaved={async()=>{await reload()}}/>}</ModuleFrame>
}
