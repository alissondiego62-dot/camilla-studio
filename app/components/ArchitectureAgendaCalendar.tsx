"use client";
import { useMemo, useState } from "react";
import type { CalendarEvent, Project } from "../domain/architecture-types";

export function ArchitectureAgendaCalendar({ events, projects, onSelect }: { events: CalendarEvent[]; projects: Project[]; onSelect?: (event: CalendarEvent) => void }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"month" | "list">("month");
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [projectFilter, setProjectFilter] = useState("all");
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  }, [year, month]);
  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const filteredEvents = useMemo(() => events.filter((event) => projectFilter === "all" || event.project_id === projectFilter), [events, projectFilter]);
  const selectedEvents = filteredEvents.filter((item) => item.starts_at.slice(0, 10) === selectedDay);
  const monthEvents = filteredEvents.filter((item) => { const date = new Date(item.starts_at); return date.getFullYear() === year && date.getMonth() === month; });

  return <section className="agenda-calendar-workspace publicolor-module">
    <div className="publicolor-toolbar agenda-toolbar">
      <div className="view-switch"><button className={viewMode === "month" ? "active" : ""} onClick={() => setViewMode("month")}>▦ Mês</button><button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}>☷ Lista</button></div>
      <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option value="all">Todos os projetos</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.code} — {project.name}</option>)}</select>
      <span>{monthEvents.length} compromisso{monthEvents.length === 1 ? "" : "s"} no mês</span>
    </div>

    {viewMode === "month" ? <div className="agenda-calendar-layout">
      <article className="panel month-calendar-panel">
        <header className="month-calendar-head"><div><p className="eyebrow">CALENDÁRIO</p><h2>{monthLabel}</h2></div><div><button onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</button><button onClick={() => { const now = new Date(); setCursor(now); setSelectedDay(now.toISOString().slice(0,10)); }}>Hoje</button><button onClick={() => setCursor(new Date(year, month + 1, 1))}>›</button></div></header>
        <div className="calendar-weekdays">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <b key={day}>{day}</b>)}</div>
        <div className="calendar-month-grid">{cells.map((day) => {
          const key = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}-${String(day.getDate()).padStart(2,"0")}`;
          const dayEvents = filteredEvents.filter((item) => item.starts_at.slice(0,10) === key);
          return <button type="button" key={key} onClick={() => setSelectedDay(key)} className={`${day.getMonth() === month ? "calendar-day" : "calendar-day muted"}${selectedDay === key ? " selected" : ""}${key === new Date().toISOString().slice(0,10) ? " today" : ""}`}>
            <span>{day.getDate()}</span>
            {dayEvents.slice(0,3).map((item) => { const project = projects.find((value) => value.id === item.project_id); return <i key={item.id} title={item.title}><time>{new Date(item.starts_at).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"})}</time><em>{item.title}</em><small>{project?.code || "Geral"}</small></i>; })}
            {dayEvents.length > 3 && <strong>+{dayEvents.length - 3}</strong>}
          </button>;
        })}</div>
      </article>
      <aside className="panel agenda-day-panel"><header><p className="eyebrow">DIA SELECIONADO</p><h2>{new Date(`${selectedDay}T12:00:00`).toLocaleDateString("pt-BR", {weekday:"long",day:"2-digit",month:"long"})}</h2><span>{selectedEvents.length} compromisso{selectedEvents.length === 1 ? "" : "s"}</span></header><div className="agenda-day-list">{selectedEvents.map((item) => { const project = projects.find((value) => value.id === item.project_id); return <button key={item.id} onClick={() => onSelect?.(item)} className={item.completed_at ? "completed" : ""}><time>{new Date(item.starts_at).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"})}</time><div><b>{item.title}</b><span>{project ? `${project.code} · ${project.name}` : "Compromisso geral"}</span><small>{item.location || item.event_type.replaceAll("_", " ")}</small></div><em>{item.completed_at ? "Concluído" : "Abrir"}</em></button>})}{!selectedEvents.length && <div className="empty-state">Nenhum compromisso neste dia.</div>}</div></aside>
    </div> : <article className="panel agenda-list-panel"><header><div><p className="eyebrow">AGENDA CONSOLIDADA</p><h2>{monthLabel}</h2></div><span>{monthEvents.length} itens</span></header><div>{monthEvents.sort((a,b) => a.starts_at.localeCompare(b.starts_at)).map((item) => { const project = projects.find((value) => value.id === item.project_id); return <button key={item.id} onClick={() => onSelect?.(item)} className={item.completed_at ? "completed" : ""}><time><b>{new Date(item.starts_at).toLocaleDateString("pt-BR", {day:"2-digit",month:"short"})}</b><span>{new Date(item.starts_at).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"})}</span></time><div><b>{item.title}</b><span>{project ? `${project.code} · ${project.name}` : "Compromisso geral"}</span><small>{item.location || item.event_type.replaceAll("_", " ")}</small></div><em>{item.completed_at ? "✓ Concluído" : "Abrir"}</em></button>})}</div></article>}
  </section>;
}
