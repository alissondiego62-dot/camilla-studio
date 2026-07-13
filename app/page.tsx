"use client";

import type { User } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSynchronizedKanbanScroll } from "./hooks/useSynchronizedKanbanScroll";
import { NotificationSettings } from "./components/NotificationSettings";
import { registerAppServiceWorker } from "@/lib/push-notifications";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getChecklistTemplate, menuItems, priorityLabels, responsibleOptions, stageLabels, stages, statusLabels } from "./domain/architecture-config";
import type { Client, Project, ProjectComment, ProjectFile, ProjectFileCategory, ProjectHistory, ProjectPriority, ProjectStage, ProjectStatus, ViewKey, CalendarEvent, ProjectFinancialEntry, ProjectChecklistItem } from "./domain/architecture-types";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

function asDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function deadlineLabel(project: Project) {
  const date = asDate(project.main_deadline || project.deadline_stage_3 || project.deadline_stage_2 || project.deadline_stage_1);
  if (!date) return "Sem prazo";
  const diff = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d atrasado`;
  if (diff === 0) return "Entrega hoje";
  return `em ${diff} dias`;
}

function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const format = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  return { start: format(start), end: format(end) };
}

function projectClient(project: Project) {
  return project.client?.name || "Cliente não informado";
}

const demoProjects: Project[] = [
  { id: "demo-1", code: "ARQ-001", client_id: null, name: "Residência Victor Bisneto", project_type: "Arquitetura", subtype: "Reforma", stage: "creation", status: "in_progress", priority: "high", responsible_name: "Camilla", main_deadline: "2026-07-22", deadline_stage_1: "2026-07-14", deadline_stage_2: "2026-07-17", deadline_stage_3: "2026-07-22", contract_value: 0, amount_received: 0, balance_due: 0, cover_url: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), client: { id: "c1", name: "Victor Bisneto", phone: null, email: null, notes: null, created_at: new Date().toISOString() } },
  { id: "demo-2", code: "INT-002", client_id: null, name: "Interiores Marciano", project_type: "Interiores", subtype: "Novo", stage: "creation", status: "in_progress", priority: "normal", responsible_name: "Camilla", main_deadline: "2026-07-30", deadline_stage_1: null, deadline_stage_2: "2026-07-15", deadline_stage_3: "2026-07-30", contract_value: 9850, amount_received: 4925, balance_due: 4925, cover_url: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), client: { id: "c2", name: "Marciano", phone: null, email: null, notes: null, created_at: new Date().toISOString() } },
  { id: "demo-3", code: "ARQ-003", client_id: null, name: "Projeto Horacio", project_type: "Arquitetura", subtype: "Reforma", stage: "executive", status: "not_started", priority: "normal", responsible_name: "Camilla", main_deadline: "2026-07-20", deadline_stage_1: null, deadline_stage_2: null, deadline_stage_3: "2026-07-20", contract_value: 3700, amount_received: 1850, balance_due: 1850, cover_url: null, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), client: { id: "c3", name: "Horacio", phone: null, email: null, notes: null, created_at: new Date().toISOString() } },
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
  const [projectDraft, setProjectDraft] = useState<Project | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [projectComments, setProjectComments] = useState<ProjectComment[]>([]);
  const [projectHistory, setProjectHistory] = useState<ProjectHistory[]>([]);
  const [projectEvents, setProjectEvents] = useState<CalendarEvent[]>([]);
  const [projectFinancialEntries, setProjectFinancialEntries] = useState<ProjectFinancialEntry[]>([]);
  const [projectChecklist, setProjectChecklist] = useState<ProjectChecklistItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [financialEntries, setFinancialEntries] = useState<ProjectFinancialEntry[]>([]);
  const [globalFinanceForm, setGlobalFinanceForm] = useState<"income" | "expense" | null>(null);
  const [agendaFormOpen, setAgendaFormOpen] = useState(false);
  const [editingCalendarEvent, setEditingCalendarEvent] = useState<CalendarEvent | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "checklist" | "agenda" | "finance" | "files" | "comments" | "history">("overview");
  const initialFinanceRange = monthRange();
  const [financeStart, setFinanceStart] = useState(initialFinanceRange.start);
  const [financeEnd, setFinanceEnd] = useState(initialFinanceRange.end);
  const [filesLoading, setFilesLoading] = useState(false);
  const [fileFormOpen, setFileFormOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { boardRef, topScrollRef, scrollWidth, synchronize } = useSynchronizedKanbanScroll({
    enabled: activeView === "projects",
    dependencyKey: `${projects.length}-${stageFilter}-${search}`,
  });

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
    void registerAppServiceWorker().catch(() => undefined);
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "agenda") setActiveView("agenda");
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    void loadData();
  }, [user]);

  useEffect(() => {
    if (activeView !== "agenda" || !isSupabaseConfigured || !user) return;
    void refreshProjects();
  }, [activeView, user]);

  useEffect(() => {
    if (!selectedProject) {
      setProjectDraft(null);
      setProjectFiles([]);
      setProjectComments([]);
      setProjectHistory([]);
      setProjectEvents([]);
      setProjectFinancialEntries([]);
      setProjectChecklist([]);
      setFileFormOpen(false);
      setDetailTab("overview");
      return;
    }
    setProjectDraft({ ...selectedProject });
    if (!isSupabaseConfigured || !user || selectedProject.id.startsWith("demo-")) {
      setProjectFiles([]);
      setProjectComments([]);
      setProjectHistory([]);
      setProjectEvents([]);
      setProjectFinancialEntries([]);
      setProjectChecklist([]);
      return;
    }
    void Promise.all([loadProjectFiles(selectedProject.id), loadProjectComments(selectedProject.id), loadProjectHistory(selectedProject.id), loadProjectEvents(selectedProject.id), loadProjectFinancialEntries(selectedProject.id), loadProjectChecklist(selectedProject.id)]);
  }, [selectedProject, user]);

  async function refreshProjects() {
    const result = await supabase
      .from("projects")
      .select("*,client:clients(*)")
      .order("updated_at", { ascending: false });

    if (result.error) {
      setError(`Não foi possível atualizar os prazos dos projetos: ${result.error.message}`);
      return;
    }

    setProjects((result.data || []) as Project[]);
  }

  async function loadData() {
    setLoading(true);
    const [projectResult, clientResult, agendaResult, financeResult] = await Promise.all([
      supabase.from("projects").select("*,client:clients(*)").order("updated_at", { ascending: false }),
      supabase.from("clients").select("*").order("name"),
      supabase.from("calendar_events").select("*").order("starts_at", { ascending: true }),
      supabase.from("project_financial_entries").select("*").order("received_on", { ascending: false }),
    ]);
    const dbError = projectResult.error || clientResult.error || agendaResult.error || financeResult.error;
    if (dbError) setError(`Não foi possível carregar o banco: ${dbError.message}`);
    else {
      setProjects((projectResult.data || []) as Project[]);
      setClients((clientResult.data || []) as Client[]);
      setCalendarEvents((agendaResult.data || []) as CalendarEvent[]);
      setFinancialEntries(((financeResult.data || []) as ProjectFinancialEntry[]).map((item) => ({ ...item, entry_type: item.entry_type || "income" })));
      setError("");
    }
    setLoading(false);
  }

  async function loadProjectFiles(projectId: string) {
    setFilesLoading(true);
    const result = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (result.error) setError(`Não foi possível carregar os links do Drive: ${result.error.message}`);
    else setProjectFiles((result.data || []) as ProjectFile[]);
    setFilesLoading(false);
  }

  async function loadProjectComments(projectId: string) {
    const result = await supabase
      .from("project_comments")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (result.error) setError(`Não foi possível carregar os comentários: ${result.error.message}`);
    else setProjectComments((result.data || []) as ProjectComment[]);
  }

  async function loadProjectChecklist(projectId: string) {
    const result = await supabase
      .from("project_checklist_items")
      .select("*")
      .eq("project_id", projectId)
      .order("stage")
      .order("position");
    if (result.error) setError(`Não foi possível carregar o checklist: ${result.error.message}`);
    else setProjectChecklist((result.data || []) as ProjectChecklistItem[]);
  }

  async function loadProjectHistory(projectId: string) {
    const result = await supabase
      .from("project_history")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (result.error) setError(`Não foi possível carregar o histórico: ${result.error.message}`);
    else setProjectHistory((result.data || []) as ProjectHistory[]);
  }

  async function loadProjectEvents(projectId: string) {
    const result = await supabase.from("calendar_events").select("*").eq("project_id", projectId).order("starts_at", { ascending: true });
    if (result.error) setError(`Não foi possível carregar a agenda: ${result.error.message}`);
    else setProjectEvents((result.data || []) as CalendarEvent[]);
  }

  async function loadProjectFinancialEntries(projectId: string) {
    const result = await supabase.from("project_financial_entries").select("*").eq("project_id", projectId).order("received_on", { ascending: false });
    if (result.error) setError(`Não foi possível carregar os lançamentos: ${result.error.message}`);
    else setProjectFinancialEntries(((result.data || []) as ProjectFinancialEntry[]).map((item) => ({ ...item, entry_type: item.entry_type || "income" })));
  }

  type EditableProjectField = "stage" | "status" | "responsible_name" | "main_deadline" | "deadline_stage_1" | "deadline_stage_2" | "deadline_stage_3" | "contract_value";

  const editableProjectFields: EditableProjectField[] = ["stage", "status", "responsible_name", "main_deadline", "deadline_stage_1", "deadline_stage_2", "deadline_stage_3", "contract_value"];

  const editableFieldLabels: Record<EditableProjectField, string> = {
    stage: "Etapa",
    status: "Status",
    responsible_name: "Responsável",
    main_deadline: "Prazo principal",
    deadline_stage_1: "Data da entrega 1",
    deadline_stage_2: "Data da entrega 2",
    deadline_stage_3: "Data da entrega 3",
    contract_value: "Valor do contrato",
  };

  function normalizeEditableValue(field: EditableProjectField, rawValue: string) {
    return field === "contract_value" ? Math.max(0, Number(rawValue || 0)) : (rawValue || null);
  }

  function updateProjectDraft(field: EditableProjectField, rawValue: string) {
    setProjectDraft((current) => current ? ({ ...current, [field]: normalizeEditableValue(field, rawValue) } as Project) : current);
  }

  function projectDraftHasChanges() {
    if (!selectedProject || !projectDraft) return false;
    return editableProjectFields.some((field) => String(selectedProject[field] ?? "") !== String(projectDraft[field] ?? ""));
  }

  async function saveProjectDraft() {
    if (!selectedProject || !projectDraft) return true;
    const changedFields = editableProjectFields.filter((field) => String(selectedProject[field] ?? "") !== String(projectDraft[field] ?? ""));
    if (!changedFields.length) return true;

    const payload = Object.fromEntries(changedFields.map((field) => [field, projectDraft[field]]));
    const updated = {
      ...selectedProject,
      ...payload,
      balance_due: Math.max(0, Number(projectDraft.contract_value || 0) - Number(selectedProject.amount_received || 0)),
      updated_at: new Date().toISOString(),
    } as Project;

    if (!isSupabaseConfigured || !user || selectedProject.id.startsWith("demo-")) {
      setProjects((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelectedProject(updated);
      setProjectDraft({ ...updated });
      const now = new Date().toISOString();
      setProjectHistory((current) => [
        ...changedFields.map((field, index) => ({
          id: Date.now() + index,
          project_id: selectedProject.id,
          action_type: "project_updated",
          description: `${editableFieldLabels[field]} alterado.`,
          author_id: user?.id || null,
          created_at: now,
        })),
        ...current,
      ]);
      setNotice("Alterações salvas no modo demonstração.");
      return true;
    }

    const result = await supabase.from("projects").update(payload).eq("id", selectedProject.id).select("*,client:clients(*)").single();
    if (result.error) {
      setError(`Não foi possível salvar as alterações: ${result.error.message}`);
      return false;
    }

    const saved = result.data as Project;
    setProjects((current) => current.map((item) => item.id === saved.id ? saved : item));
    setSelectedProject(saved);
    setProjectDraft({ ...saved });
    setNotice("Alterações do projeto salvas.");
    void Promise.all([loadProjectHistory(saved.id), refreshProjects()]);
    return true;
  }

  async function closeProjectDetails() {
    if (projectDraftHasChanges()) {
      const shouldSave = window.confirm("Existem alterações não salvas neste projeto. Deseja salvar antes de fechar?");
      if (shouldSave) {
        const saved = await saveProjectDraft();
        if (!saved) return;
      }
    }
    setSelectedProject(null);
    setProjectDraft(null);
  }

  async function finalizeProject() {
    if (!selectedProject) return;
    if (!window.confirm(`Finalizar o projeto “${selectedProject.name}”? Ele será movido para a página Finalizados.`)) return;
    if (projectDraftHasChanges()) {
      const saved = await saveProjectDraft();
      if (!saved) return;
    }
    const updated = { ...selectedProject, stage: "completed" as ProjectStage, status: "completed" as ProjectStatus, updated_at: new Date().toISOString() };
    if (isSupabaseConfigured && user && !selectedProject.id.startsWith("demo-")) {
      const result = await supabase.from("projects").update({ stage: "completed", status: "completed" }).eq("id", selectedProject.id).select("*,client:clients(*)").single();
      if (result.error) { setError(`Não foi possível finalizar o projeto: ${result.error.message}`); return; }
      await supabase.from("project_history").insert({ project_id: selectedProject.id, action_type: "project_completed", description: "Projeto finalizado e movido para o arquivo de finalizados." });
      setProjects((current) => current.map((item) => item.id === selectedProject.id ? result.data as Project : item));
    } else {
      setProjects((current) => current.map((item) => item.id === selectedProject.id ? updated : item));
    }
    setSelectedProject(null);
    setProjectDraft(null);
    setNotice("Projeto finalizado. Os dados financeiros continuam disponíveis no Financeiro.");
  }

  async function addCalendarEvent(event: FormEvent<HTMLFormElement>, project: Project | null = selectedProject) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get("title") || "").trim();
    const date = String(form.get("date") || "");
    const time = String(form.get("time") || "09:00");
    const projectId = String(form.get("project_id") || project?.id || "") || null;
    if (!title || !date) return;
    const draft: CalendarEvent = { id: crypto.randomUUID(), project_id: projectId, title, event_type: String(form.get("event_type") || "meeting"), starts_at: new Date(`${date}T${time}:00`).toISOString(), ends_at: null, location: String(form.get("location") || "").trim() || null, notes: String(form.get("notes") || "").trim() || null, completed_at: null, created_at: new Date().toISOString() };
    if (!isSupabaseConfigured || !user || projectId?.startsWith("demo-")) {
      setCalendarEvents((current) => [...current, draft].sort((a,b) => a.starts_at.localeCompare(b.starts_at)));
      if (projectId === selectedProject?.id) setProjectEvents((current) => [...current, draft].sort((a,b) => a.starts_at.localeCompare(b.starts_at)));
      setNotice("Compromisso adicionado no modo demonstração.");
      formElement.reset(); setAgendaFormOpen(false); return;
    }
    const result = await supabase.from("calendar_events").insert({ project_id: projectId, title: draft.title, event_type: draft.event_type, starts_at: draft.starts_at, location: draft.location, notes: draft.notes }).select().single();
    if (result.error) { setError(result.error.message); return; }
    const saved = result.data as CalendarEvent;
    setCalendarEvents((current) => [...current, saved].sort((a,b) => a.starts_at.localeCompare(b.starts_at)));
    if (projectId === selectedProject?.id) setProjectEvents((current) => [...current, saved].sort((a,b) => a.starts_at.localeCompare(b.starts_at)));
    if (projectId) {
      await supabase.from("project_history").insert({ project_id: projectId, action_type: "event_created", description: `Compromisso criado: ${title}.` });
      if (projectId === selectedProject?.id) void loadProjectHistory(projectId);
    }
    formElement.reset(); setAgendaFormOpen(false); setNotice("Compromisso adicionado.");
  }

  async function updateCalendarEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCalendarEvent) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get("title") || "").trim();
    const date = String(form.get("date") || "");
    const time = String(form.get("time") || "09:00");
    const projectId = String(form.get("project_id") || "") || null;
    if (!title || !date) return;

    const updated: CalendarEvent = {
      ...editingCalendarEvent,
      project_id: projectId,
      title,
      event_type: String(form.get("event_type") || "meeting"),
      starts_at: new Date(`${date}T${time}:00`).toISOString(),
      location: String(form.get("location") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
    };

    if (isSupabaseConfigured && user && !editingCalendarEvent.id.startsWith("demo-")) {
      const result = await supabase
        .from("calendar_events")
        .update({ project_id: updated.project_id, title: updated.title, event_type: updated.event_type, starts_at: updated.starts_at, location: updated.location, notes: updated.notes })
        .eq("id", editingCalendarEvent.id)
        .select()
        .single();
      if (result.error) { setError(`Não foi possível atualizar o compromisso: ${result.error.message}`); return; }
      Object.assign(updated, result.data as CalendarEvent);
    }

    setCalendarEvents((current) => current.map((item) => item.id === updated.id ? updated : item).sort((a,b) => a.starts_at.localeCompare(b.starts_at)));
    setProjectEvents((current) => current.filter((item) => item.id !== updated.id || updated.project_id === selectedProject?.id).map((item) => item.id === updated.id ? updated : item).sort((a,b) => a.starts_at.localeCompare(b.starts_at)));
    if (updated.project_id === selectedProject?.id && !projectEvents.some((item) => item.id === updated.id)) {
      setProjectEvents((current) => [...current, updated].sort((a,b) => a.starts_at.localeCompare(b.starts_at)));
    }
    if (isSupabaseConfigured && user && updated.project_id) {
      await supabase.from("project_history").insert({ project_id: updated.project_id, action_type: "event_updated", description: `Compromisso atualizado: ${updated.title}.` });
      if (updated.project_id === selectedProject?.id) void loadProjectHistory(updated.project_id);
    }
    setEditingCalendarEvent(null);
    setNotice("Compromisso atualizado.");
  }

  async function toggleCalendarEventCompleted(item: CalendarEvent) {
    const completing = !item.completed_at;
    const completedAt = completing ? new Date().toISOString() : null;
    const updated: CalendarEvent = { ...item, completed_at: completedAt };

    if (isSupabaseConfigured && user && !item.id.startsWith("demo-")) {
      const result = await supabase
        .from("calendar_events")
        .update({ completed_at: completedAt })
        .eq("id", item.id)
        .select()
        .single();
      if (result.error) {
        setError(`Não foi possível ${completing ? "concluir" : "reabrir"} o compromisso: ${result.error.message}`);
        return;
      }
      Object.assign(updated, result.data as CalendarEvent);
    }

    setCalendarEvents((current) => current.map((eventItem) => eventItem.id === updated.id ? updated : eventItem));
    setProjectEvents((current) => current.map((eventItem) => eventItem.id === updated.id ? updated : eventItem));

    if (isSupabaseConfigured && user && updated.project_id) {
      await supabase.from("project_history").insert({
        project_id: updated.project_id,
        action_type: completing ? "event_completed" : "event_reopened",
        description: completing ? `Compromisso concluído: ${updated.title}.` : `Compromisso reaberto: ${updated.title}.`,
      });
      if (updated.project_id === selectedProject?.id) void loadProjectHistory(updated.project_id);
    }

    setNotice(completing ? "Compromisso concluído." : "Compromisso reaberto.");
  }

  async function removeCalendarEvent(item: CalendarEvent) {
    if (!window.confirm(`Remover o compromisso “${item.title}”?`)) return;
    if (isSupabaseConfigured && user && !item.id.startsWith("demo-")) {
      const result = await supabase.from("calendar_events").delete().eq("id", item.id);
      if (result.error) { setError(`Não foi possível remover o compromisso: ${result.error.message}`); return; }
      if (item.project_id) {
        await supabase.from("project_history").insert({ project_id: item.project_id, action_type: "event_deleted", description: `Compromisso removido: ${item.title}.` });
        if (item.project_id === selectedProject?.id) void loadProjectHistory(item.project_id);
      }
    }
    setCalendarEvents((current) => current.filter((eventItem) => eventItem.id !== item.id));
    setProjectEvents((current) => current.filter((eventItem) => eventItem.id !== item.id));
    if (editingCalendarEvent?.id === item.id) setEditingCalendarEvent(null);
    setNotice("Compromisso removido.");
  }

  async function addFinancialEntry(event: FormEvent<HTMLFormElement>, project: Project | null = selectedProject) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount") || 0);
    const description = String(form.get("description") || "Lançamento financeiro").trim();
    const receivedOn = String(form.get("received_on") || new Date().toISOString().slice(0,10));
    const entryType = String(form.get("entry_type") || "income") as "income" | "expense";
    const projectId = String(form.get("project_id") || project?.id || "") || null;
    if (amount <= 0) return;
    const draft: ProjectFinancialEntry = { id: crypto.randomUUID(), project_id: projectId, entry_type: entryType, description, category: String(form.get("category") || (entryType === "income" ? "payment" : "operational")), amount, received_on: receivedOn, payment_method: String(form.get("payment_method") || "").trim() || null, notes: String(form.get("notes") || "").trim() || null, created_at: new Date().toISOString() };
    const targetProject = projectId ? projects.find((item) => item.id === projectId) || project : null;
    const newReceived = targetProject && entryType === "income" ? Number(targetProject.amount_received || 0) + amount : Number(targetProject?.amount_received || 0);
    const updatedProject = targetProject ? { ...targetProject, amount_received: newReceived, balance_due: Math.max(0, Number(targetProject.contract_value || 0) - newReceived) } : null;

    if (!isSupabaseConfigured || !user || projectId?.startsWith("demo-")) {
      setFinancialEntries((current) => [draft, ...current]);
      if (projectId === selectedProject?.id) setProjectFinancialEntries((current) => [draft, ...current]);
      if (updatedProject && entryType === "income") {
        setProjects((current) => current.map((item) => item.id === updatedProject.id ? updatedProject : item));
        if (selectedProject?.id === updatedProject.id) { setSelectedProject(updatedProject); setProjectDraft((current) => current ? { ...current, ...updatedProject } : current); }
      }
      setNotice(`${entryType === "income" ? "Receita" : "Despesa"} lançada no modo demonstração.`); event.currentTarget.reset(); setGlobalFinanceForm(null); return;
    }
    const result = await supabase.from("project_financial_entries").insert({ project_id: projectId, entry_type: entryType, description: draft.description, category: draft.category, amount, received_on: receivedOn, payment_method: draft.payment_method, notes: draft.notes }).select().single();
    if (result.error) { setError(result.error.message); return; }
    if (updatedProject && entryType === "income") {
      const projectUpdate = await supabase.from("projects").update({ amount_received: newReceived }).eq("id", updatedProject.id).select("*,client:clients(*)").single();
      if (projectUpdate.error) { setError(projectUpdate.error.message); return; }
      const savedProject = projectUpdate.data as Project;
      setProjects((current) => current.map((item) => item.id === savedProject.id ? savedProject : item));
      if (selectedProject?.id === savedProject.id) { setSelectedProject(savedProject); setProjectDraft({ ...savedProject }); }
    }
    const savedEntry = { ...(result.data as ProjectFinancialEntry), entry_type: (result.data.entry_type || entryType) as "income" | "expense" };
    setFinancialEntries((current) => [savedEntry, ...current]);
    if (projectId === selectedProject?.id) setProjectFinancialEntries((current) => [savedEntry, ...current]);
    if (projectId) {
      await supabase.from("project_history").insert({ project_id: projectId, action_type: "financial_entry", description: `${entryType === "income" ? "Receita" : "Despesa"} lançada: ${money.format(amount)}.` });
      if (projectId === selectedProject?.id) void loadProjectHistory(projectId);
    }
    event.currentTarget.reset(); setGlobalFinanceForm(null); setNotice(`${entryType === "income" ? "Receita" : "Despesa"} lançada.`);
  }

  async function addProjectComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    const form = new FormData(event.currentTarget);
    const comment = String(form.get("comment") || "").trim();
    if (!comment) return;

    const draft: ProjectComment = {
      id: crypto.randomUUID(),
      project_id: selectedProject.id,
      author_id: user?.id || null,
      comment,
      created_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured || !user || selectedProject.id.startsWith("demo-")) {
      setProjectComments((current) => [draft, ...current]);
      setProjectHistory((current) => [{ id: Date.now(), project_id: selectedProject.id, action_type: "comment_added", description: "Novo comentário adicionado.", author_id: user?.id || null, created_at: new Date().toISOString() }, ...current]);
      event.currentTarget.reset();
      setNotice("Comentário adicionado no modo demonstração.");
      return;
    }

    const result = await supabase
      .from("project_comments")
      .insert({ project_id: selectedProject.id, comment })
      .select()
      .single();
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setProjectComments((current) => [result.data as ProjectComment, ...current]);
    await supabase.from("project_history").insert({ project_id: selectedProject.id, action_type: "comment_added", description: "Novo comentário adicionado." });
    void loadProjectHistory(selectedProject.id);
    event.currentTarget.reset();
    setNotice("Comentário adicionado.");
  }

  async function addDriveLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const driveUrl = String(form.get("drive_url") || "").trim();
    const category = String(form.get("category") || "other") as ProjectFileCategory;
    const notes = String(form.get("notes") || "").trim() || null;
    if (!name || !driveUrl) return;
    if (!/^https:\/\/(drive|docs)\.google\.com\//i.test(driveUrl)) {
      setError("Informe um link válido do Google Drive ou Google Docs.");
      return;
    }

    const draft: ProjectFile = {
      id: crypto.randomUUID(),
      project_id: selectedProject.id,
      name,
      category,
      drive_url: driveUrl,
      drive_file_id: null,
      mime_type: null,
      notes,
      created_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured || !user || selectedProject.id.startsWith("demo-")) {
      setProjectFiles((current) => [draft, ...current]);
      setNotice("Link adicionado no modo demonstração.");
      setFileFormOpen(false);
      event.currentTarget.reset();
      return;
    }

    const result = await supabase
      .from("project_files")
      .insert({ project_id: selectedProject.id, name, category, drive_url: driveUrl, notes })
      .select()
      .single();
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setProjectFiles((current) => [result.data as ProjectFile, ...current]);
    setNotice("Link do Google Drive adicionado.");
    setFileFormOpen(false);
    event.currentTarget.reset();
  }

  async function removeDriveLink(file: ProjectFile) {
    if (!confirm(`Remover o link “${file.name}”?`)) return;
    setProjectFiles((current) => current.filter((item) => item.id !== file.id));
    if (isSupabaseConfigured && user && !file.id.startsWith("demo-")) {
      const result = await supabase.from("project_files").delete().eq("id", file.id);
      if (result.error) {
        setError(result.error.message);
        if (selectedProject) void loadProjectFiles(selectedProject.id);
      }
    }
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
      main_deadline: String(form.get("deadline") || "") || null,
      deadline_stage_3: null,
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

  async function createChecklistFromTemplate(stage: ProjectStage) {
    if (!selectedProject) return;
    const template = getChecklistTemplate(selectedProject.project_type, stage);
    if (!template.length) return setNotice("Não há itens padrão para esta etapa.");
    const existingTitles = new Set(projectChecklist.filter((item) => item.stage === stage).map((item) => item.title));
    const items = template.filter((item) => !existingTitles.has(item.title)).map((item, index) => ({
      id: crypto.randomUUID(), project_id: selectedProject.id, stage, section: item.section, title: item.title, completed_at: null, position: projectChecklist.length + index, created_at: new Date().toISOString(),
    }));
    if (!items.length) return setNotice("O checklist padrão desta etapa já foi criado.");
    if (!isSupabaseConfigured || !user || selectedProject.id.startsWith("demo-")) {
      setProjectChecklist((current) => [...current, ...items]);
      return setNotice("Checklist criado no modo demonstração.");
    }
    const result = await supabase.from("project_checklist_items").insert(items.map(({ id, created_at, ...item }) => item)).select();
    if (result.error) return setError(result.error.message);
    setProjectChecklist((current) => [...current, ...((result.data || []) as ProjectChecklistItem[])]);
    await supabase.from("project_history").insert({ project_id: selectedProject.id, action_type: "checklist_created", description: `Checklist da etapa ${stageLabels[stage]} criado.` });
    setNotice("Checklist padrão criado.");
  }

  async function addChecklistItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const stage = String(data.get("stage")) as ProjectStage;
    const title = String(data.get("title") || "").trim();
    const section = String(data.get("section") || stageLabels[stage]).trim();
    if (!title) return;
    const draft: ProjectChecklistItem = { id: crypto.randomUUID(), project_id: selectedProject.id, stage, section, title, completed_at: null, position: projectChecklist.length, created_at: new Date().toISOString() };
    if (!isSupabaseConfigured || !user || selectedProject.id.startsWith("demo-")) { setProjectChecklist((current) => [...current, draft]); form.reset(); return; }
    const result = await supabase.from("project_checklist_items").insert({ project_id: draft.project_id, stage, section, title, position: draft.position }).select().single();
    if (result.error) return setError(result.error.message);
    setProjectChecklist((current) => [...current, result.data as ProjectChecklistItem]);
    form.reset();
  }

  async function toggleChecklistItem(item: ProjectChecklistItem) {
    const completed_at = item.completed_at ? null : new Date().toISOString();
    setProjectChecklist((current) => current.map((value) => value.id === item.id ? { ...value, completed_at } : value));
    if (isSupabaseConfigured && user && !item.id.startsWith("demo-")) {
      const result = await supabase.from("project_checklist_items").update({ completed_at }).eq("id", item.id);
      if (result.error) { setError(result.error.message); void loadProjectChecklist(item.project_id); }
    }
  }

  async function removeChecklistItem(item: ProjectChecklistItem) {
    if (!confirm(`Remover o item “${item.title}”?`)) return;
    setProjectChecklist((current) => current.filter((value) => value.id !== item.id));
    if (isSupabaseConfigured && user && !item.id.startsWith("demo-")) {
      const result = await supabase.from("project_checklist_items").delete().eq("id", item.id);
      if (result.error) { setError(result.error.message); void loadProjectChecklist(item.project_id); }
    }
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
    const isOpen = project.stage !== "completed" && project.status !== "completed";
    return isOpen && matchesText && (stageFilter === "all" || project.stage === stageFilter);
  }), [projects, search, stageFilter]);

  const kanbanStages = stages.filter((stage) => stage !== "completed");
  const completedProjects = projects.filter((project) => project.stage === "completed" || project.status === "completed");
  const completedByClient = completedProjects.reduce<Record<string, { client: string; projects: Project[] }>>((groups, project) => {
    const client = projectClient(project);
    const key = project.client_id || client.toLowerCase();
    groups[key] ||= { client, projects: [] };
    groups[key].projects.push(project);
    return groups;
  }, {});

  const activeProjects = projects.filter((project) => project.stage !== "completed" && !["completed", "cancelled"].includes(project.status));
  const overdueProjects = activeProjects.filter((project) => deadlineLabel(project).includes("atrasado"));
  const allTotalContracted = projects.reduce((sum, project) => sum + Number(project.contract_value || 0), 0);
  const allTotalReceived = projects.reduce((sum, project) => sum + Number(project.amount_received || 0), 0);
  const dateInFinanceRange = (value: string) => value.slice(0, 10) >= financeStart && value.slice(0, 10) <= financeEnd;
  const periodProjects = projects.filter((project) => dateInFinanceRange(project.created_at));
  const periodProjectIds = new Set(periodProjects.map((project) => project.id));
  const periodEntries = financialEntries.filter((entry) => dateInFinanceRange(entry.received_on));
  const totalContracted = periodProjects.reduce((sum, project) => sum + Number(project.contract_value || 0), 0);
  const totalReceived = periodEntries.filter((entry) => entry.entry_type === "income" && Boolean(entry.project_id)).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const totalExpenses = periodEntries.filter((entry) => entry.entry_type === "expense").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const standaloneIncome = periodEntries.filter((entry) => entry.entry_type === "income" && !entry.project_id).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const periodBalance = periodProjects.reduce((sum, project) => sum + Math.max(0, Number(project.balance_due || 0)), 0);
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
        <header className="topbar"><button className="mobile-menu" onClick={() => setSidebarOpen((value) => !value)}>☰</button><div><p className="eyebrow">CAMILLА STUDIO</p><h1>{menuItems.find((item) => item.key === activeView)?.label}</h1><p>Gestão clara para projetos bem conduzidos.</p></div>{activeView === "finance" ? <div className="topbar-actions"><button onClick={() => setGlobalFinanceForm("income")}>＋ Lançar receita</button><button className="primary" onClick={() => setGlobalFinanceForm("expense")}>− Lançar despesa</button></div> : activeView === "agenda" ? <button className="primary" onClick={() => setAgendaFormOpen((value) => !value)}>＋ Novo compromisso</button> : <button className="primary" onClick={() => setModalOpen(true)}>＋ Novo projeto</button>}</header>
        {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
        {error && <div className="error-banner">{error}<button onClick={() => setError("")}>×</button></div>}

        {activeView === "dashboard" && <>
          <section className="metrics-grid">
            <article><span>▦</span><div><small>Projetos ativos</small><strong>{activeProjects.length}</strong><em>{projects.length} cadastrados</em></div></article>
            <article><span>!</span><div><small>Prazos em atraso</small><strong>{overdueProjects.length}</strong><em>Precisam de atenção</em></div></article>
            <article><span>◷</span><div><small>Próximas entregas</small><strong>{upcoming.length}</strong><em>Agenda consolidada</em></div></article>
            <article><span>R$</span><div><small>Saldo a receber</small><strong>{money.format(Math.max(0, allTotalContracted - allTotalReceived))}</strong><em>{money.format(allTotalReceived)} recebido</em></div></article>
          </section>
          <section className="dashboard-grid">
            <article className="panel wide"><div className="panel-head"><div><p className="eyebrow">VISÃO GERAL</p><h2>Projetos por etapa</h2></div><button onClick={() => setActiveView("projects")}>Ver Kanban</button></div><div className="stage-summary">{stages.filter((stage) => stage !== "completed").map((stage) => { const count = projects.filter((project) => project.stage === stage).length; return <div key={stage}><span>{stageLabels[stage]}</span><b>{count}</b><i><em style={{ width: `${projects.length ? Math.max(4, count / projects.length * 100) : 0}%` }} /></i></div>; })}</div></article>
            <article className="panel"><div className="panel-head"><div><p className="eyebrow">AGENDA</p><h2>Próximos prazos</h2></div></div><div className="agenda-list">{upcoming.map((item) => <button key={`${item.project.id}-${item.date}-${item.label}`} onClick={() => setSelectedProject(item.project)}><time>{shortDate.format(new Date(`${item.date}T12:00:00`))}</time><div><b>{item.label}</b><span>{projectClient(item.project)} · {item.project.name}</span></div></button>)}{!upcoming.length && <p className="empty-state">Nenhum prazo futuro cadastrado.</p>}</div></article>
          </section>
        </>}

        {activeView === "projects" && <>
          <section className="project-toolbar"><label>⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, projeto ou código…" /></label><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as "all" | ProjectStage)}><option value="all">Todas as etapas</option>{kanbanStages.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select><span>{loading ? "Atualizando…" : `${filteredProjects.length} projetos`}</span></section>
          <div className="kanban-top-scroll" ref={topScrollRef} onScroll={(event) => synchronize(event.currentTarget, boardRef.current)} aria-label="Rolagem horizontal superior do Kanban"><div style={{ width: scrollWidth }} /></div>
          <section className="project-board" ref={boardRef} onScroll={(event) => synchronize(event.currentTarget, topScrollRef.current)}>{kanbanStages.map((stage) => <div className="project-column" key={stage} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData("text/plain"); const project = projects.find((item) => item.id === id); if (project) void moveProject(project, stage); }}><header><div><i /><b>{stageLabels[stage]}</b></div><span>{filteredProjects.filter((project) => project.stage === stage).length}</span></header><div className="project-lane">{filteredProjects.filter((project) => project.stage === stage).map((project) => <article className="project-card" key={project.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", project.id)} onClick={() => setSelectedProject(project)}><div className="card-top"><b>{project.code}</b><span data-priority={project.priority}>{priorityLabels[project.priority]}</span></div><h3>{project.name}</h3><p>{projectClient(project)}</p><div className="card-meta"><span>{project.project_type}</span><span data-overdue={deadlineLabel(project).includes("atrasado")}>{deadlineLabel(project)}</span></div><footer><i>{(project.responsible_name || "CA").slice(0, 2).toUpperCase()}</i><span>{statusLabels[project.status]}</span></footer></article>)}</div></div>)}</section>
        </>}

        {activeView === "completed" && <section className="completed-page">
          <div className="page-intro"><div><p className="eyebrow">ARQUIVO DE PROJETOS</p><h2>Projetos finalizados por cliente</h2><p>Os projetos permanecem vinculados ao cliente e continuam visíveis no Financeiro enquanto houver saldo pendente.</p></div><strong>{completedProjects.length} finalizado{completedProjects.length === 1 ? "" : "s"}</strong></div>
          <div className="completed-client-list">{Object.values(completedByClient).sort((a,b) => a.client.localeCompare(b.client)).map((group) => <details key={group.client} className="completed-client-group"><summary><div className="client-avatar">{group.client.split(/\s+/).slice(0,2).map((part) => part[0]).join("")}</div><div><b>{group.client}</b><span>{group.projects.length} projeto{group.projects.length === 1 ? "" : "s"} finalizado{group.projects.length === 1 ? "" : "s"}</span></div><i>⌄</i></summary><div className="completed-projects">{group.projects.map((project) => <button key={project.id} onClick={() => setSelectedProject(project)}><div><small>{project.code} · {project.project_type}</small><b>{project.name}</b><span>{project.main_deadline ? `Prazo: ${new Date(`${project.main_deadline}T12:00:00`).toLocaleDateString("pt-BR")}` : "Sem prazo registrado"}</span></div><div><strong>{money.format(project.contract_value)}</strong><em data-pending={project.balance_due > 0}>{project.balance_due > 0 ? `${money.format(project.balance_due)} pendente` : "Quitado"}</em></div></button>)}</div></details>)}{!completedProjects.length && <div className="empty-panel"><b>Nenhum projeto finalizado.</b><p>Use o botão “Finalizar projeto” dentro de um projeto quando o trabalho estiver concluído.</p></div>}</div>
        </section>}

        {activeView === "agenda" && <section className="agenda-page">
          <NotificationSettings user={user} compact />
          <section className="agenda-metrics"><article><small>Compromissos futuros</small><strong>{calendarEvents.filter((item) => new Date(item.starts_at).getTime() >= Date.now()).length}</strong><span>Reuniões, visitas e entregas</span></article><article><small>Hoje</small><strong>{calendarEvents.filter((item) => new Date(item.starts_at).toDateString() === new Date().toDateString()).length}</strong><span>Eventos do dia</span></article><article><small>Próximos 7 dias</small><strong>{calendarEvents.filter((item) => { const time = new Date(item.starts_at).getTime(); return time >= Date.now() && time <= Date.now() + 7 * 86400000; }).length}</strong><span>Planejamento semanal</span></article><article><small>Prazos de projetos</small><strong>{upcoming.length}</strong><span>Entregas planejadas</span></article></section>
          {agendaFormOpen && <article className="panel agenda-form-panel"><div className="panel-head"><div><p className="eyebrow">NOVO COMPROMISSO</p><h2>Adicionar à agenda</h2></div><button onClick={() => setAgendaFormOpen(false)}>Cancelar</button></div><form className="inline-module-form global-form" onSubmit={(event) => void addCalendarEvent(event, null)}><label>Projeto<select name="project_id"><option value="">Sem projeto vinculado</option>{projects.map((project) => <option key={project.id} value={project.id}>{projectClient(project)} — {project.name}</option>)}</select></label><label>Título<input name="title" required placeholder="Ex.: Visita técnica" /></label><label>Tipo<select name="event_type"><option value="meeting">Reunião</option><option value="briefing">Briefing</option><option value="survey">Medição</option><option value="site_visit">Visita técnica</option><option value="construction_visit">Visita de obra</option><option value="approval">Aprovação</option><option value="delivery">Entrega</option><option value="revision">Revisão</option><option value="personal">Compromisso geral</option></select></label><label>Data<input name="date" type="date" required /></label><label>Hora<input name="time" type="time" defaultValue="09:00" /></label><label className="wide">Local<input name="location" placeholder="Endereço ou link da reunião" /></label><label className="wide">Observações<textarea name="notes" rows={2} /></label><div className="wide form-submit"><button className="primary">Salvar compromisso</button></div></form></article>}
          <section className="agenda-layout"><article className="panel agenda-calendar"><div className="panel-head"><div><p className="eyebrow">PRÓXIMOS COMPROMISSOS</p><h2>Agenda operacional</h2></div></div><div className="agenda-event-list">{calendarEvents.filter((item) => new Date(item.starts_at).getTime() >= Date.now() - 86400000).slice(0,30).map((item) => { const project = item.project_id ? projects.find((value) => value.id === item.project_id) : null; return <article key={item.id} className={item.completed_at ? "calendar-event completed" : "calendar-event"}><time><b>{new Date(item.starts_at).getDate()}</b><span>{new Date(item.starts_at).toLocaleDateString("pt-BR", { month: "short" })}</span><em>{new Date(item.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</em></time><div className="event-copy"><small>{item.event_type.replaceAll("_", " ")}</small><h3>{item.title}</h3><p>{project ? `${projectClient(project)} · ${project.name}` : "Compromisso geral"}</p>{item.location && <span>⌖ {item.location}</span>}{item.completed_at && <span className="completed-label">✓ Concluído</span>}</div><div className="event-actions">{project && <button className="event-btn neutral" onClick={() => setSelectedProject(project)}>Abrir projeto</button>}<button className="event-btn edit" onClick={() => setEditingCalendarEvent(item)}>Editar</button><button className={item.completed_at ? "event-btn reopen" : "event-btn complete"} onClick={() => void toggleCalendarEventCompleted(item)}>{item.completed_at ? "Reabrir" : "Concluir"}</button><button className="event-btn danger" onClick={() => void removeCalendarEvent(item)}>Remover</button></div></article>})}{!calendarEvents.length && <p className="empty-state">Nenhum compromisso cadastrado.</p>}</div></article><article className="panel agenda-deadlines"><div className="panel-head"><div><p className="eyebrow">PRAZOS</p><h2>Entregas de projetos</h2></div></div><div className="timeline compact">{projects
  .filter((project) => project.stage !== "completed")
  .flatMap((project) => [
    { date: project.main_deadline, label: "PRAZO PRINCIPAL", key: "main" },
    { date: project.deadline_stage_1, label: "ENTREGA E1", key: "e1" },
    { date: project.deadline_stage_2, label: "ENTREGA E2", key: "e2" },
    { date: project.deadline_stage_3, label: "ENTREGA E3", key: "e3" },
  ].filter((item) => Boolean(item.date)).map((item) => ({ ...item, project, date: item.date as string })))
  .sort((a,b) => a.date.localeCompare(b.date))
  .slice(0,30)
  .map((item) => <article key={`${item.project.id}-${item.key}`}><time><b>{new Date(`${item.date}T12:00:00`).getDate()}</b><span>{new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" })}</span></time><div><small>{item.label}</small><h3>{item.project.name}</h3><p>{projectClient(item.project)}</p></div><button onClick={() => setSelectedProject(item.project)}>Abrir</button></article>)}</div></article></section>
        </section>}

        {activeView === "clients" && <section className="client-grid">{clients.map((client) => { const own = projects.filter((project) => project.client?.id === client.id || project.client_id === client.id); return <article key={client.id}><div className="client-avatar">{client.name.split(/\s+/).slice(0,2).map((part) => part[0]).join("")}</div><div><h3>{client.name}</h3><p>{client.email || "E-mail não informado"}</p><span>{own.length} projeto{own.length === 1 ? "" : "s"}</span></div></article>; })}</section>}

        {activeView === "finance" && <section className="finance-page">
          <section className="finance-period-panel"><div><p className="eyebrow">PERÍODO FINANCEIRO</p><h2>Resumo por competência</h2><span>O mês atual é selecionado automaticamente. Ajuste as datas para consultar outro período.</span></div><label>De<input type="date" value={financeStart} onChange={(event) => setFinanceStart(event.target.value)} /></label><label>Até<input type="date" value={financeEnd} min={financeStart} onChange={(event) => setFinanceEnd(event.target.value)} /></label><button type="button" onClick={() => { const range = monthRange(); setFinanceStart(range.start); setFinanceEnd(range.end); }}>Mês atual</button></section><section className="finance-metrics"><article><small>Contratos do período</small><strong>{money.format(totalContracted)}</strong><span>{periodProjects.length} projeto{periodProjects.length === 1 ? "" : "s"} cadastrado{periodProjects.length === 1 ? "" : "s"}</span></article><article><small>Recebido no período</small><strong>{money.format(totalReceived)}</strong><span>Recebimentos vinculados a projetos</span></article><article><small>Saldo dos contratos</small><strong>{money.format(periodBalance)}</strong><span>Pendente nos projetos cadastrados no período</span></article><article><small>Despesas do período</small><strong>{money.format(totalExpenses)}</strong><span>Custos gerais e por projeto</span></article><article><small>Receitas avulsas</small><strong>{money.format(standaloneIncome)}</strong><span>Sem projeto vinculado</span></article></section>
          {globalFinanceForm && <article className="panel finance-launch-panel"><div className="panel-head"><div><p className="eyebrow">NOVO LANÇAMENTO</p><h2>{globalFinanceForm === "income" ? "Lançar receita" : "Lançar despesa"}</h2></div><button onClick={() => setGlobalFinanceForm(null)}>Cancelar</button></div><form className="inline-module-form global-form" onSubmit={(event) => void addFinancialEntry(event, null)}><input type="hidden" name="entry_type" value={globalFinanceForm} /><label>Projeto<select name="project_id"><option value="">Lançamento avulso, sem projeto</option>{projects.map((project) => <option key={project.id} value={project.id}>{projectClient(project)} — {project.name}</option>)}</select></label><label>Descrição<input name="description" required placeholder={globalFinanceForm === "income" ? "Ex.: Consultoria avulsa" : "Ex.: Impressão de pranchas"} /></label><label>Categoria<select name="category">{globalFinanceForm === "income" ? <><option value="payment">Recebimento</option><option value="installment">Parcela</option><option value="consulting">Consultoria</option><option value="other_income">Outra receita</option></> : <><option value="printing">Impressão</option><option value="travel">Deslocamento</option><option value="supplier">Fornecedor</option><option value="taxes">Taxas</option><option value="operational">Operacional</option><option value="other_expense">Outra despesa</option></>}</select></label><label>Valor<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Data<input name="received_on" type="date" required defaultValue={new Date().toISOString().slice(0,10)} /></label><label>Forma<select name="payment_method"><option value="pix">PIX</option><option value="transfer">Transferência</option><option value="cash">Dinheiro</option><option value="card">Cartão</option><option value="boleto">Boleto</option><option value="other">Outro</option></select></label><label className="wide">Observações<textarea name="notes" rows={2} /></label><div className="wide form-submit"><button className="primary">Salvar {globalFinanceForm === "income" ? "receita" : "despesa"}</button></div></form></article>}
          <section className="finance-layout"><article className="panel finance-projects"><div className="panel-head"><div><p className="eyebrow">CONTAS A RECEBER</p><h2>Contratos por projeto</h2></div></div><div className="finance-project-list">{projects.filter((project) => project.contract_value > 0).sort((a,b) => b.balance_due - a.balance_due).map((project) => <button key={project.id} onClick={() => { setSelectedProject(project); setDetailTab("finance"); }}><div><b>{projectClient(project)}</b><span>{project.name}{project.stage === "completed" || project.status === "completed" ? " · Finalizado" : ""}</span></div><strong>{money.format(project.contract_value)}</strong><span>{money.format(project.amount_received)} recebido</span><em data-pending={project.balance_due > 0}>{money.format(project.balance_due)} pendente</em></button>)}</div></article><article className="panel finance-transactions"><div className="panel-head"><div><p className="eyebrow">MOVIMENTAÇÕES</p><h2>Receitas e despesas</h2></div></div><div className="transaction-list">{periodEntries.slice(0,50).map((entry) => { const project = entry.project_id ? projects.find((item) => item.id === entry.project_id) : null; return <article key={entry.id} data-type={entry.entry_type}><i>{entry.entry_type === "income" ? "+" : "−"}</i><div><b>{entry.description}</b><span>{project ? `${projectClient(project)} · ${project.name}` : "Lançamento avulso"}</span><small>{new Date(`${entry.received_on}T12:00:00`).toLocaleDateString("pt-BR")} · {entry.category.replaceAll("_", " ")}</small></div><strong>{entry.entry_type === "income" ? "+" : "−"} {money.format(Number(entry.amount))}</strong></article>})}{!periodEntries.length && <p className="empty-state">Nenhum lançamento financeiro neste período.</p>}</div></article></section>
        </section>}

        {activeView === "settings" && <div className="view-stack"><section className="settings-grid"><article><span>◆</span><div><small>BANCO DE DADOS</small><b>{isSupabaseConfigured ? "Supabase conectado" : "Aguardando configuração"}</b><p>Dados estruturados no Supabase; documentos técnicos permanecem no Google Drive.</p></div></article><article><span>▣</span><div><small>PROJETOS IMPORTADOS</small><b>{projects.length} registros</b><p>A base inicial pode ser carregada pelo arquivo SQL incluído.</p></div></article><article><span>↗</span><div><small>ARQUIVOS TÉCNICOS</small><b>Google Drive por links</b><p>PDF, DWG, renders, contratos e fotos sem duplicar arquivos.</p></div></article></section><NotificationSettings user={user} /></div>}
      </main>

      {editingCalendarEvent && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingCalendarEvent(null); }}><form className="studio-modal agenda-edit-modal" onSubmit={(event) => void updateCalendarEvent(event)}><button type="button" className="modal-close" onClick={() => setEditingCalendarEvent(null)}>×</button><p className="eyebrow">EDITAR COMPROMISSO</p><h2>{editingCalendarEvent.title}</h2><div className="form-grid"><label>Projeto<select name="project_id" defaultValue={editingCalendarEvent.project_id || ""}><option value="">Sem projeto vinculado</option>{projects.map((project) => <option key={project.id} value={project.id}>{projectClient(project)} — {project.name}</option>)}</select></label><label>Título<input name="title" required defaultValue={editingCalendarEvent.title} /></label><label>Tipo<select name="event_type" defaultValue={editingCalendarEvent.event_type}><option value="meeting">Reunião</option><option value="briefing">Briefing</option><option value="survey">Medição</option><option value="site_visit">Visita técnica</option><option value="construction_visit">Visita de obra</option><option value="approval">Aprovação</option><option value="delivery">Entrega</option><option value="revision">Revisão</option><option value="personal">Compromisso geral</option></select></label><label>Data<input name="date" type="date" required defaultValue={editingCalendarEvent.starts_at.slice(0,10)} /></label><label>Hora<input name="time" type="time" defaultValue={new Date(editingCalendarEvent.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false })} /></label><label className="wide">Local<input name="location" defaultValue={editingCalendarEvent.location || ""} /></label><label className="wide">Observações<textarea name="notes" rows={3} defaultValue={editingCalendarEvent.notes || ""} /></label></div><div className="modal-actions"><button type="button" onClick={() => setEditingCalendarEvent(null)}>Cancelar</button><button type="button" className="danger" onClick={() => void removeCalendarEvent(editingCalendarEvent)}>Remover</button><button className="primary">Salvar alterações</button></div></form></div>}

      {modalOpen && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><form className="studio-modal" onSubmit={createProject}><button type="button" className="modal-close" onClick={() => setModalOpen(false)}>×</button><p className="eyebrow">NOVO CADASTRO</p><h2>Novo projeto</h2><div className="form-grid"><label>Código<input name="code" placeholder="ARQ-017" /></label><label>Cliente<input name="client_name" required placeholder="Nome do cliente" /></label><label className="wide">Nome do projeto<input name="name" required placeholder="Ex.: Residência Silva" /></label><label>Tipo<select name="project_type"><option>Arquitetura</option><option>Interiores</option><option>Arquitetura e Interiores</option><option>Regularização</option><option>Loteamento</option></select></label><label>Subtipo<input name="subtype" placeholder="Novo, reforma…" /></label><label>Etapa<select name="stage">{kanbanStages.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select></label><label>Status<select name="status"><option value="not_started">Não iniciado</option><option value="in_progress">Em andamento</option><option value="waiting">Em espera</option><option value="waiting_client">Aguardando cliente</option><option value="correction">Em correção</option></select></label><label>Prioridade<select name="priority"><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option><option value="low">Baixa</option></select></label><label>Responsável<select name="responsible_name" defaultValue="Camilla"><option value="">Não atribuído</option>{responsibleOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><label>Prazo principal<input name="deadline" type="date" /></label><label>Valor contratado<input name="contract_value" type="number" min="0" step="0.01" /></label><label>Valor recebido<input name="amount_received" type="number" min="0" step="0.01" /></label><label className="wide">Observações<textarea name="notes" rows={3} /></label></div><div className="modal-actions"><button type="button" onClick={() => setModalOpen(false)}>Cancelar</button><button className="primary">Criar projeto</button></div></form></div>}

      {selectedProject && projectDraft && <div className="overlay detail-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) void closeProjectDetails(); }}>
        <article className="project-detail">
          <button className="modal-close" onClick={() => void closeProjectDetails()}>×</button>
          <div className="detail-hero">
            <p className="eyebrow">{selectedProject.code} · {selectedProject.project_type}</p>
            <h2>{selectedProject.name}</h2>
            <p>{projectClient(selectedProject)}</p>
            <div><span>{stageLabels[projectDraft.stage]}</span><span>{statusLabels[projectDraft.status]}</span><span>{priorityLabels[selectedProject.priority]}</span></div>
            {selectedProject.stage !== "completed" && selectedProject.status !== "completed" && <button type="button" className="finalize-project-button" onClick={() => void finalizeProject()}>✓ Finalizar projeto</button>}
          </div>

          <nav className="detail-tabs" aria-label="Abas do projeto">
            <button className={detailTab === "overview" ? "active" : ""} onClick={() => setDetailTab("overview")}>Visão geral</button>
            <button className={detailTab === "checklist" ? "active" : ""} onClick={() => setDetailTab("checklist")}>Checklist <span>{projectChecklist.filter((item) => item.completed_at).length}/{projectChecklist.length}</span></button><button className={detailTab === "agenda" ? "active" : ""} onClick={() => setDetailTab("agenda")}>Agenda <span>{projectEvents.length}</span></button>
            <button className={detailTab === "finance" ? "active" : ""} onClick={() => setDetailTab("finance")}>Financeiro</button>
            <button className={detailTab === "files" ? "active" : ""} onClick={() => setDetailTab("files")}>Arquivos</button>
            <button className={detailTab === "comments" ? "active" : ""} onClick={() => setDetailTab("comments")}>Comentários <span>{projectComments.length}</span></button>
            <button className={detailTab === "history" ? "active" : ""} onClick={() => setDetailTab("history")}>Histórico</button>
          </nav>
          {projectDraftHasChanges() && <div className="unsaved-project-banner">Alterações pendentes — serão confirmadas ao fechar o projeto.</div>}

          {detailTab === "overview" && <>
            <section className="project-quick-controls">
              <label>Etapa<select value={projectDraft.stage} onChange={(event) => updateProjectDraft("stage", event.target.value)}>{projectDraft.stage === "completed" && <option value="completed">Finalizado</option>}{kanbanStages.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select></label>
              <label>Status<select value={projectDraft.status} onChange={(event) => updateProjectDraft("status", event.target.value)}>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Responsável<select value={projectDraft.responsible_name || ""} onChange={(event) => updateProjectDraft("responsible_name", event.target.value)}><option value="">Não atribuído</option>{responsibleOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
            </section>
            <section className="detail-stats editable-stats">
              <label><small>Prazo principal</small><div className="date-edit-row"><input type="date" value={projectDraft.main_deadline || ""} onChange={(event) => updateProjectDraft("main_deadline", event.target.value)} /><button type="button" className="clear-date-button" disabled={!projectDraft.main_deadline} onClick={() => updateProjectDraft("main_deadline", "")}>Limpar</button></div><em>{projectDraft.main_deadline ? "Data prevista cadastrada" : "Sem data prevista"}</em></label>
              <label><small>Contrato</small><input type="number" min="0" step="0.01" value={projectDraft.contract_value} onChange={(event) => updateProjectDraft("contract_value", event.target.value)} /></label>
              <div className="readonly-stat"><small>Saldo</small><b>{money.format(selectedProject.balance_due)}</b><em>Calculado pelos lançamentos financeiros</em></div>
            </section>
            <section className="detail-section"><h3>Entregas planejadas</h3><div className="delivery-steps editable-deliveries">{(["deadline_stage_1", "deadline_stage_2", "deadline_stage_3"] as const).map((field, index) => <label key={field} className={projectDraft[field] ? "filled" : ""}><i>{index + 1}</i><span><b>Etapa {index + 1}</b><div className="date-edit-row"><input type="date" value={projectDraft[field] || ""} onChange={(event) => updateProjectDraft(field, event.target.value)} /><button type="button" className="clear-date-button" disabled={!projectDraft[field]} onClick={() => updateProjectDraft(field, "")}>Limpar</button></div><small>{projectDraft[field] ? "Data prevista cadastrada" : "Sem data prevista"}</small></span></label>)}</div></section>
            {selectedProject.notes && <section className="detail-section"><h3>Observações</h3><p>{selectedProject.notes}</p></section>}
          </>}

          {detailTab === "checklist" && <section className="detail-section checklist-section">
            <div className="detail-section-head"><div><p className="eyebrow">CONTROLE POR ETAPA</p><h3>Checklist do projeto</h3></div><button type="button" onClick={() => void createChecklistFromTemplate(projectDraft?.stage || selectedProject.stage)}>＋ Criar checklist da etapa atual</button></div>
            <div className="checklist-progress"><div><b>{projectChecklist.filter((item) => item.completed_at).length} de {projectChecklist.length}</b><span>itens concluídos</span></div><i><em style={{ width: `${projectChecklist.length ? (projectChecklist.filter((item) => item.completed_at).length / projectChecklist.length) * 100 : 0}%` }} /></i></div>
            <form className="checklist-add-form" onSubmit={(event) => void addChecklistItem(event)}><label>Etapa<select name="stage" defaultValue={projectDraft?.stage || selectedProject.stage}>{kanbanStages.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select></label><label>Grupo<input name="section" placeholder="Ex.: Levantamento" /></label><label className="wide">Novo item<input name="title" required placeholder="Descreva uma verificação ou entrega" /></label><button className="primary" type="submit">Adicionar item</button></form>
            <div className="checklist-stage-groups">{kanbanStages.map((stage) => { const items = projectChecklist.filter((item) => item.stage === stage); if (!items.length) return null; const sections = [...new Set(items.map((item) => item.section))]; return <article key={stage} className="checklist-stage-card"><header><div><small>ETAPA</small><h4>{stageLabels[stage]}</h4></div><span>{items.filter((item) => item.completed_at).length}/{items.length}</span></header>{sections.map((section) => <section key={section}><b>{section}</b>{items.filter((item) => item.section === section).map((item) => <div key={item.id} className={item.completed_at ? "checklist-item completed" : "checklist-item"}><button type="button" className="check-toggle" onClick={() => void toggleChecklistItem(item)}>{item.completed_at ? "✓" : ""}</button><span>{item.title}</span><button type="button" className="check-remove" onClick={() => void removeChecklistItem(item)}>×</button></div>)}</section>)}</article>; })}{!projectChecklist.length && <div className="empty-panel"><b>Nenhum checklist criado.</b><p>Use o modelo da etapa atual ou adicione itens manualmente.</p></div>}</div>
          </section>}

          {detailTab === "agenda" && <section className="detail-section project-agenda-section">
            <div className="detail-section-head"><div><p className="eyebrow">AGENDA DO PROJETO</p><h3>Compromissos vinculados</h3></div></div>
            <form className="inline-module-form" onSubmit={(event) => void addCalendarEvent(event)}><label>Título<input name="title" required placeholder="Ex.: Reunião de aprovação" /></label><label>Tipo<select name="event_type"><option value="meeting">Reunião</option><option value="briefing">Briefing</option><option value="survey">Medição</option><option value="site_visit">Visita técnica</option><option value="construction_visit">Visita de obra</option><option value="approval">Aprovação</option><option value="delivery">Entrega</option><option value="revision">Revisão</option></select></label><label>Data<input name="date" type="date" required /></label><label>Hora<input name="time" type="time" defaultValue="09:00" /></label><label className="wide">Local<input name="location" placeholder="Endereço ou link da reunião" /></label><label className="wide">Observações<textarea name="notes" rows={2} /></label><div className="wide form-submit"><button className="primary">Adicionar à agenda</button></div></form>
            <div className="module-list project-agenda-list">{projectEvents.map((item) => <article key={item.id} className={item.completed_at ? "calendar-event completed" : "calendar-event"}><time>{new Date(item.starts_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</time><div className="event-copy"><b>{item.title}</b><span>{item.event_type.replaceAll("_", " ")}{item.location ? ` · ${item.location}` : ""}</span>{item.notes && <p>{item.notes}</p>}{item.completed_at && <span className="completed-label">✓ Concluído</span>}</div><div className="event-actions"><button type="button" className="event-btn edit" onClick={() => setEditingCalendarEvent(item)}>Editar</button><button type="button" className={item.completed_at ? "event-btn reopen" : "event-btn complete"} onClick={() => void toggleCalendarEventCompleted(item)}>{item.completed_at ? "Reabrir" : "Concluir"}</button><button type="button" className="event-btn danger" onClick={() => void removeCalendarEvent(item)}>Remover</button></div></article>)}{!projectEvents.length && <p className="empty-state">Nenhum compromisso vinculado a este projeto.</p>}</div>
          </section>}

          {detailTab === "finance" && <section className="detail-section project-finance-section">
            <div className="detail-section-head"><div><p className="eyebrow">FINANCEIRO DO PROJETO</p><h3>Receitas e despesas</h3></div></div>
            <section className="finance-summary-cards"><div><small>Contrato</small><b>{money.format(selectedProject.contract_value)}</b></div><div><small>Recebido</small><b>{money.format(selectedProject.amount_received)}</b></div><div><small>Saldo</small><b>{money.format(selectedProject.balance_due)}</b></div><div><small>Despesas</small><b>{money.format(projectFinancialEntries.filter((entry) => entry.entry_type === "expense").reduce((sum, entry) => sum + Number(entry.amount), 0))}</b></div></section>
            <form className="inline-module-form" onSubmit={(event) => void addFinancialEntry(event)}><label>Tipo<select name="entry_type"><option value="income">Receita / recebimento</option><option value="expense">Despesa</option></select></label><label>Descrição<input name="description" required placeholder="Ex.: Parcela 2/5 ou impressão" /></label><label>Categoria<select name="category"><option value="payment">Recebimento</option><option value="installment">Parcela</option><option value="printing">Impressão</option><option value="travel">Deslocamento</option><option value="supplier">Fornecedor</option><option value="taxes">Taxas</option><option value="operational">Operacional</option><option value="adjustment">Ajuste financeiro</option></select></label><label>Valor<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Data<input name="received_on" type="date" required defaultValue={new Date().toISOString().slice(0,10)} /></label><label>Forma de pagamento<select name="payment_method"><option value="pix">PIX</option><option value="transfer">Transferência</option><option value="cash">Dinheiro</option><option value="card">Cartão</option><option value="boleto">Boleto</option><option value="other">Outro</option></select></label><label className="wide">Observações<textarea name="notes" rows={2} /></label><div className="wide form-submit"><button className="primary">Salvar lançamento</button></div></form>
            <div className="module-list financial-entry-list">{projectFinancialEntries.map((item) => <article key={item.id} data-type={item.entry_type}><time>{new Date(`${item.received_on}T12:00:00`).toLocaleDateString("pt-BR")}</time><div><b>{item.description}</b><span>{item.entry_type === "income" ? "Receita" : "Despesa"} · {item.category.replaceAll("_", " ")}{item.payment_method ? ` · ${item.payment_method}` : ""}</span>{item.notes && <p>{item.notes}</p>}</div><strong>{item.entry_type === "income" ? "+" : "−"} {money.format(Number(item.amount))}</strong></article>)}{!projectFinancialEntries.length && <p className="empty-state">Nenhum lançamento neste projeto.</p>}</div>
          </section>}

          {detailTab === "files" && <section className="detail-section drive-section"><div className="detail-section-head"><div><p className="eyebrow">DOCUMENTOS TÉCNICOS</p><h3>Arquivos no Google Drive</h3></div><button type="button" onClick={() => setFileFormOpen((value) => !value)}>{fileFormOpen ? "Cancelar" : "＋ Adicionar link"}</button></div><p className="drive-help">O sistema guarda somente o link e os metadados. O arquivo original continua no Drive.</p>{fileFormOpen && <form className="drive-form" onSubmit={addDriveLink}><label>Nome do arquivo ou pasta<input name="name" required placeholder="Ex.: Projeto executivo — revisão 03" /></label><label>Categoria<select name="category" defaultValue="other"><option value="drive_folder">Pasta principal</option><option value="contract">Contrato</option><option value="briefing">Briefing</option><option value="survey">Levantamento</option><option value="drawing">Plantas / DWG</option><option value="executive">Projeto executivo</option><option value="render">Render</option><option value="photo">Fotos</option><option value="rrt">RRT</option><option value="memorial">Memorial</option><option value="other">Outro</option></select></label><label className="wide">Link do Google Drive<input name="drive_url" type="url" required placeholder="https://drive.google.com/..." /></label><label className="wide">Observações<textarea name="notes" rows={2} placeholder="Versão, conteúdo ou orientação de acesso" /></label><div className="wide drive-form-actions"><button type="submit" className="primary">Salvar link</button></div></form>}<div className="drive-list">{filesLoading && <p className="empty-state">Carregando links…</p>}{!filesLoading && projectFiles.map((file) => <article key={file.id}><span className="drive-file-icon">↗</span><div><b>{file.name}</b><small>{file.category.replaceAll("_", " ")}{file.notes ? ` · ${file.notes}` : ""}</small></div><a href={file.drive_url} target="_blank" rel="noreferrer">Abrir no Drive</a><button type="button" title="Remover link" onClick={() => void removeDriveLink(file)}>×</button></article>)}{!filesLoading && !projectFiles.length && <p className="empty-state">Nenhum link cadastrado para este projeto.</p>}</div></section>}

          {detailTab === "comments" && <section className="detail-section comments-section">
            <div className="detail-section-head"><div><p className="eyebrow">COMUNICAÇÃO INTERNA</p><h3>Comentários do projeto</h3></div></div>
            <form className="comment-form" onSubmit={addProjectComment}><textarea name="comment" rows={3} required placeholder="Registre uma observação, solicitação de ajuste ou retorno do cliente…" /><div><button className="primary" type="submit">Adicionar comentário</button></div></form>
            <div className="comment-list">{projectComments.map((item) => <article key={item.id}><div className="comment-avatar">CA</div><div><header><b>Equipe do projeto</b><time>{new Date(item.created_at).toLocaleString("pt-BR")}</time></header><p>{item.comment}</p></div></article>)}{!projectComments.length && <p className="empty-state">Nenhum comentário registrado neste projeto.</p>}</div>
          </section>}

          {detailTab === "history" && <section className="detail-section history-section">
            <div className="detail-section-head"><div><p className="eyebrow">RASTREABILIDADE</p><h3>Histórico do projeto</h3></div></div>
            <div className="history-list">{projectHistory.map((item) => <article key={item.id}><i /><div><b>{item.description}</b><time>{new Date(item.created_at).toLocaleString("pt-BR")}</time></div></article>)}{!projectHistory.length && <p className="empty-state">Nenhuma movimentação registrada.</p>}</div>
          </section>}
        </article>
      </div>}
    </div>
  );
}
