import type { PermissionAction, PermissionModule } from "@/app/types/permissions";

export type PermissionCatalogItem = {
  module: PermissionModule;
  moduleLabel: string;
  action: PermissionAction;
  actionLabel: string;
  supportsScope?: boolean;
};

const modules: Array<[PermissionModule, string, PermissionAction[]]> = [
  ["dashboard", "Dashboard", ["view"]],
  ["projects", "Projetos", ["view", "create", "edit", "delete", "archive", "reactivate", "approve", "export", "change_status", "change_stage", "change_deadline"]],
  ["kanban", "Kanban", ["view", "change_status", "change_stage", "change_deadline"]],
  ["activities", "Atividades", ["view", "create", "edit", "delete", "change_status", "change_deadline"]],
  ["agenda", "Agenda", ["view", "create", "edit", "delete", "export"]],
  ["clients", "Clientes", ["view", "create", "edit", "delete", "archive", "reactivate", "export"]],
  ["files", "Arquivos", ["view", "add_file", "remove_file", "archive", "export", "download", "view_versions"]],
  ["reports", "Relatórios", ["view", "export", "view_values"]],
  ["finance_professional", "Financeiro profissional", ["view", "create", "edit", "archive", "view_values", "settle_finance", "cancel_entry", "export"]],
  ["finance_personal", "Financeiro pessoal", ["view", "create", "edit", "archive", "view_values", "settle_finance", "cancel_entry", "export"]],
  ["users", "Usuários", ["view", "create", "edit", "archive", "reactivate", "manage_users"]],
  ["teams", "Equipes", ["view", "create", "edit", "archive", "reactivate", "manage_users"]],
  ["settings", "Configurações", ["view", "manage_settings"]],
  ["checklists", "Checklists", ["view", "create", "edit", "delete", "archive", "reactivate", "approve", "manage_settings"]],
  ["notifications", "Notificações", ["view", "edit", "manage_settings"]],
  ["history", "Histórico", ["view", "export"]],
  ["comments", "Comentários", ["view", "create", "edit", "delete", "view_internal", "create_internal"]],
  ["integrations", "Integrações", ["view", "edit", "manage_settings"]],
  ["versions", "Versões", ["view", "create", "manage_settings"]],
  ["security", "Segurança e auditoria", ["view", "export", "manage_settings"]],
];

const actionLabels: Record<PermissionAction, string> = {
  view: "Visualizar", create: "Criar", edit: "Editar", delete: "Excluir", archive: "Arquivar",
  reactivate: "Reativar", approve: "Aprovar", export: "Exportar", change_status: "Alterar status",
  change_stage: "Alterar etapa", change_deadline: "Alterar prazo", add_file: "Adicionar arquivo",
  remove_file: "Remover arquivo", view_values: "Visualizar valores", settle_finance: "Realizar baixa",
  cancel_entry: "Cancelar lançamento", manage_users: "Gerenciar usuários", manage_settings: "Gerenciar configurações",
  download: "Baixar", view_versions: "Visualizar versões", view_internal: "Visualizar observações internas", create_internal: "Criar observação interna",
};

const scopedActions = new Set<PermissionAction>(["view", "edit", "delete", "archive", "reactivate", "approve", "export", "change_status", "change_stage", "change_deadline", "add_file", "remove_file", "download", "view_versions", "view_internal", "create_internal"]);

export const permissionCatalog: PermissionCatalogItem[] = modules.flatMap(([module, moduleLabel, actions]) =>
  actions.map((action) => ({ module, moduleLabel, action, actionLabel: actionLabels[action], supportsScope: scopedActions.has(action) })),
);
