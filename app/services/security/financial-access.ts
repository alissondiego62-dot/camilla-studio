const financialAdministratorProfiles = new Set(["administrator", "owner"]);

/**
 * Informações contratuais e financeiras de projetos são restritas ao nível
 * administrativo. A Proprietária é tratada como nível administrativo por ser
 * o perfil de sistema com autoridade superior ao Administrador.
 */
export function isFinancialAdministrator(profileCode?: string | null) {
  return financialAdministratorProfiles.has(String(profileCode ?? "").trim().toLowerCase());
}
