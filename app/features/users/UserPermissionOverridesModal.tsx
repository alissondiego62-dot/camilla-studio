"use client";

import { useCallback, useMemo, useState } from "react";
import { Modal } from "@/app/components/ui/Modal";
import { Button } from "@/app/components/ui/Button";
import { SelectField } from "@/app/components/ui/FormField";
import { EmptyState, ErrorState, LoadingState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { permissionCatalog } from "@/app/config/permission-catalog";
import { permissionScopes, type PermissionScope } from "@/app/types/permissions";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { useModuleData } from "@/app/hooks/useModuleData";
import type { ProfileRow, UserPermissionOverride } from "./types";
import { deleteUserOverride, listUserOverrides, saveUserOverride } from "./users.service";

const scopeLabels:Record<PermissionScope,string>={none:"Nenhum",own:"Próprio",assigned:"Atribuídos",team:"Equipe",all:"Todos"};
export function UserPermissionOverridesModal({user,onClose}:{user:ProfileRow;onClose:()=>void}){
  const loader=useCallback(()=>listUserOverrides(user.id),[user.id]);
  const {data,loading,error,reload}=useModuleData(loader,[] as UserPermissionOverride[]);
  const [permission,setPermission]=useState("finance_professional:view");const [allowed,setAllowed]=useState(true);const [scope,setScope]=useState<PermissionScope>("own");const [reason,setReason]=useState("");
  const {pending,error:actionError,success,run}=useAsyncAction();
  const selected=useMemo(()=>permissionCatalog.find(item=>`${item.module}:${item.action}`===permission),[permission]);
  async function save(event:React.FormEvent){event.preventDefault();const [module,action]=permission.split(":");const result=await run(()=>saveUserOverride({user_id:user.id,module,action,allowed,scope:allowed?(selected?.supportsScope?scope:"own"):"none",reason:reason.trim()||null,expires_at:null}),"Exceção individual salva.");if(result.ok)void reload()}
  async function remove(item:UserPermissionOverride){const result=await run(()=>deleteUserOverride(user.id,item.module,item.action),"Exceção removida.");if(result.ok)void reload()}
  return <Modal title={`Permissões individuais — ${user.name}`} onClose={onClose}>
    <p className="cs-muted">Exceções individuais prevalecem sobre o perfil. Use especialmente para autorizações explícitas, como Financeiro Pessoal.</p>
    <FeedbackMessage error={actionError} success={success}/>
    <form className="cs-card cs-form-grid cs-permission-override-form" onSubmit={save}>
      <SelectField label="Permissão" value={permission} onChange={event=>setPermission(event.target.value)}>{permissionCatalog.map(item=><option key={`${item.module}:${item.action}`} value={`${item.module}:${item.action}`}>{item.moduleLabel} — {item.actionLabel}</option>)}</SelectField>
      <SelectField label="Decisão" value={allowed?"allow":"deny"} onChange={event=>setAllowed(event.target.value==="allow")}><option value="allow">Permitir</option><option value="deny">Negar</option></SelectField>
      <SelectField label="Escopo" value={scope} disabled={!allowed||!selected?.supportsScope} onChange={event=>setScope(event.target.value as PermissionScope)}>{permissionScopes.filter(value=>value!=="none").map(value=><option key={value} value={value}>{scopeLabels[value]}</option>)}</SelectField>
      <label><span>Justificativa</span><textarea rows={2} value={reason} maxLength={300} onChange={event=>setReason(event.target.value)} /></label>
      <div className="cs-form-actions"><Button variant="primary" type="submit" loading={pending}>Salvar exceção</Button></div>
    </form>
    {error?<ErrorState message={error} onRetry={()=>void reload()}/>:loading?<LoadingState/>:data.length===0?<EmptyState title="Sem exceções" description="O usuário utiliza apenas as permissões do perfil."/>:<div className="cs-table-wrap"><table className="cs-table"><thead><tr><th>Módulo</th><th>Ação</th><th>Decisão</th><th>Escopo</th><th>Justificativa</th><th>Ação</th></tr></thead><tbody>{data.map(item=><tr key={item.id}><td>{item.module}</td><td>{item.action}</td><td><span className={`cs-badge ${item.allowed?"is-success":"is-danger"}`}>{item.allowed?"Permitido":"Negado"}</span></td><td>{scopeLabels[item.scope]}</td><td>{item.reason||"—"}</td><td><Button variant="danger" onClick={()=>void remove(item)} disabled={pending}>Remover</Button></td></tr>)}</tbody></table></div>}
  </Modal>;
}
