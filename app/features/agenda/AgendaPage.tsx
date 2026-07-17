"use client";
import { Suspense } from "react";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
import { LoadingState } from "@/app/components/ui/DataState";
import { AccessDenied } from "@/app/components/security/PermissionGate";
import { usePermissions } from "@/app/hooks/usePermissions";
import { AgendaWorkspace } from "./AgendaWorkspace";
export function AgendaPage(){const{can}=usePermissions();if(!can("agenda","view"))return <ModuleFrame title="Agenda"><AccessDenied/></ModuleFrame>;return <ModuleFrame title="Agenda" subtitle="Eventos, atividades, clientes e prazos sincronizados no horário de Boa Vista"><Suspense fallback={<LoadingState/>}><AgendaWorkspace/></Suspense></ModuleFrame>}
