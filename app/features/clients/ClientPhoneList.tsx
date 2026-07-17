import type { ClientPhone } from "./types";
export function ClientPhoneList({items}:{items:ClientPhone[]}){return <ul className="cs-clean-list">{items.map(item=><li key={item.id??item.phone}>{item.label}: {item.phone}</li>)}</ul>}
