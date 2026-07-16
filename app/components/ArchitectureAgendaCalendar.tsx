"use client";
import { useMemo, useState } from "react";
import type { CalendarEvent, Project } from "../domain/architecture-types";

export function ArchitectureAgendaCalendar({ events, projects, onSelect }: { events: CalendarEvent[]; projects: Project[]; onSelect?: (event: CalendarEvent) => void }) {
  const [cursor, setCursor] = useState(() => new Date());
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const cells = useMemo(() => {
    const first = new Date(year, month, 1); const start = new Date(year, month, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  }, [year, month]);
  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return <article className="panel month-calendar-panel">
    <header className="month-calendar-head"><div><p className="eyebrow">CALENDÁRIO</p><h2>{monthLabel}</h2></div><div><button onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</button><button onClick={() => setCursor(new Date())}>Hoje</button><button onClick={() => setCursor(new Date(year, month + 1, 1))}>›</button></div></header>
    <div className="calendar-weekdays">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <b key={day}>{day}</b>)}</div>
    <div className="calendar-month-grid">{cells.map((day) => {
      const key = day.toISOString().slice(0, 10); const dayEvents = events.filter((item) => item.starts_at.slice(0,10) === key);
      return <div key={key} className={day.getMonth() === month ? "calendar-day" : "calendar-day muted"}>
        <span>{day.getDate()}</span>
        {dayEvents.slice(0,3).map((item) => { const project = projects.find((value) => value.id === item.project_id); return <button key={item.id} onClick={() => onSelect?.(item)} title={item.title}><i>{new Date(item.starts_at).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"})}</i>{item.title}<small>{project?.code || "Geral"}</small></button>; })}
        {dayEvents.length > 3 && <em>+{dayEvents.length - 3}</em>}
      </div>;
    })}</div>
  </article>;
}
