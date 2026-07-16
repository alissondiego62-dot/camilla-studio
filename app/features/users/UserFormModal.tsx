"use client";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/app/components/ui/Modal";
import { Button } from "@/app/components/ui/Button";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { FormField, SelectField } from "@/app/components/ui/FormField";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import type { PermissionProfileSummary } from "@/app/types/permissions";
import type { ProfileRow, TeamRow, UserFormValues } from "./types";
import { inviteUser, updateUser } from "./users.service";

export function UserFormModal({ user, profiles, teams, onClose, onSaved }: { user?: ProfileRow; profiles: PermissionProfileSummary[]; teams: TeamRow[]; onClose:()=>void; onSaved:()=>void }) {
  const initialTeams = useMemo(() => new Set(user?.team_ids ?? []), [user]);
  const [selectedTeams, setSelectedTeams] = useState(initialTeams);
  const { pending, error, success, run } = useAsyncAction();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const values: UserFormValues = { name: String(form.get("name") ?? "").trim(), email: String(form.get("email") ?? "").trim(), permission_profile_id: String(form.get("permission_profile_id") ?? ""), team_ids: [...selectedTeams] };
    const result = await run(() => user ? updateUser(user.id, values) : inviteUser(values), user ? "Usuário atualizado." : "Convite enviado e usuário cadastrado.");
    if (result.ok) { onSaved(); window.setTimeout(onClose, 450); }
  }
  function toggleTeam(id:string) { setSelectedTeams((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  return <Modal title={user ? "Editar usuário" : "Cadastrar usuário"} onClose={onClose}><form className="cs-form-grid" onSubmit={submit}>
    <FormField label="Nome" name="name" required defaultValue={user?.name ?? ""}/>
    <FormField label="E-mail" name="email" type="email" required defaultValue={user?.email ?? ""}/>
    <SelectField label="Perfil" name="permission_profile_id" required defaultValue={user?.permission_profile_id ?? ""}><option value="">Selecione</option>{profiles.map((profile)=><option key={profile.id} value={profile.id}>{profile.name}</option>)}</SelectField>
    <div className="cs-span-2"><span className="cs-field-label">Equipes</span><div className="cs-check-grid">{teams.length ? teams.map((team)=><label className="cs-check-option" key={team.id}><input type="checkbox" checked={selectedTeams.has(team.id)} onChange={()=>toggleTeam(team.id)}/><span>{team.name}</span></label>) : <p className="cs-muted">Nenhuma equipe cadastrada.</p>}</div></div>
    <div className="cs-span-2"><FeedbackMessage error={error} success={success}/></div>
    <div className="cs-form-actions"><Button type="button" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={pending}>{user ? "Salvar alterações" : "Enviar convite"}</Button></div>
  </form></Modal>;
}
