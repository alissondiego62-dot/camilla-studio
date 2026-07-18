"use client";

import { useCallback, useMemo, useState } from "react";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
import { Button } from "@/app/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/app/components/ui/DataState";
import { dateTime } from "@/app/config/regions";
import { useModuleData } from "@/app/hooks/useModuleData";
import { listHistory } from "./history.service";
import type { HistoryEntry } from "./types";

function readable(value: unknown) { if (value === null || value === undefined || value === "") return "Não informado"; if (typeof value === "string") return value; try { return JSON.stringify(value); } catch { return String(value); } }

export function HistoryPage() {
  const [module, setModule] = useState(""); const [query, setQuery] = useState(""); const [limit, setLimit] = useState(100);
  const loader = useCallback(() => listHistory({ module, query, limit }), [module, query, limit]);
  const { data, loading, error, reload } = useModuleData<HistoryEntry[]>(loader, []);
  const modules = useMemo(() => [...new Set(data.map((entry) => entry.module))], [data]);
  return <ModuleFrame title="Histórico" subtitle="Registro central, imutável e legível das alterações do sistema">
    <div className="cs-toolbar"><label className="cs-sr-only" htmlFor="history-search">Pesquisar histórico</label><input id="history-search" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(100); }} placeholder="Pesquisar descrição…" /><label className="cs-sr-only" htmlFor="history-module">Filtrar módulo</label><select id="history-module" value={module} onChange={(e) => { setModule(e.target.value); setLimit(100); }}><option value="">Todos os módulos</option>{modules.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
    {error ? <ErrorState message={error} onRetry={() => void reload()} /> : loading ? <LoadingState /> : data.length === 0 ? <EmptyState title="Nenhum registro" description="O histórico central aparecerá aqui após a aplicação do SQL." /> : <div className="cs-central-history">{data.map((entry) => <article key={entry.id}><div className="cs-history-marker" aria-hidden="true" /><div><header><span className="cs-badge">{entry.module}</span><strong>{entry.description}</strong></header><p><b>Autor:</b> {entry.actor?.name || entry.actor?.email || "Sistema"} · <time>{dateTime(entry.created_at)}</time></p>{entry.field_name && <dl><div><dt>Campo</dt><dd>{entry.field_name}</dd></div><div><dt>Anterior</dt><dd>{readable(entry.old_value)}</dd></div><div><dt>Novo</dt><dd>{readable(entry.new_value)}</dd></div></dl>}</div></article>)}</div>}
    {!loading && !error && data.length >= limit && <div className="cs-pagination"><span>Exibindo {data.length} registros</span><Button type="button" onClick={() => setLimit((value) => value + 100)}>Carregar mais</Button></div>}
  </ModuleFrame>;
}
