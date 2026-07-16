"use client";

import { useCallback, useMemo, useState } from "react";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
import { Button } from "@/app/components/ui/Button";
import { ErrorState, LoadingState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { useModuleData } from "@/app/hooks/useModuleData";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { usePermissions } from "@/app/hooks/usePermissions";
import { loadNotificationPreferences, loadProfileNotificationConfiguration, saveNotificationPreferences, saveProfileNotificationRules } from "@/app/features/notifications/notifications.service";
import type { NotificationCatalogItem, NotificationPreference, NotificationProfileRule, NotificationTypeRule } from "@/app/features/notifications/types";

function RuleEditor({ rules, setRules }: { rules: NotificationTypeRule[]; setRules: (rules: NotificationTypeRule[]) => void }) {
  return <div className="cs-notification-rule-list">{rules.map((rule, index) => <article key={rule.type_code}><div><strong>{rule.label}</strong><span>{rule.module}</span></div><label><input type="checkbox" checked={rule.enabled} onChange={(e) => setRules(rules.map((item, i) => i === index ? { ...item, enabled: e.target.checked } : item))} /> Ativa</label><label><input type="checkbox" checked={rule.in_app} onChange={(e) => setRules(rules.map((item, i) => i === index ? { ...item, in_app: e.target.checked } : item))} /> No sistema</label><label><input type="checkbox" checked={rule.push} onChange={(e) => setRules(rules.map((item, i) => i === index ? { ...item, push: e.target.checked } : item))} /> Push</label><input aria-label={`Antecedência de ${rule.label}`} type="number" min={0} max={10080} value={rule.lead_minutes ?? 0} onChange={(e) => setRules(rules.map((item, i) => i === index ? { ...item, lead_minutes: Number(e.target.value) } : item))} /></article>)}</div>;
}

function NotificationSettingsForm({ initial, onReload }: { initial: { preference: NotificationPreference | null; rules: NotificationTypeRule[] }; onReload: () => Promise<void> }) {
  const action = useAsyncAction(); const [rules, setRules] = useState(initial.rules); const [summary, setSummary] = useState(initial.preference?.daily_summary_enabled ?? true); const [summaryTime, setSummaryTime] = useState((initial.preference?.daily_summary_time ?? "08:00:00").slice(0, 5)); const [reminder, setReminder] = useState(initial.preference?.event_reminder_enabled ?? true); const [minutes, setMinutes] = useState(initial.preference?.reminder_minutes ?? 60);
  async function save() { const result = await action.run(() => saveNotificationPreferences({ daily_summary_enabled: summary, daily_summary_time: `${summaryTime}:00`, event_reminder_enabled: reminder, reminder_minutes: minutes, timezone: "America/Boa_Vista" }, rules), "Preferências atualizadas."); if (result.ok) await onReload(); }
  return <><FeedbackMessage error={action.error} success={action.success} /><div className="cs-settings-actions"><Button variant="primary" loading={action.pending} onClick={() => void save()}>Salvar preferências</Button></div><section className="cs-card cs-notification-preference-summary"><h2>Resumo e lembretes</h2><div className="cs-form-grid"><label className="cs-check-option"><input type="checkbox" checked={summary} onChange={(e) => setSummary(e.target.checked)} /> Receber resumo diário</label><label><span>Horário do resumo</span><input type="time" value={summaryTime} onChange={(e) => setSummaryTime(e.target.value)} /></label><label className="cs-check-option"><input type="checkbox" checked={reminder} onChange={(e) => setReminder(e.target.checked)} /> Lembretes de agenda</label><label><span>Antecedência em minutos</span><input type="number" min={0} max={10080} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label></div></section><section className="cs-card"><h2>Minhas regras</h2><RuleEditor rules={rules} setRules={setRules} /></section></>;
}

function resolvedProfileRules(catalog: NotificationCatalogItem[], stored: NotificationProfileRule[], profileId: string): NotificationTypeRule[] {
  return catalog.map((item) => { const own = stored.find((rule) => rule.permission_profile_id === profileId && rule.type_code === item.type_code); return { type_code: item.type_code, label: item.label, module: item.module, enabled: own?.enabled ?? item.default_enabled, in_app: own?.in_app ?? item.default_in_app, push: own?.push ?? item.default_push, lead_minutes: own?.lead_minutes ?? item.default_lead_minutes }; });
}

function ProfileRulesManager({ configuration, onReload }: { configuration: Awaited<ReturnType<typeof loadProfileNotificationConfiguration>>; onReload: () => Promise<void> }) {
  const [profileId, setProfileId] = useState(configuration.profiles[0]?.id ?? "");
  const initialRules = useMemo(() => resolvedProfileRules(configuration.catalog, configuration.rules, profileId), [configuration, profileId]);
  const [rules, setRules] = useState<NotificationTypeRule[]>(initialRules);
  const action = useAsyncAction();
  function selectProfile(value: string) { setProfileId(value); setRules(resolvedProfileRules(configuration.catalog, configuration.rules, value)); }
  async function save() { if (!profileId) return; const result = await action.run(() => saveProfileNotificationRules(profileId, rules), "Regras do perfil atualizadas."); if (result.ok) await onReload(); }
  return <section className="cs-card"><div className="cs-section-heading"><div><h2>Regras por perfil</h2><p>Definem o padrão herdado; cada usuário ainda pode personalizar as próprias notificações.</p></div><Button variant="primary" loading={action.pending} disabled={!profileId} onClick={() => void save()}>Salvar perfil</Button></div><FeedbackMessage error={action.error} success={action.success} /><label><span>Perfil</span><select value={profileId} onChange={(e) => selectProfile(e.target.value)}>{configuration.profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name}</option>)}</select></label>{profileId && <RuleEditor rules={rules} setRules={setRules} />}</section>;
}

export function NotificationSettingsPage() {
  const { can } = usePermissions(); const canManageProfiles = can("settings", "manage_settings");
  const loader = useCallback(() => loadNotificationPreferences(), []); const { data, loading, error, reload } = useModuleData(loader, { preference: null, rules: [] });
  const profileLoader = useCallback(() => canManageProfiles ? loadProfileNotificationConfiguration() : Promise.resolve({ profiles: [], catalog: [], rules: [] }), [canManageProfiles]);
  const profileData = useModuleData(profileLoader, { profiles: [], catalog: [], rules: [] });
  return <ModuleFrame title="Notificações" subtitle="Preferências pessoais e padrões por perfil para alertas dentro do sistema e push">{error ? <ErrorState message={error} onRetry={() => void reload()} /> : loading ? <LoadingState /> : <NotificationSettingsForm key={`${data.preference?.user_id || "user"}:${data.rules.length}`} initial={data} onReload={reload} />}{canManageProfiles && (profileData.error ? <ErrorState title="Regras por perfil indisponíveis" message={profileData.error} onRetry={() => void profileData.reload()} /> : profileData.loading ? <LoadingState /> : <ProfileRulesManager key={`${profileData.data.profiles.length}:${profileData.data.rules.length}`} configuration={profileData.data} onReload={profileData.reload} />)}</ModuleFrame>;
}
