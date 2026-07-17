import type { ClientEmail } from "./types";
export function ClientEmailList({items}:{items:ClientEmail[]}){return <ul className="cs-clean-list">{items.map(item=><li key={item.id??item.email}>{item.label}: {item.email}</li>)}</ul>}
