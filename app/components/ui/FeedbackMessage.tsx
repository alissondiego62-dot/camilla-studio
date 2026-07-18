export function FeedbackMessage({ error, success }: { error?: string; success?: string }) {
  if (error) return <div className="cs-alert cs-alert-error" role="alert" aria-live="assertive" aria-atomic="true">{error}</div>;
  if (success) return <div className="cs-alert cs-alert-success" role="status" aria-live="polite" aria-atomic="true">{success}</div>;
  return null;
}
