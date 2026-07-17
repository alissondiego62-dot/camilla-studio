"use client";
import { useCallback } from "react";
import { LoadingState,ErrorState } from "@/app/components/ui/DataState";
import { useModuleData } from "@/app/hooks/useModuleData";
import { usePermissions } from "@/app/hooks/usePermissions";
import { DriveConnectionCard } from "./DriveConnectionCard";
import { DriveConnectionActions } from "./DriveConnectionActions";
import { getDriveStatus } from "./google-drive.service";
export function GoogleDriveSettings(){const{can}=usePermissions();const loader=useCallback(()=>getDriveStatus(),[]);const{data,loading,error,reload}=useModuleData(loader,null);if(error)return <ErrorState message={error} onRetry={()=>void reload()}/>;if(loading||!data)return <LoadingState/>;return <section className="cs-drive-settings-grid"><DriveConnectionCard status={data}/><DriveConnectionActions status={data} canManage={can("integrations","connect_drive")||can("integrations","manage_settings")} onChanged={reload}/><article className="cs-card"><h2>Regras de segurança</h2><ul className="cs-clean-list"><li>Tokens permanecem em estrutura privada e criptografada.</li><li>Compartilhamento público fica desativado por padrão.</li><li>O Drive não define acesso a projetos, clientes, atividades ou financeiro.</li><li>Metadados e vínculos permanecem no Supabase.</li></ul></article></section>}
