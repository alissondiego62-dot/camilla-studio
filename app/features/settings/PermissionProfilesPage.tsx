"use client";

import{useCallback,useMemo,useState}from"react";
import type{FormEvent}from"react";
import{ModuleFrame}from"@/app/components/ui/ModuleFrame";
import{Button}from"@/app/components/ui/Button";
import{Modal}from"@/app/components/ui/Modal";
import{FeedbackMessage}from"@/app/components/ui/FeedbackMessage";
import{EmptyState,ErrorState,LoadingState}from"@/app/components/ui/DataState";
import{FormField}from"@/app/components/ui/FormField";
import{useModuleData}from"@/app/hooks/useModuleData";
import{useAsyncAction}from"@/app/hooks/useAsyncAction";
import{usePermissions}from"@/app/hooks/usePermissions";
import{AccessDenied}from"@/app/components/security/PermissionGate";
import{permissionCatalog}from"@/app/config/permission-catalog";
import type{PermissionScope}from"@/app/types/permissions";
import{permissionKey}from"@/app/types/permissions";
import{listPermissionProfiles,listProfilePermissions,savePermissionProfile,saveProfilePermission}from"./settings.service";

export function PermissionProfilesPage(){
  const{can}=usePermissions();
  const profilesLoader=useCallback(()=>listPermissionProfiles(),[]);
  const{data:profiles,loading,error,reload}=useModuleData(profilesLoader,[]);
  const[selected,setSelected]=useState("");
  const activeProfileId=selected||profiles[0]?.id||"";
  const permissionsLoader=useCallback(()=>activeProfileId?listProfilePermissions(activeProfileId):Promise.resolve([]),[activeProfileId]);
  const matrix=useModuleData(permissionsLoader,[]);
  const rows=useMemo(()=>new Map(matrix.data.map(item=>[permissionKey(item.module,item.action),{allowed:item.allowed,scope:item.scope}])),[matrix.data]);
  const[modal,setModal]=useState(false);
  const{pending,error:actionError,success,run}=useAsyncAction();
  const current=useMemo(()=>profiles.find(profile=>profile.id===activeProfileId),[profiles,activeProfileId]);

  if(!can("users","view"))return <ModuleFrame title="Perfis e permissões"><AccessDenied/></ModuleFrame>;
  async function change(module:string,action:string,allowed:boolean,scope:PermissionScope){if(!activeProfileId)return;const result=await run(()=>saveProfilePermission({profile_id:activeProfileId,module,action,allowed,scope}),"Permissão atualizada.");if(result.ok)void matrix.reload()}
  async function create(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);const result=await run(()=>savePermissionProfile({code:String(form.get("code")),name:String(form.get("name")),description:String(form.get("description")??""),active:true}),"Perfil criado.");if(result.ok){setModal(false);void reload()}}

  return <ModuleFrame title="Perfis e permissões" subtitle="Controle real por módulo, ação e escopo" actions={can("users","manage_users")?<Button variant="primary" onClick={()=>setModal(true)}>Criar perfil personalizado</Button>:undefined}>
    {error&&<ErrorState message={error} onRetry={()=>void reload()}/>}<FeedbackMessage error={actionError} success={success}/>
    {loading?<LoadingState/>:profiles.length===0?<EmptyState title="Perfis ainda não aplicados" description="Aplique o SQL da Etapa 02 para criar a matriz inicial."/>:<>
      <div className="cs-toolbar"><label className="cs-inline-field"><span>Perfil</span><select value={activeProfileId} onChange={event=>setSelected(event.target.value)}>{profiles.map(profile=><option key={profile.id} value={profile.id}>{profile.name}{profile.system?" · sistema":""}</option>)}</select></label><p className="cs-muted">{current?.description}</p></div>
      {matrix.error?<ErrorState message={matrix.error} onRetry={()=>void matrix.reload()}/>:matrix.loading?<LoadingState label="Carregando matriz…"/>:<div className="cs-permission-matrix">{[...new Set(permissionCatalog.map(item=>item.module))].map(module=><section className="cs-card" key={module}><h2>{permissionCatalog.find(item=>item.module===module)?.moduleLabel}</h2><div className="cs-permission-list">{permissionCatalog.filter(item=>item.module===module).map(item=>{const value=rows.get(permissionKey(item.module,item.action))??{allowed:false,scope:"none" as PermissionScope};return <div key={item.action} className="cs-permission-row"><label><input type="checkbox" checked={value.allowed} disabled={!can("users","manage_users")||pending} onChange={event=>void change(item.module,item.action,event.target.checked,event.target.checked?(item.supportsScope&&value.scope==="none"?"all":value.scope):"none")}/><span>{item.actionLabel}</span></label>{item.supportsScope&&<select aria-label={`Escopo de ${item.actionLabel}`} value={value.scope} disabled={!value.allowed||!can("users","manage_users")||pending} onChange={event=>void change(item.module,item.action,true,event.target.value as PermissionScope)}><option value="own">Próprios</option><option value="assigned">Atribuídos</option><option value="team">Equipe</option><option value="all">Todos</option></select>}</div>})}</div></section>)}</div>}
    </>}
    {modal&&<Modal title="Novo perfil personalizado" onClose={()=>setModal(false)}><form className="cs-form-grid" onSubmit={create}><FormField label="Código" name="code" required pattern="[a-z0-9_]+" placeholder="consultor_externo"/><FormField label="Nome" name="name" required/><label className="cs-span-2"><span>Descrição</span><textarea name="description" rows={3}/></label><div className="cs-span-2"><FeedbackMessage error={actionError}/></div><div className="cs-form-actions"><Button type="button" onClick={()=>setModal(false)}>Cancelar</Button><Button variant="primary" loading={pending}>Criar perfil</Button></div></form></Modal>}
  </ModuleFrame>;
}
