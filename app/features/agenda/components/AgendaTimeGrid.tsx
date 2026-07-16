"use client";
import { dateKey, durationMinutes, formatDay, minutesOfDay, todayKey } from "../agenda-date-utils";
import type { AgendaItem } from "../types";
import { AgendaAllDayLane } from "./AgendaAllDayLane";
import { AgendaItemCard } from "./AgendaItemCard";
import { AgendaNowIndicator } from "./AgendaNowIndicator";

const hours = Array.from({ length: 24 }, (_, index) => index);

export function AgendaTimeGrid({ days, items, snapMinutes, onEmptyClick, onOpen, onDrop, onResizeStart }: {
  days: string[];
  items: AgendaItem[];
  snapMinutes: number;
  onEmptyClick: (day: string, minutes: number) => void;
  onOpen: (item: AgendaItem) => void;
  onDrop: (itemKey: string, day: string, minutes: number, allDay: boolean) => void;
  onResizeStart: (item: AgendaItem, event: React.PointerEvent) => void;
}) {
  return (
    <div className="cs-agenda-time-shell">
      <div className="cs-agenda-day-head">
        <div />
        {days.map((day) => <div key={day} className={day === todayKey() ? "is-today" : ""}><strong>{formatDay(day)}</strong></div>)}
      </div>
      <AgendaAllDayLane days={days} items={items} onOpen={onOpen} onDrop={(key, day) => onDrop(key, day, 0, true)} />
      <div className="cs-agenda-time-grid">
        <div className="cs-agenda-hour-labels">
          {hours.map((hour) => <div key={hour} style={{ top: `${hour / 24 * 100}%` }}>{String(hour).padStart(2, "0")}:00</div>)}
        </div>
        {days.map((day) => (
          <div key={day} className={`cs-agenda-day-column ${day === todayKey() ? "is-today" : ""}`}>
            {Array.from({ length: Math.ceil(1440 / snapMinutes) }, (_, index) => {
              const minutes = index * snapMinutes;
              const label = `${Math.floor(minutes / 60).toString().padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
              return (
                <button
                  key={index}
                  type="button"
                  className="cs-agenda-time-slot"
                  style={{ top: `${minutes / 1440 * 100}%`, height: `${snapMinutes / 1440 * 100}%` }}
                  aria-label={`Criar em ${day} às ${label}`}
                  onClick={() => onEmptyClick(day, minutes)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const key = event.dataTransfer.getData("text/agenda-key");
                    if (key) onDrop(key, day, minutes, false);
                  }}
                />
              );
            })}
            <AgendaNowIndicator day={day} />
            {items.filter((item) => !item.all_day && dateKey(item.starts_at) === day).map((item) => {
              const top = minutesOfDay(item.starts_at) / 1440 * 100;
              const height = Math.max(1.5, durationMinutes(item) / 1440 * 100);
              return <AgendaItemCard key={item.item_key} item={item} style={{ top: `${top}%`, height: `${height}%` }} onOpen={onOpen} onResizeStart={onResizeStart} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
