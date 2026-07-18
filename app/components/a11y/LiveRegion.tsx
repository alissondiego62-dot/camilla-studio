export function LiveRegion({ message, assertive = false }: { message?: string; assertive?: boolean }) {
  return <div className="cs-sr-only" role={assertive ? "alert" : "status"} aria-live={assertive ? "assertive" : "polite"} aria-atomic="true">{message || ""}</div>;
}
