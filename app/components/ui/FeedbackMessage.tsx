export function FeedbackMessage({ error, success }: { error?: string; success?: string }) {
  if (error) return <div className="cs-alert cs-alert-error" role="alert">{error}</div>;
  if (success) return <div className="cs-alert cs-alert-success" role="status">{success}</div>;
  return null;
}
