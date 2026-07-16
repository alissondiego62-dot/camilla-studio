import { EmptyState } from "@/app/components/ui/DataState";
import { dateTime } from "@/app/config/regions";
import type { ProjectHistory } from "@/app/domain/architecture-types";

export function ProjectHistoryPanel({ history }: { history: ProjectHistory[] }) {
  return <section className="cs-project-panel"><div className="cs-section-heading"><div><h3>Histórico</h3><p>Alterações operacionais e administrativas registradas no projeto.</p></div></div>{history.length === 0 ? <EmptyState title="Nenhum registro" description="As alterações do projeto aparecerão aqui." /> : <ol className="cs-history-list">{history.map((item) => <li key={item.id}><span>{dateTime(item.created_at)}</span><div><strong>{item.description}</strong><small>{item.action_type}{item.field_name ? ` · ${item.field_name}` : ""}</small></div></li>)}</ol>}</section>;
}
