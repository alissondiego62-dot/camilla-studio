"use client";

import { useState } from "react";
import { Modal } from "@/app/components/ui/Modal";
import { Button } from "@/app/components/ui/Button";
import { FormField } from "@/app/components/ui/FormField";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import type { TeamRow } from "./types";
import { saveTeam } from "./users.service";

const emptyTeam={name:"",description:"",active:true};
export function TeamsManager({teams,onClose,onSaved}:{teams:TeamRow[];onClose:()=>void;onSaved:()=>void}){
  const [editing,setEditing]=useState<TeamRow|null>(null);
  const [form,setForm]=useState(emptyTeam);
  const {pending,error,success,run}=useAsyncAction();
  function start(team?:TeamRow){setEditing(team??null);setForm(team?{name:team.name,description:team.description??"",active:team.active}:emptyTeam)}
  async function submit(event:React.FormEvent){event.preventDefault();const result=await run(()=>saveTeam({id:editing?.id,...form}),editing?"Equipe atualizada.":"Equipe criada.");if(result.ok){start();onSaved()}}
  return <Modal title="Gerenciar equipes" onClose={onClose}>
    <FeedbackMessage error={error} success={success}/>
    <div className="cs-grid-2 cs-admin-split">
      <section className="cs-card"><div className="cs-section-heading"><div><h3>Equipes cadastradas</h3><p>Associações de usuários e escopos de trabalho.</p></div><Button onClick={()=>start()}>Nova equipe</Button></div>
        {teams.length===0?<p className="cs-muted">Nenhuma equipe cadastrada.</p>:<ul className="cs-clean-list">{teams.map(team=><li key={team.id}><div><strong>{team.name}</strong><small>{team.members_count??0} membro(s) · {team.active?"Ativa":"Inativa"}</small></div><Button variant="text" onClick={()=>start(team)}>Editar</Button></li>)}</ul>}
      </section>
      <form className="cs-card cs-form-grid" onSubmit={submit}><h3>{editing?"Editar equipe":"Nova equipe"}</h3>
        <FormField label="Nome" value={form.name} required minLength={2} maxLength={100} onChange={event=>setForm({...form,name:event.target.value})}/>
        <label><span>Descrição</span><textarea rows={4} value={form.description} onChange={event=>setForm({...form,description:event.target.value})}/></label>
        <label className="cs-check-row"><input type="checkbox" checked={form.active} onChange={event=>setForm({...form,active:event.target.checked})}/><span>Equipe ativa</span></label>
        <div className="cs-form-actions"><Button type="button" onClick={()=>start()}>Limpar</Button><Button type="submit" variant="primary" loading={pending}>Salvar equipe</Button></div>
      </form>
    </div>
  </Modal>;
}
