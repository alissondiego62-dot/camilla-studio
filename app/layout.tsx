import type { Metadata } from "next";
import "./globals.css";
import "./architecture.css";

export const metadata: Metadata = {
  title: "Camilla Studio | Gestão de Projetos",
  description: "Plataforma de gestão de projetos, agenda, clientes e financeiro para escritório de arquitetura.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
