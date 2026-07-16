export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const normalized = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="cs-progress" aria-label={label ?? `Progresso: ${normalized}%`}>
      <div><span style={{ width: `${normalized}%` }} /></div>
      <b>{normalized}%</b>
    </div>
  );
}
