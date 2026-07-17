"use client";
import { FinanceCatalogManager } from "./FinanceCatalogManager";
import { FinanceRecurringRules } from "./FinanceRecurringRules";
import type { FinanceStoredEnvironment, FinanceWorkspaceOptions } from "../types";
export function FinanceTemplatesWorkspace({environment,options,canManageTemplates,canManageRecurrence,onReload}:{environment:FinanceStoredEnvironment;options:FinanceWorkspaceOptions;canManageTemplates:boolean;canManageRecurrence:boolean;onReload:()=>void}){return <div className="cs-finance-auxiliary"><FinanceCatalogManager title="Modelos" description="Modelos separados por ambiente e independentes dos lançamentos antigos." table="financial_templates" items={options.templates} environment={environment} canManage={canManageTemplates} onReload={onReload}/><FinanceRecurringRules environment={environment} items={options.recurring_rules} options={options} canManage={canManageRecurrence} onReload={onReload}/></div>}
