"use client";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
import { GoogleDriveSettings } from "@/app/features/google-drive/GoogleDriveSettings";
export function IntegrationsSettingsPage({driveOnly=false}:{driveOnly?:boolean}){return <ModuleFrame title={driveOnly?"Google Drive":"Integrações"} subtitle="Conexões externas com credenciais protegidas em Edge Functions"><GoogleDriveSettings/>{!driveOnly&&<section className="cs-card"><h2>Princípio das integrações</h2><p>O Supabase permanece como base principal. Serviços externos recebem somente os dados estritamente necessários para a operação autorizada.</p></section>}</ModuleFrame>}
