import type { ProjectPriority, ProjectStage, ProjectStatus, ViewKey } from "./architecture-types";

export const stageLabels: Record<ProjectStage, string> = {
  prospecting: "Prospecção",
  briefing: "Briefing",
  survey: "Levantamento",
  creation: "Criação",
  adjustments: "Ajustes",
  executive: "Executivo",
  approval: "Aprovação",
  construction: "Obra",
  completed: "Finalizado",
};

export const statusLabels: Record<ProjectStatus, string> = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  waiting: "Em espera",
  waiting_client: "Aguardando cliente",
  correction: "Em correção",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const priorityLabels: Record<ProjectPriority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export const stages = Object.keys(stageLabels) as ProjectStage[];

export const menuItems: Array<{ key: ViewKey; icon: string; label: string }> = [
  { key: "dashboard", icon: "⌂", label: "Dashboard" },
  { key: "projects", icon: "▦", label: "Projetos" },
  { key: "agenda", icon: "◷", label: "Agenda" },
  { key: "clients", icon: "◉", label: "Clientes" },
  { key: "finance", icon: "R$", label: "Financeiro" },
  { key: "settings", icon: "⚙", label: "Configurações" },
];
