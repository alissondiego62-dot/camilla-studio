"use client";

import { FormEvent, useMemo, useState } from "react";
import type { Project } from "../domain/architecture-types";

type Activity = {
  id: string;
  project_id: string | null;
  title: string;
  group_name: string;
  responsible_name: string;
  priority: "low" | "normal" | "high" | "urgent";
  due_date: string | null;
  completed_at: string | null;
  parent_id: string | null;
};

const initialActivities: Activity[] = [
  { id: "task-demo-1", project_id: null, title: "Revisar agenda semanal do escritório", group_name: "Administrativo", responsible_name: "Camilla", priority: "normal", due_date: new Date().toISOString().slice(0, 10), completed_at: null, parent_id: null },
];

export function ActivitiesWorkspace({ projects }: { projects: Project[] }) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [showCompleted, setShowCompleted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const visible = useMemo(() => activities.filter((item) => (showCompleted || !item.completed_at) && item.title.toLowerCase().includes(search.toLowerCase())), [activities, showCompleted, search]);
  const groups = useMemo(() => [...new Set(visible.map((item) => item.group_name))], [visible]);

  function addActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setActivities((current) => [{
      id: crypto.randomUUID(),
      project_id: String(form.get("project_id") || "") || null,
      title: String(form.get("title") || ""),
      group_name: String(form.get("group_name") || "Projetos"),
      responsible_name: String(form.get("responsible_name") || "Camilla"),
      priority: String(form.get("priority") || "normal") as Activity["priority"],
      due_date: String(form.get("due_date") || "") || null,
      completed_at: null,
      parent_id: null,
    }, ...current]);
    event.currentTarget.reset();
    setFormOpen(false);
  }

  function toggle(item: Activity) {
    setActivities((current) => current.map((value) => value.id === item.id ? { ...value, completed_at: value.completed_at ? null : new Date().toISOString() } : value));
  }

  return <section className="activities-workspace">
    <div className="activity-toolbar">
      <label>⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar atividade…" /></label>
      <button onClick={() => setShowCompleted((value) => !value)}>{showCompleted ? "Ocultar concluídas" : "Ver concluídas"}</button>
      <button className="primary" onClick={() => setFormOpen((value) => !value)}>＋ Nova atividade</button>
    </div>
    {formOpen && <form className="activity-form panel" onSubmit={addActivity}>
      <label className="wide">Atividade<input name="title" required placeholder="Ex.: Revisar planta elétrica" /></label>
      <label>Grupo<select name="group_name"><option>Projetos</option><option>Administrativo</option><option>Obras</option><option>Documentação</option><option>Reuniões</option><option>Financeiro</option></select></label>
      <label>Projeto<select name="project_id"><option value="">Sem projeto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.code} — {project.name}</option>)}</select></label>
      <label>Responsável<input name="responsible_name" defaultValue="Camilla" /></label>
      <label>Prioridade<select name="priority"><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option><option value="low">Baixa</option></select></label>
      <label>Prazo<input name="due_date" type="date" /></label>
      <div className="wide form-submit"><button className="primary">Salvar atividade</button></div>
    </form>}
    <div className="activity-groups">{groups.map((group) => <article className="activity-group panel" key={group}>
      <header><div><p className="eyebrow">GRUPO</p><h2>{group}</h2></div><span>{visible.filter((item) => item.group_name === group).length}</span></header>
      <div className="activity-list">{visible.filter((item) => item.group_name === group).map((item) => {
        const project = projects.find((value) => value.id === item.project_id);
        return <div className={item.completed_at ? "activity-row completed" : "activity-row"} key={item.id}>
          <button className="activity-check" onClick={() => toggle(item)}>{item.completed_at ? "✓" : ""}</button>
          <div><b>{item.title}</b><span>{project ? `${project.code} · ${project.name}` : "Atividade geral"}</span></div>
          <small data-priority={item.priority}>{item.priority}</small>
          <em>{item.responsible_name}</em>
          <time>{item.due_date ? new Date(`${item.due_date}T12:00:00`).toLocaleDateString("pt-BR") : "Sem prazo"}</time>
        </div>;
      })}</div>
    </article>)}</div>
  </section>;
}
