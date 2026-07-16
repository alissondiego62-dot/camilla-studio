export type NavigationItem = { href: string; label: string; icon: string };
export const navigationItems: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "⌂" },
  { href: "/projects", label: "Projetos", icon: "▦" },
  { href: "/kanban", label: "Kanban", icon: "≡" },
  { href: "/activities", label: "Atividades", icon: "✓" },
  { href: "/agenda", label: "Agenda", icon: "◷" },
  { href: "/clients", label: "Clientes", icon: "◎" },
  { href: "/finance", label: "Financeiro", icon: "R$" },
  { href: "/files", label: "Arquivos", icon: "□" },
  { href: "/reports", label: "Relatórios", icon: "↗" },
  { href: "/users", label: "Usuários", icon: "♙" },
  { href: "/settings", label: "Configurações", icon: "⚙" },
];
