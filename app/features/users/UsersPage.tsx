"use client";

import { useCallback, useState } from "react";
import { dateTime } from "@/app/config/regions";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
import { Button } from "@/app/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { useModuleData } from "@/app/hooks/useModuleData";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { usePermissions } from "@/app/hooks/usePermissions";
import { AccessDenied } from "@/app/components/security/PermissionGate";
import { UserFormModal } from "./UserFormModal";
import { UserDetailsDrawer } from "./UserDetailsDrawer";
import { TeamsManager } from "./TeamsManager";
import { UserPermissionOverridesModal } from "./UserPermissionOverridesModal";
import type { ProfileRow } from "./types";
import {
  listPermissionProfiles, listProfiles, listTeams, requestPasswordReset,
  revokeUserSessions, setUserStatus,
} from "./users.service";

export function UsersPage() {
  const { can }=usePermissions();
  const canManage=can("users","manage_users");
  const loader=useCallback(async()=>{const [users,profiles,teams]=await Promise.all([listProfiles(),listPermissionProfiles(),listTeams()]);return{users,profiles,teams}},[]);
  const {data,loading,error,reload}=useModuleData(loader,{users:[],profiles:[],teams:[]});
  const {pending,error:actionError,success,run}=useAsyncAction();
  const [editing,setEditing]=useState<ProfileRow|undefined>();
  const [formOpen,setFormOpen]=useState(false);
  const [details,setDetails]=useState<ProfileRow|null>(null);
  const [overrides,setOverrides]=useState<ProfileRow|null>(null);
  const [teamsOpen,setTeamsOpen]=useState(false);

  if(!can("users","view"))return <ModuleFrame title="Usuários" subtitle="Gestão de acesso"><AccessDenied/></ModuleFrame>;

  async function action(user:ProfileRow,kind:"activate"|"deactivate"|"block"|"unblock"|"reset"|"revoke"){
    const labels={activate:"Usuário ativado.",deactivate:"Usuário desativado.",block:"Usuário bloqueado.",unblock:"Usuário desbloqueado.",reset:"Solicitação de redefinição enviada.",revoke:"Sessões encerradas."};
    const result=await run(()=>kind==="reset"?requestPasswordReset(user.id):kind==="revoke"?revokeUserSessions(user.id):setUserStatus(user.id,kind),labels[kind]);
    if(result.ok)void reload();
  }

  return <ModuleFrame
    title="Usuários"
    subtitle="Perfis, equipes, bloqueios, sessões, permissões individuais e vínculos"
    actions={<>
      <Button onClick={()=>void reload()}>Atualizar</Button>
      {canManage&&<Button onClick={()=>setTeamsOpen(true)}>Gerenciar equipes</Button>}
      {canManage&&<Button variant="primary" onClick={()=>{setEditing(undefined);setFormOpen(true)}}>Cadastrar usuário</Button>}
    </>}
  >
    <FeedbackMessage error={actionError} success={success}/>
    {error&&<ErrorState message={error} onRetry={()=>void reload()}/>} 
    {loading?<LoadingState/>:data.users.length===0?<EmptyState title="Nenhum perfil" description="Cadastre o primeiro usuário administrativo ou aplique o SQL da Etapa 02."/>:<div className="cs-table-wrap"><table className="cs-table"><thead><tr><th>Usuário</th><th>Perfil</th><th>Status</th><th>Criado</th><th>Último acesso</th><th>Ações</th></tr></thead><tbody>{data.users.map((user)=><tr key={user.id}>
      <td data-label="Usuário"><strong>{user.name||"Sem nome"}</strong><span>{user.email}</span></td>
      <td data-label="Perfil">{user.profile_name??user.camilla_role??user.role??"Somente leitura"}</td>
      <td data-label="Status"><span className={`cs-badge ${user.blocked_at?"is-danger":user.active?"is-success":"is-muted"}`}>{user.blocked_at?"Bloqueado":user.active?"Ativo":"Inativo"}</span></td>
      <td data-label="Criado">{dateTime(user.created_at)}</td><td data-label="Último acesso">{dateTime(user.last_access_at)}</td>
      <td data-label="Ações"><div className="cs-row-actions">
        <Button variant="text" onClick={()=>setDetails(user)}>Vínculos</Button>
        {canManage&&<>
          <Button variant="text" onClick={()=>setOverrides(user)}>Exceções</Button>
          <Button variant="text" onClick={()=>{setEditing(user);setFormOpen(true)}}>Editar</Button>
          {user.blocked_at?<Button onClick={()=>void action(user,"unblock")} disabled={pending}>Desbloquear</Button>:<Button variant="danger" onClick={()=>void action(user,"block")} disabled={pending}>Bloquear</Button>}
          {user.active?<Button onClick={()=>void action(user,"deactivate")} disabled={pending}>Desativar</Button>:<Button onClick={()=>void action(user,"activate")} disabled={pending}>Ativar</Button>}
          <Button onClick={()=>void action(user,"reset")} disabled={pending}>Redefinir senha</Button>
          <Button onClick={()=>void action(user,"revoke")} disabled={pending}>Encerrar sessões</Button>
        </>}
      </div></td>
    </tr>)}</tbody></table></div>}
    {formOpen&&<UserFormModal user={editing} profiles={data.profiles} teams={data.teams} onClose={()=>setFormOpen(false)} onSaved={()=>void reload()}/>} 
    {details&&<UserDetailsDrawer user={details} canManage={canManage} onClose={()=>setDetails(null)}/>} 
    {overrides&&<UserPermissionOverridesModal user={overrides} onClose={()=>setOverrides(null)}/>} 
    {teamsOpen&&<TeamsManager teams={data.teams} onClose={()=>setTeamsOpen(false)} onSaved={()=>void reload()}/>} 
  </ModuleFrame>;
}
