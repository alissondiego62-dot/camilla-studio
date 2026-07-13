import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./architecture.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#b76d55",
};

export const metadata: Metadata = {
  title: "Camilla Studio | Gestão de Projetos",
  description: "Plataforma de gestão de projetos, agenda, clientes e financeiro para escritório de arquitetura.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Camilla Studio", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
