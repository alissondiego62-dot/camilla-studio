import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/layout.css";
import "./styles/responsive.css";
import "./styles/activities.css";
import "./styles/agenda.css";
import "./styles/finance.css";
export const viewport: Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#5E3021"};
export const metadata:Metadata={title:{default:"Camilla Studio | Gestão de Projetos",template:"%s | Camilla Studio"},description:"Plataforma de gestão de projetos, agenda, clientes e financeiro profissional para escritório de arquitetura.",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,title:"Camilla Studio",statusBarStyle:"default"},icons:{icon:[{url:"/favicon.ico",sizes:"any"},{url:"/icons/icon-192.png",sizes:"192x192",type:"image/png"}],shortcut:"/favicon.ico",apple:[{url:"/icons/apple-touch-icon.png",sizes:"180x180",type:"image/png"}]}};
export default function RootLayout({children}:Readonly<{children:ReactNode}>){return <html lang="pt-BR"><body><noscript><div className="cs-alert cs-alert-warning">O Camilla Studio precisa de JavaScript habilitado para funcionar.</div></noscript>{children}</body></html>}
