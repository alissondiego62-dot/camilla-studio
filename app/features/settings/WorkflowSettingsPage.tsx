"use client";

import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { EmptyState, ErrorState, LoadingState } from "@/app/components/ui/DataState";
import { FormField } from "@/app/components/ui/FormField";
import { useModuleData } from "@/app/hooks/useModuleData";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { usePermissions } from "@/app/hooks/usePermissions";
import type { WorkflowKind, WorkflowRow } from "./types";
import { deleteWorkflow, listWorkflow, reorderWorkflow, saveWorkflow, setWorkflowActive } from "./settings.service";

const labels:Record<WorkflowKind,string>={project_stages:"Etapas dos projetos",project_statuses:"Status dos projetos",activity_statuses:"Status das atividades"};

export function WorkflowSettingsPage(){
  const{can}=usePermissions();const[kind,setKind]=useState<WorkflowKind>("project_stages");
  const loader=useCallback(()=>listWorkflow(kind),[kind]);const{data,loading,error,reload}=useModuleData(loader,[]);
  const[editing,setEditing]=useState<WorkflowRow|undefined>();const[open,setOpen]=useState(false);const[deleting,setDeleting]=useState<WorkflowRow|undefined>();
  const{pending,error:actionError,success,run}=useAsyncAction();
  const ordered=useMemo(()=>[...data].sort((a,b)=>a.position-b.position||a.name.localeCompare(b.name,"pt-BR")),[data]);
  const replacements=ordered.filter(row=>row.active&&!row.archived_at&&row.id!==deleting?.id);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const result=await run(()=>saveWorkflow(kind,{id:editing?.id,code:String(f.get("code")),name:String(f.get("name")),color:String(f.get("color")||""),position:Number(f.get("position")||0),active:f.get("active")==="on",final:f.get("final")==="on"}),"Catálogo atualizado e sincronizado.");if(result.ok){setOpen(false);void reload()}}
  async function move(index:number,direction:-1|1){const next=index+direction;if(next<0||next>=ordered.length)return;const copy=[...ordered];[copy[index],copy[next]]=[copy[next],copy[index]];const result=await run(()=>reorderWorkflow(kind,copy.map(row=>row.id)),"Ordem atualizada.");if(result.ok)await reload()}
  async function toggle(row:WorkflowRow){const result=await run(()=>setWorkflowActive(kind,row.id,!row.active),row.active?"Item desativado e retirado das opções operacionais.":"Item reativado.");if(result.ok)await reload()}
  async function confirmDelete(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!deleting)return;const replacement=String(new FormData(e.currentTarget).get("replacement")||"");const result=await run(()=>deleteWorkflow(kind,deleting.id,replacement||undefined),"Item excluído e registros vinculados preservados.");if(result.ok){setDeleting(undefined);await reload()}}
  return <ModuleFrame title="Etapas e status" subtitle="Catálogos sincronizados com Kanban, Projetos, Atividades e Checklists" actions={can("settings","manage_settings")?<Button variant="primary" onClick={()=>{setEditing(undefined);setOpen(true)}}>Adicionar</Button>:undefined}>
    <div className="cs-segmented">{(Object.keys(labels)as WorkflowKind[]).map(item=><button type="button" className={kind===item?"active":""} key={item} onClick={()=>setKind(item)}>{labels[item]}</button>)}</div>
    <FeedbackMessage error={actionError} success={success}/>{error&&<ErrorState message={error} onRetry={()=>void reload()}/>} 
    {loading?<LoadingState/>:ordered.length===0?<EmptyState title="Catálogo vazio" description="Adicione o primeiro item deste fluxo."/>:<div className="cs-table-wrap"><table className="cs-table"><thead><tr><th>Ordem</th><th>Nome</th><th>Código</th><th>Uso</th><th>Estado</th><th>Final</th><th>Ações</th></tr></thead><tbody>{ordered.map((row,index)=><tr key={row.id}><td data-label="Ordem">{index+1}</td><td data-label="Nome"><strong>{row.name}</strong></td><td data-label="Código">{row.code}</td><td data-label="Uso">{row.linked_records??0}</td><td data-label="Estado">{row.active&&!row.archived_at?"Ativo":"Inativo"}</td><td data-label="Final">{row.final?"Sim":"Não"}</td><td data-label="Ações"><div className="cs-row-actions">{can("settings","manage_settings")&&<><Button variant="text" onClick={()=>void move(index,-1)} disabled={index===0||pending}>↑</Button><Button variant="text" onClick={()=>void move(index,1)} disabled={index===ordered.length-1||pending}>↓</Button><Button variant="text" onClick={()=>{setEditing(row);setOpen(true)}}>Editar</Button><Button onClick={()=>void toggle(row)}>{row.active?"Desativar":"Ativar"}</Button><Button variant="danger" onClick={()=>setDeleting(row)}>Excluir</Button></>}</div></td></tr>)}</tbody></table></div>}
    {open&&<Modal title={editing?"Editar item":"Adicionar item"} onClose={()=>setOpen(false)}><form className="cs-form-grid" onSubmit={submit}><FormField label="Nome" name="name" required defaultValue={editing?.name}/><FormField label="Código" name="code" required defaultValue={editing?.code} disabled={Boolean(editing?.linked_records)}/><FormField label="Cor" name="color" type="color" defaultValue={editing?.color??"#9b6352"}/><FormField label="Posição" name="position" type="number" min="0" defaultValue={editing?.position??ordered.length*10+10}/><label className="cs-check-option"><input type="checkbox" name="active" defaultChecked={editing?.active??true}/><span>Ativo</span></label><label className="cs-check-option"><input type="checkbox" name="final" defaultChecked={editing?.final??false}/><span>Estado final</span></label><div className="cs-form-actions"><Button type="button" onClick={()=>setOpen(false)}>Cancelar</Button><Button variant="primary" loading={pending}>Salvar</Button></div></form></Modal>}
    {deleting&&<Modal title={`Excluir ${deleting.name}`} onClose={()=>setDeleting(undefined)}><form className="cs-form-grid" onSubmit={confirmDelete}><p className="cs-span-2">Este item possui <strong>{deleting.linked_records??0}</strong> registro(s) vinculado(s). Quando houver vínculos, escolha um substituto para realizar a migração segura antes da exclusão.</p>{(deleting.linked_records??0)>0&&<label className="cs-span-2"><span>Substituir por</span><select name="replacement" required defaultValue=""><option value="">Selecione…</option>{replacements.map(row=><option key={row.id} value={row.code}>{row.name}</option>)}</select></label>}<div className="cs-form-actions"><Button type="button" onClick={()=>setDeleting(undefined)}>Cancelar</Button><Button variant="danger" loading={pending}>Excluir</Button></div></form></Modal>}
  </ModuleFrame>
}
