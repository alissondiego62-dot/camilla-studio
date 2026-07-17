import type { PermissionAction, PermissionModule } from "@/app/types/permissions";

export type PermissionCatalogItem = {
  module: PermissionModule;
  moduleLabel: string;
  action: PermissionAction;
  actionLabel: string;
  supportsScope?: boolean;
};

const modules: Array<[PermissionModule, string, PermissionAction[]]> = [
  ["dashboard", "Dashboard", ["view", "view_team", "view_financial"]],
  ["projects", "Projetos", ["view", "create", "edit", "delete", "archive", "reactivate", "approve", "export", "change_status", "change_stage", "change_deadline"]],
  ["kanban", "Kanban", ["view", "change_status", "change_stage", "change_deadline"]],
  ["activities", "Atividades", ["view", "create", "edit", "delete", "archive", "reactivate", "change_status", "change_deadline"]],
  ["agenda", "Agenda", ["view", "create", "edit", "delete", "export"]],
  ["clients", "Clientes", ["view", "create", "edit", "delete", "archive", "reactivate", "export", "view_financial", "manage_notes", "manage_contacts"]],
  ["files", "Arquivos", ["view", "add_file", "remove_file", "archive", "export", "download", "view_versions", "upload_drive", "share_drive", "revoke_drive_share", "refresh_drive_metadata"]],
  ["reports", "Relatórios", ["view", "export", "view_values", "view_history", "view_productivity"]],
  ["finance_professional", "Financeiro profissional", ["view", "create", "edit", "archive", "view_values", "settle_finance", "cancel_entry", "export", "view_consolidated", "manage_accounts", "manage_cards", "manage_categories", "manage_templates", "manage_suppliers", "manage_cost_centers", "manage_recurrence", "manage_installments", "manage_transfers", "approve_finance", "change_environment", "view_audit", "export_values"]],
  ["finance_personal", "Financeiro pessoal", ["view", "create", "edit", "archive", "view_values", "settle_finance", "cancel_entry", "export", "view_consolidated", "manage_accounts", "manage_cards", "manage_categories", "manage_templates", "manage_suppliers", "manage_cost_centers", "manage_recurrence", "manage_installments", "manage_transfers", "approve_finance", "change_environment", "view_audit", "export_values"]],
  ["users", "Usuários", ["view", "create", "edit", "archive", "reactivate", "manage_users"]],
  ["teams", "Equipes", ["view", "create", "edit", "archive", "reactivate", "manage_users"]],
  ["settings", "Configurações", ["view", "manage_settings"]],
  ["checklists", "Checklists", ["view", "create", "edit", "delete", "archive", "reactivate", "approve", "manage_settings"]],
  ["notifications", "Notificações", ["view", "edit", "manage_settings"]],
  ["history", "Histórico", ["view", "export"]],
  ["comments", "Comentários", ["view", "create", "edit", "delete", "view_internal", "create_internal"]],
  ["integrations", "Integrações", ["view", "edit", "manage_settings", "connect_drive", "disconnect_drive", "test_drive"]],
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
  view_financial: "Visualizar dados financeiros", manage_notes: "Gerenciar observações", manage_contacts: "Gerenciar contatos",
  view_team: "Visualizar dados da equipe", view_history: "Visualizar histórico operacional", view_productivity: "Visualizar produtividade", connect_drive: "Conectar Google Drive", disconnect_drive: "Desconectar Google Drive", test_drive: "Testar Google Drive", upload_drive: "Enviar ao Google Drive", share_drive: "Compartilhar no Google Drive", revoke_drive_share: "Revogar compartilhamento do Drive", refresh_drive_metadata: "Atualizar metadados do Drive", view_consolidated: "Visualizar consolidado", manage_accounts: "Gerenciar contas", manage_cards: "Gerenciar cartões", manage_categories: "Gerenciar categorias", manage_templates: "Gerenciar modelos", manage_suppliers: "Gerenciar fornecedores", manage_cost_centers: "Gerenciar centros de custo", manage_recurrence: "Gerenciar recorrências", manage_installments: "Gerenciar parcelamentos", manage_transfers: "Gerenciar transferências", approve_finance: "Aprovar operações financeiras", change_environment: "Alterar ambiente", view_audit: "Visualizar auditoria financeira", export_values: "Exportar valores",
};

const scopedActions = new Set<PermissionAction>(["view", "edit", "delete", "archive", "reactivate", "approve", "export", "change_status", "change_stage", "change_deadline", "add_file", "remove_file", "download", "view_versions", "view_internal", "create_internal", "view_financial", "manage_notes", "manage_contacts", "view_consolidated", "manage_accounts", "manage_cards", "manage_categories", "manage_templates", "manage_suppliers", "manage_cost_centers", "manage_recurrence", "manage_installments", "manage_transfers", "approve_finance", "change_environment", "view_audit", "export_values", "view_team", "view_financial", "view_history", "view_productivity", "connect_drive", "disconnect_drive", "test_drive", "upload_drive", "share_drive", "revoke_drive_share", "refresh_drive_metadata"]);

export const permissionCatalog: PermissionCatalogItem[] = modules.flatMap(([module, moduleLabel, actions]) =>
  actions.map((action) => ({ module, moduleLabel, action, actionLabel: actionLabels[action], supportsScope: scopedActions.has(action) })),
);
