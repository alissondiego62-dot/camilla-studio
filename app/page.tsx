"use client";

import type { User } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { menuItems, priorityLabels, stageLabels, stages, statusLabels } from "./domain/architecture-config";
import type { Client, Project, ProjectPriority, ProjectStage, ProjectStatus, ViewKey } from "./domain/architecture-types";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

function asDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function deadlineLabel(project: Project) {
  const date = asDate(project.deadline_stage_3 || project.deadline_stage_2 || project.deadline_stage_1);
  if (!date) return "Sem prazo";
  const diff = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d atrasado`;
  if (diff === 0) return "Entrega hoje";
  return `em ${diff} dias`;
}

function projectClient(project: Project) {
  return project.client?.name || "Cliente não informado";
}

const demoProjects: Project[] = [
  { id: "demo-1", code: "ARQ-001", client_id: null, name: "Residência Victor Bisneto", project_type: "Arquitetura", subtype: "Reforma", stage: "creation", status: "in_progress", priority: "high", responsible_name: "Camilla", deadline_stage_1: "2026-07-14", deadline_stage_2: "2026-07-17", deadline_stage_3: "2026-07-22", contract_value: 0, amount_received: 0, balance_due: 0, cover_url: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), client: { id: "c1", name: "Victor Bisneto", phone: null, email: null, notes: null, created_at: new Date().toISOString() } },
  { id: "demo-2", code: "INT-002", client_id: null, name: "Interiores Marciano", project_type: "Interiores", subtype: "Novo", stage: "creation", status: "in_progress", priority: "normal", responsible_name: "Camilla", deadline_stage_1: null, deadline_stage_2: "2026-07-15", deadline_stage_3: "2026-07-30", contract_value: 9850, amount_received: 4925, balance_due: 4925, cover_url: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), client: { id: "c2", name: "Marciano", phone: null, email: null, notes: null, created_at: new Date().toISOString() } },
  { id: "demo-3", code: "ARQ-003", client_id: null, name: "Projeto Horacio", project_type: "Arquitetura", subtype: "Reforma", stage: "executive", status: "not_started", priority: "normal", responsible_name: "Camilla", deadline_stage_1: null, deadline_stage_2: null, deadline_stage_3: "2026-07-20", contract_value: 3700, amount_received: 1850, balance_due: 1850, cover_url: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), client: { id: "c3", name: "Horacio", phone: null, email: null, notes: null, created_at: new Date().toISOString() } },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [projects, setProjects] = useState<Project[]>(demoProjects);
  const [clients, setClients] = useState<Client[]>(demoProjects.map((project) => project.client!).filter(Boolean));
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | ProjectStage>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    void loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    const [projectResult, clientResult] = await Promise.all([
      supabase.from("projects").select("*,client:clients(*)").order("updated_at", { ascending: false }),
      supabase.from("clients").select("*").order("name"),
    ]);
    const dbError = projectResult.error || clientResult.error;
    if (dbError) setError(`Não foi possível carregar o banco: ${dbError.message}`);
    else {
      setProjects((projectResult.data || []) as Project[]);
      setClients((clientResult.data || []) as Client[]);
      setError("");
    }
    setLoading(false);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
    if (authError) setError(authError.message);
    setAuthBusy(false);
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const clientName = String(form.get("client_name") || "").trim();
    const projectName = String(form.get("name") || "").trim();
    if (!clientName || !projectName) return;

    const draft = {
      code: String(form.get("code") || `ARQ-${String(projects.length + 1).padStart(3, "0")}`),
      name: projectName,
      project_type: String(form.get("project_type") || "Arquitetura"),
      subtype: String(form.get("subtype") || "") || null,
      stage: String(form.get("stage")) as ProjectStage,
      status: String(form.get("status")) as ProjectStatus,
      priority: String(form.get("priority")) as ProjectPriority,
      responsible_name: String(form.get("responsible_name") || "Camilla"),
      deadline_stage_3: String(form.get("deadline") || "") || null,
      contract_value: Number(form.get("contract_value") || 0),
      amount_received: Number(form.get("amount_received") || 0),
      notes: String(form.get("notes") || "") || null,
    };

    if (!isSupabaseConfigured || !user) {
      const newClient: Client = { id: crypto.randomUUID(), name: clientName, phone: null, email: null, notes: null, created_at: new Date().toISOString() };
      const newProject: Project = { ...draft, id: crypto.randomUUID(), client_id: newClient.id, deadline_stage_1: null, deadline_stage_2: null, balance_due: Math.max(0, draft.contract_value - draft.amount_received), cover_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), client: newClient };
      setClients((current) => [...current, newClient]);
      setProjects((current) => [newProject, ...current]);
      setNotice("Projeto criado no modo demonstração.");
      setModalOpen(false);
      return;
    }

    let client = clients.find((item) => item.name.toLowerCase() === clientName.toLowerCase());
    if (!client) {
      const result = await supabase.from("clients").insert({ name: clientName }).select().single();
      if (result.error) return setError(result.error.message);
      client = result.data as Client;
    }
    const result = await supabase.from("projects").insert({ ...draft, client_id: client.id }).select("*,client:clients(*)").single();
    if (result.error) return setError(result.error.message);
    setProjects((current) => [result.data as Project, ...current]);
    setClients((current) => current.some((item) => item.id === client!.id) ? current : [...current, client!]);
    setNotice("Projeto cadastrado com sucesso.");
    setModalOpen(false);
  }

  async function moveProject(project: Project, stage: ProjectStage) {
    setProjects((current) => current.map((item) => item.id === project.id ? { ...item, stage, updated_at: new Date().toISOString() } : item));
    if (isSupabaseConfigured && user) {
      const { error: updateError } = await supabase.from("projects").update({ stage }).eq("id", project.id);
      if (updateError) {
        setError(updateError.message);
        void loadData();
      }
    }
  }

  const filteredProjects = useMemo(() => projects.filter((project) => {
    const term = search.trim().toLowerCase();
    const matchesText = !term || [project.code, project.name, projectClient(project), project.project_type].some((value) => value.toLowerCase().includes(term));
    return matchesText && (stageFilter === "all" || project.stage === stageFilter);
  }), [projects, search, stageFilter]);

  const activeProjects = projects.filter((project) => !["completed", "cancelled"].includes(project.status));
  const overdueProjects = activeProjects.filter((project) => deadlineLabel(project).includes("atrasado"));
  const totalContracted = projects.reduce((sum, project) => sum + Number(project.contract_value || 0), 0);
  const totalReceived = projects.reduce((sum, project) => sum + Number(project.amount_received || 0), 0);
  const upcoming = projects
    .flatMap((project) => [project.deadline_stage_1, project.deadline_stage_2, project.deadline_stage_3].filter(Boolean).map((date, index) => ({ project, date: date as string, label: `Entrega E${index + 1}` })))
    .filter((item) => new Date(`${item.date}T12:00:00`).getTime() >= Date.now() - 86400000)
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);

  if (!authReady) return <main className="loading-screen">Carregando plataforma…</main>;

  if (isSupabaseConfigured && !user) return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="auth-brand"><span>CA</span><div><b>Camilla Studio</b><small>Gestão de projetos de arquitetura</small></div></div>
        <p className="eyebrow">ACESSO RESTRITO</p><h1>Organize projetos, prazos e clientes em um só lugar.</h1>
        <form onSubmit={login}><label>E-mail<input name="email" type="email" required /></label><label>Senha<input name="password" type="password" required /></label>{error && <p className="form-error">{error}</p>}<button className="primary" disabled={authBusy}>{authBusy ? "Entrando…" : "Entrar"}</button></form>
      </section>
      <aside className="auth-visual"><div><span>Arquitetura com método</span><h2>Clareza para criar.<br />Controle para entregar.</h2></div></aside>
    </main>
  );

  return (
    <div className="studio-shell">
      <aside className={sidebarOpen ? "studio-sidebar open" : "studio-sidebar"}>
        <div className="studio-brand"><span>CA</span><div><b>Camilla Studio</b><small>Arquitetura & Interiores</small></div></div>
        <nav>{menuItems.map((item) => <button key={item.key} className={activeView === item.key ? "active" : ""} onClick={() => { setActiveView(item.key); setSidebarOpen(false); }}><i>{item.icon}</i><span>{item.label}</span></button>)}</nav>
        <div className="sidebar-footer"><small>{isSupabaseConfigured ? "Supabase conectado" : "Modo demonstração"}</small><b>{user?.email || "Camilla Arquiteta"}</b>{user && <button onClick={() => void supabase.auth.signOut()}>Sair</button>}</div>
      </aside>

      <main className="studio-content">
        <header className="topbar"><button className="mobile-menu" onClick={() => setSidebarOpen((value) => !value)}>☰</button><div><p className="eyebrow">CAMILLА STUDIO</p><h1>{menuItems.find((item) => item.key === activeView)?.label}</h1><p>Gestão clara para projetos bem conduzidos.</p></div><button className="primary" onClick={() => setModalOpen(true)}>＋ Novo projeto</button></header>
        {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
        {error && <div className="error-banner">{error}<button onClick={() => setError("")}>×</button></div>}

        {activeView === "dashboard" && <>
          <section className="metrics-grid">
            <article><span>▦</span><div><small>Projetos ativos</small><strong>{activeProjects.length}</strong><em>{projects.length} cadastrados</em></div></article>
            <article><span>!</span><div><small>Prazos em atraso</small><strong>{overdueProjects.length}</strong><em>Precisam de atenção</em></div></article>
            <article><span>◷</span><div><small>Próximas entregas</small><strong>{upcoming.length}</strong><em>Agenda consolidada</em></div></article>
            <article><span>R$</span><div><small>Saldo a receber</small><strong>{money.format(totalContracted - totalReceived)}</strong><em>{money.format(totalReceived)} recebido</em></div></article>
          </section>
          <section className="dashboard-grid">
            <article className="panel wide"><div className="panel-head"><div><p className="eyebrow">VISÃO GERAL</p><h2>Projetos por etapa</h2></div><button onClick={() => setActiveView("projects")}>Ver Kanban</button></div><div className="stage-summary">{stages.filter((stage) => stage !== "completed").map((stage) => { const count = projects.filter((project) => project.stage === stage).length; return <div key={stage}><span>{stageLabels[stage]}</span><b>{count}</b><i><em style={{ width: `${projects.length ? Math.max(4, count / projects.length * 100) : 0}%` }} /></i></div>; })}</div></article>
            <article className="panel"><div className="panel-head"><div><p className="eyebrow">AGENDA</p><h2>Próximos prazos</h2></div></div><div className="agenda-list">{upcoming.map((item) => <button key={`${item.project.id}-${item.date}-${item.label}`} onClick={() => setSelectedProject(item.project)}><time>{shortDate.format(new Date(`${item.date}T12:00:00`))}</time><div><b>{item.label}</b><span>{projectClient(item.project)} · {item.project.name}</span></div></button>)}{!upcoming.length && <p className="empty-state">Nenhum prazo futuro cadastrado.</p>}</div></article>
          </section>
        </>}

        {activeView === "projects" && <>
          <section className="project-toolbar"><label>⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, projeto ou código…" /></label><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as "all" | ProjectStage)}><option value="all">Todas as etapas</option>{stages.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select><span>{loading ? "Atualizando…" : `${filteredProjects.length} projetos`}</span></section>
          <section className="project-board">{stages.map((stage) => <div className="project-column" key={stage} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData("text/plain"); const project = projects.find((item) => item.id === id); if (project) void moveProject(project, stage); }}><header><div><i /><b>{stageLabels[stage]}</b></div><span>{filteredProjects.filter((project) => project.stage === stage).length}</span></header><div className="project-lane">{filteredProjects.filter((project) => project.stage === stage).map((project) => <article className="project-card" key={project.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", project.id)} onClick={() => setSelectedProject(project)}><div className="card-top"><b>{project.code}</b><span data-priority={project.priority}>{priorityLabels[project.priority]}</span></div><h3>{project.name}</h3><p>{projectClient(project)}</p><div className="card-meta"><span>{project.project_type}</span><span data-overdue={deadlineLabel(project).includes("atrasado")}>{deadlineLabel(project)}</span></div><footer><i>{(project.responsible_name || "CA").slice(0, 2).toUpperCase()}</i><span>{statusLabels[project.status]}</span></footer></article>)}</div></div>)}</section>
        </>}

        {activeView === "agenda" && <section className="panel full"><div className="panel-head"><div><p className="eyebrow">CRONOGRAMA CENTRAL</p><h2>Prazos e entregas</h2></div></div><div className="timeline">{projects.flatMap((project) => [project.deadline_stage_1, project.deadline_stage_2, project.deadline_stage_3].map((date, index) => date ? { project, date, index } : null).filter(Boolean) as Array<{project: Project; date: string; index: number}>).sort((a,b) => a.date.localeCompare(b.date)).map((item) => <article key={`${item.project.id}-${item.index}`}><time><b>{new Date(`${item.date}T12:00:00`).getDate()}</b><span>{new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" })}</span></time><div><small>ENTREGA E{item.index + 1}</small><h3>{item.project.name}</h3><p>{projectClient(item.project)} · {stageLabels[item.project.stage]}</p></div><button onClick={() => setSelectedProject(item.project)}>Abrir</button></article>)}</div></section>}

        {activeView === "clients" && <section className="client-grid">{clients.map((client) => { const own = projects.filter((project) => project.client?.id === client.id || project.client_id === client.id); return <article key={client.id}><div className="client-avatar">{client.name.split(/\s+/).slice(0,2).map((part) => part[0]).join("")}</div><div><h3>{client.name}</h3><p>{client.email || "E-mail não informado"}</p><span>{own.length} projeto{own.length === 1 ? "" : "s"}</span></div></article>; })}</section>}

        {activeView === "finance" && <section className="finance-grid"><article className="finance-total"><small>VALOR CONTRATADO</small><strong>{money.format(totalContracted)}</strong><p>Recebido: {money.format(totalReceived)}</p><div><i style={{ width: `${totalContracted ? totalReceived / totalContracted * 100 : 0}%` }} /></div></article><article className="panel finance-table"><div className="panel-head"><div><p className="eyebrow">POR PROJETO</p><h2>Contratos e recebimentos</h2></div></div>{projects.filter((project) => project.contract_value > 0).map((project) => <div className="finance-row" key={project.id}><div><b>{projectClient(project)}</b><span>{project.name}</span></div><strong>{money.format(project.contract_value)}</strong><span>{money.format(project.amount_received)} recebido</span><em>{money.format(project.balance_due)} pendente</em></div>)}</article></section>}

        {activeView === "settings" && <section className="settings-grid"><article><span>◆</span><div><small>BANCO DE DADOS</small><b>{isSupabaseConfigured ? "Supabase conectado" : "Aguardando configuração"}</b><p>Clientes, projetos, prazos e financeiro centralizados.</p></div></article><article><span>▣</span><div><small>PROJETOS IMPORTADOS</small><b>{projects.length} registros</b><p>A base inicial pode ser carregada pelo arquivo SQL incluído.</p></div></article><article><span>🔒</span><div><small>SEGURANÇA</small><b>RLS preparado</b><p>Políticas de acesso por usuário autenticado.</p></div></article></section>}
      </main>

      {modalOpen && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><form className="studio-modal" onSubmit={createProject}><button type="button" className="modal-close" onClick={() => setModalOpen(false)}>×</button><p className="eyebrow">NOVO CADASTRO</p><h2>Novo projeto</h2><div className="form-grid"><label>Código<input name="code" placeholder="ARQ-017" /></label><label>Cliente<input name="client_name" required placeholder="Nome do cliente" /></label><label className="wide">Nome do projeto<input name="name" required placeholder="Ex.: Residência Silva" /></label><label>Tipo<select name="project_type"><option>Arquitetura</option><option>Interiores</option><option>Arquitetura e Interiores</option><option>Regularização</option><option>Loteamento</option></select></label><label>Subtipo<input name="subtype" placeholder="Novo, reforma…" /></label><label>Etapa<select name="stage">{stages.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select></label><label>Status<select name="status"><option value="not_started">Não iniciado</option><option value="in_progress">Em andamento</option><option value="waiting">Em espera</option><option value="waiting_client">Aguardando cliente</option><option value="correction">Em correção</option></select></label><label>Prioridade<select name="priority"><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option><option value="low">Baixa</option></select></label><label>Responsável<input name="responsible_name" defaultValue="Camilla" /></label><label>Prazo principal<input name="deadline" type="date" /></label><label>Valor contratado<input name="contract_value" type="number" min="0" step="0.01" /></label><label>Valor recebido<input name="amount_received" type="number" min="0" step="0.01" /></label><label className="wide">Observações<textarea name="notes" rows={3} /></label></div><div className="modal-actions"><button type="button" onClick={() => setModalOpen(false)}>Cancelar</button><button className="primary">Criar projeto</button></div></form></div>}

      {selectedProject && <div className="overlay detail-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProject(null); }}><article className="project-detail"><button className="modal-close" onClick={() => setSelectedProject(null)}>×</button><div className="detail-hero"><p className="eyebrow">{selectedProject.code} · {selectedProject.project_type}</p><h2>{selectedProject.name}</h2><p>{projectClient(selectedProject)}</p><div><span>{stageLabels[selectedProject.stage]}</span><span>{statusLabels[selectedProject.status]}</span><span>{priorityLabels[selectedProject.priority]}</span></div></div><section className="detail-stats"><div><small>Prazo principal</small><b>{selectedProject.deadline_stage_3 ? new Date(`${selectedProject.deadline_stage_3}T12:00:00`).toLocaleDateString("pt-BR") : "Não definido"}</b></div><div><small>Responsável</small><b>{selectedProject.responsible_name || "Não atribuído"}</b></div><div><small>Contrato</small><b>{money.format(selectedProject.contract_value)}</b></div><div><small>Saldo</small><b>{money.format(selectedProject.balance_due)}</b></div></section><section className="detail-section"><h3>Entregas planejadas</h3><div className="delivery-steps">{[selectedProject.deadline_stage_1, selectedProject.deadline_stage_2, selectedProject.deadline_stage_3].map((date, index) => <div key={index} className={date ? "filled" : ""}><i>{index + 1}</i><span><b>Etapa {index + 1}</b><small>{date ? new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR") : "Sem data"}</small></span></div>)}</div></section>{selectedProject.notes && <section className="detail-section"><h3>Observações</h3><p>{selectedProject.notes}</p></section>}</article></div>}
    </div>
  );
}
