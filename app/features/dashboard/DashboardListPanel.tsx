import Link from "next/link";
import { dateTime } from "@/app/config/regions";
import type { DashboardListItem } from "./types";
export function DashboardListPanel({ title, items, emptyText }: { title: string; items: DashboardListItem[]; emptyText: string }) { return <article className="cs-card cs-dashboard-list-panel"><h2>{title}</h2>{items.length === 0 ? <p className="cs-empty-note">{emptyText}</p> : <ul>{items.map((item) => <li key={item.id}><div>{item.href ? <Link href={item.href}><strong>{item.title}</strong></Link> : <strong>{item.title}</strong>}<span>{item.subtitle}</span></div><small>{item.date ? dateTime(item.date) : item.meta || "—"}</small></li>)}</ul>}</article>; }
