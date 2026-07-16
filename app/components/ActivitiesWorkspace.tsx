"use client";

import { FormEvent, useMemo, useState } from "react";
import type { Project } from "../domain/architecture-types";

type Activity = {
  id: string;
  project_id: string | null;
  title: string;
  description?: string;
  group_name: string;
  responsible_name: string;
  priority: "low" | "normal" | "high" | "urgent";
  due_date: string | null;
  completed_at: string | null;
  parent_id: string | null;
};

const initialActivities: Activity[] = [
  { id: "task-demo-1", project_id: null, title: "Revisar agenda semanal do escritório", group_name: "Administrativo", responsible_name: "Camilla", priority: "normal", due_date: new Date().toISOString().slice(0, 10), completed_at: null, parent_id: null },
  { id: "task-demo-2", project_id: "demo-1", title: "Conferir levantamento e fotos", group_name: "Projetos", responsible_name: "Camilla", priority: "high", due_date: "2026-07-18", completed_at: null, parent_id: null },
  { id: "task-demo-3", project_id: "demo-1", title: "Organizar arquivos do levantamento", group_name: "Projetos", responsible_name: "Silvia", priority: "normal", due_date: "2026-07-19", completed_at: null, parent_id: "task-demo-2" },
];

const priorityLabel: Record<Activity["priority"], string> = { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" };

export function ActivitiesWorkspace({ projects }: { projects: Project[] }) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [showCompleted, setShowCompleted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"groups" | "list">("groups");

  const visible = useMemo(() => activities.filter((item) => {
    const matchesSearch = `${item.title} ${item.description || ""} ${item.responsible_name}`.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = groupFilter === "all" || item.group_name === groupFilter;
    const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
    return (showCompleted || !item.completed_at) && matchesSearch && matchesGroup && matchesPriority;
  }), [activities, showCompleted, search, groupFilter, priorityFilter]);

  const groups = useMemo(() => [...new Set(activities.map((item) => item.group_name))], [activities]);
  const activeCount = activities.filter((item) => !item.completed_at).length;
  const overdueCount = activities.filter((item) => !item.completed_at && item.due_date && new Date(`${item.due_date}T23:59:59`) < new Date()).length;
  const urgentCount = activities.filter((item) => !item.completed_at && item.priority === "urgent").length;
  const completedCount = activities.filter((item) => item.completed_at).length;

  function addActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setActivities((current) => [{
      id: crypto.randomUUID(),
      project_id: String(form.get("project_id") || "") || null,
      title: String(form.get("title") || ""),
      description: String(form.get("description") || "") || undefined,
      group_name: String(form.get("group_name") || "Projetos"),
      responsible_name: String(form.get("responsible_name") || "Camilla"),
      priority: String(form.get("priority") || "normal") as Activity["priority"],
      due_date: String(form.get("due_date") || "") || null,
      completed_at: null,
      parent_id: String(form.get("parent_id") || "") || null,
    }, ...current]);
    event.currentTarget.reset();
    setFormOpen(false);
  }

  function toggle(item: Activity) {
    setActivities((current) => current.map((value) => value.id === item.id ? { ...value, completed_at: value.completed_at ? null : new Date().toISOString() } : value));
  }

  function remove(item: Activity) {
    setActivities((current) => current.filter((value) => value.id !== item.id && value.parent_id !== item.id));
  }

  function renderRow(item: Activity) {
    const project = projects.find((value) => value.id === item.project_id);
    const parent = activities.find((value) => value.id === item.parent_id);
    return <div className={`${item.completed_at ? "activity-row completed" : "activity-row"}${item.parent_id ? " subactivity" : ""}`} key={item.id}>
      <button className="activity-check" onClick={() => toggle(item)} aria-label={item.completed_at ? "Reabrir atividade" : "Concluir atividade"}>{item.completed_at ? "✓" : ""}</button>
      <div className="activity-copy"><b>{item.title}</b><span>{project ? `${project.code} · ${project.name}` : "Atividade geral"}{parent ? ` · Subatividade de: ${parent.title}` : ""}</span>{item.description && <p>{item.description}</p>}</div>
      <small data-priority={item.priority}>{priorityLabel[item.priority]}</small>
      <em>{item.responsible_name}</em>
      <time data-overdue={!item.completed_at && !!item.due_date && new Date(`${item.due_date}T23:59:59`) < new Date()}>{item.due_date ? new Date(`${item.due_date}T12:00:00`).toLocaleDateString("pt-BR") : "Sem prazo"}</time>
      <button className="activity-remove" onClick={() => remove(item)} title="Remover atividade">×</button>
    </div>;
  }

  return <section className="activities-workspace publicolor-module">
    <section className="module-kpis">
      <article><span>☑</span><div><small>Atividades abertas</small><b>{activeCount}</b></div></article>
      <article><span>!</span><div><small>Atrasadas</small><b>{overdueCount}</b></div></article>
      <article><span>⚡</span><div><small>Urgentes</small><b>{urgentCount}</b></div></article>
      <article><span>✓</span><div><small>Concluídas</small><b>{completedCount}</b></div></article>
    </section>

    <div className="activity-toolbar publicolor-toolbar">
      <label className="toolbar-search">⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar atividade, projeto ou responsável…" /></label>
      <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}><option value="all">Todos os grupos</option>{groups.map((group) => <option key={group}>{group}</option>)}</select>
      <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="all">Todas as prioridades</option><option value="urgent">Urgente</option><option value="high">Alta</option><option value="normal">Normal</option><option value="low">Baixa</option></select>
      <button onClick={() => setViewMode((value) => value === "groups" ? "list" : "groups")}>{viewMode === "groups" ? "☷ Lista" : "▦ Grupos"}</button>
      <button onClick={() => setShowCompleted((value) => !value)}>{showCompleted ? "Ocultar concluídas" : "Ver concluídas"}</button>
      <button className="primary" onClick={() => setFormOpen((value) => !value)}>＋ Nova atividade</button>
    </div>

    {formOpen && <form className="activity-form panel publicolor-form" onSubmit={addActivity}>
      <label className="wide">Atividade<input name="title" required placeholder="Ex.: Revisar planta elétrica" /></label>
      <label className="wide">Descrição<textarea name="description" rows={2} placeholder="Detalhes, orientações ou critérios de conclusão" /></label>
      <label>Grupo<select name="group_name"><option>Projetos</option><option>Administrativo</option><option>Obras</option><option>Documentação</option><option>Reuniões</option><option>Financeiro</option></select></label>
      <label>Projeto<select name="project_id"><option value="">Sem projeto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.code} — {project.name}</option>)}</select></label>
      <label>Atividade principal<select name="parent_id"><option value="">Nenhuma</option>{activities.filter((item) => !item.parent_id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label>Responsável<input name="responsible_name" defaultValue="Camilla" /></label>
      <label>Prioridade<select name="priority"><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option><option value="low">Baixa</option></select></label>
      <label>Prazo<input name="due_date" type="date" /></label>
      <div className="wide form-submit"><button className="primary">Salvar atividade</button></div>
    </form>}

    {viewMode === "groups" ? <div className="activity-groups">{groups.filter((group) => visible.some((item) => item.group_name === group)).map((group) => <article className="activity-group panel" key={group}>
      <header><div><p className="eyebrow">GRUPO</p><h2>{group}</h2></div><span>{visible.filter((item) => item.group_name === group).length}</span></header>
      <div className="activity-list">{visible.filter((item) => item.group_name === group).map(renderRow)}</div>
    </article>)}</div> : <article className="activity-group panel"><header><div><p className="eyebrow">ATIVIDADES</p><h2>Lista consolidada</h2></div><span>{visible.length}</span></header><div className="activity-list">{visible.map(renderRow)}</div></article>}

    {!visible.length && <div className="empty-panel"><b>Nenhuma atividade encontrada.</b><p>Altere os filtros ou cadastre uma nova atividade.</p></div>}
  </section>;
}
