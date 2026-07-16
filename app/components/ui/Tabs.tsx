"use client";

type Tab = { id: string; label: string; count?: number };

export function Tabs({ tabs, active, onChange, label = "Seções" }: { tabs: Tab[]; active: string; onChange: (id: string) => void; label?: string }) {
  return (
    <div className="cs-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={active === tab.id ? "active" : ""}
          onClick={() => onChange(tab.id)}
        >
          <span>{tab.label}</span>
          {typeof tab.count === "number" && <b>{tab.count}</b>}
        </button>
      ))}
    </div>
  );
}
