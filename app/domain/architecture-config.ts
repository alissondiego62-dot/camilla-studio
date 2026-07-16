import type { ProjectPriority, ProjectStage, ProjectStatus, ViewKey } from "./architecture-types";

export const stageLabels: Record<ProjectStage, string> = {
  prospecting: "Prospecção",
  briefing: "Briefing",
  survey: "Levantamento",
  briefing_preliminary: "Estudo Preliminar",
  creation: "Criação",
  adjustments: "Ajustes",
  approval: "Aprovação",
  executive: "Executivo",
  revision: "Revisão",
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
  { key: "completed", icon: "✓", label: "Finalizados" },
  { key: "agenda", icon: "◷", label: "Agenda" },
  { key: "activities", icon: "☑", label: "Atividades" },
  { key: "clients", icon: "◉", label: "Clientes" },
  { key: "finance", icon: "R$", label: "Financeiro" },
  { key: "settings", icon: "⚙", label: "Configurações" },
];

export const responsibleOptions = [
  "Camilla",
  "Aldair",
  "Silvia",
] as const;


export const checklistTemplates: Record<string, Record<ProjectStage, Array<{ section: string; title: string }>>> = {
  default: {
    prospecting: [
      { section: "Prospecção", title: "Registrar origem do contato e necessidade inicial" },
      { section: "Prospecção", title: "Confirmar escopo e disponibilidade para atendimento" },
    ],
    briefing: [
      { section: "Briefing", title: "Realizar reunião inicial de levantamento" },
      { section: "Briefing", title: "Registrar programa de necessidades e referências" },
    ],
    survey: [
      { section: "Levantamento", title: "Realizar medição e registro fotográfico" },
      { section: "Levantamento", title: "Conferir documentos, restrições e condições do imóvel" },
    ],
    briefing_preliminary: [
      { section: "Prospecção", title: "Registrar origem do contato e necessidade inicial" },
      { section: "Prospecção", title: "Confirmar escopo e disponibilidade para atendimento" },
      { section: "Estudo Preliminar", title: "Realizar reunião inicial de levantamento" },
      { section: "Estudo Preliminar", title: "Registrar programa de necessidades e referências" },
      { section: "Levantamento", title: "Realizar medição e registro fotográfico" },
      { section: "Levantamento", title: "Conferir documentos, restrições e condições do imóvel" },
    ],
    creation: [
      { section: "Criação", title: "Desenvolver conceito e partido do projeto" },
      { section: "Criação", title: "Preparar layout inicial" },
      { section: "Criação", title: "Apresentar proposta inicial ao cliente" },
    ],
    adjustments: [
      { section: "Ajustes", title: "Consolidar solicitações do cliente" },
      { section: "Ajustes", title: "Atualizar desenhos e imagens" },
      { section: "Ajustes", title: "Confirmar aceite dos ajustes" },
    ],
    approval: [
      { section: "Aprovação", title: "Enviar material para aprovação" },
      { section: "Aprovação", title: "Registrar aprovação ou ressalvas do cliente" },
    ],
    executive: [
      { section: "Executivo", title: "Concluir plantas, cortes e fachadas" },
      { section: "Executivo", title: "Concluir detalhamentos e especificações" },
      { section: "Executivo", title: "Conferir compatibilização dos projetos" },
    ],
    revision: [
      { section: "Revisão", title: "Conferir revisão final dos arquivos" },
      { section: "Revisão", title: "Atualizar numeração e identificação da revisão" },
      { section: "Revisão", title: "Liberar documentação revisada" },
    ],
    construction: [
      { section: "Obra", title: "Registrar acompanhamento e pendências da execução" },
      { section: "Obra", title: "Atualizar registros fotográficos e decisões de campo" },
    ],
    completed: [],
  },
};

export function getChecklistTemplate(projectType: string, stage: ProjectStage) {
  const normalized = projectType.trim().toLowerCase();
  const typeKey = normalized.includes("interior") ? "interiores" : normalized.includes("arquitet") ? "arquitetura" : "default";
  return checklistTemplates[typeKey]?.[stage] || checklistTemplates.default[stage] || [];
}

checklistTemplates.arquitetura = { ...checklistTemplates.default, executive: [
  { section: "Executivo", title: "Concluir planta baixa, cortes e fachadas" },
  { section: "Executivo", title: "Concluir implantação e cobertura" },
  { section: "Executivo", title: "Compatibilizar estrutura e instalações complementares" },
  { section: "Executivo", title: "Conferir RRT, memorial e pranchas finais" },
] };
checklistTemplates.interiores = { ...checklistTemplates.default, executive: [
  { section: "Executivo", title: "Concluir layout e demolição/construção" },
  { section: "Executivo", title: "Concluir paginação, forro e iluminação" },
  { section: "Executivo", title: "Concluir marcenaria e detalhamentos" },
  { section: "Executivo", title: "Conferir especificação de materiais e acabamentos" },
] };
