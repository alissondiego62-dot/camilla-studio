"use client";

import { Tabs } from "@/app/components/ui/Tabs";

export type ProjectSection = "overview" | "dates" | "activities" | "agenda" | "files" | "comments" | "checklist" | "history" | "finance";

export function ProjectNavigation({ active, onChange, counts, showFinance }: { active: ProjectSection; onChange: (section: ProjectSection) => void; counts: Record<string, number>; showFinance: boolean }) {
  const tabs = [
    { id: "overview", label: "Visão geral" },
    { id: "dates", label: "Prazos", count: counts.dates },
    { id: "activities", label: "Atividades", count: counts.activities },
    { id: "agenda", label: "Agenda", count: counts.agenda },
    { id: "files", label: "Arquivos", count: counts.files },
    { id: "comments", label: "Comentários", count: counts.comments },
    { id: "checklist", label: "Checklist", count: counts.checklist },
    { id: "history", label: "Histórico", count: counts.history },
    ...(showFinance ? [{ id: "finance", label: "Financeiro", count: counts.finance }] : []),
  ];
  return <Tabs tabs={tabs} active={active} onChange={(id) => onChange(id as ProjectSection)} label="Áreas do projeto" />;
}
