import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/layout.css";
import "./styles/responsive.css";
import "./styles/activities.css";
export const viewport: Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#5E3021"};
export const metadata:Metadata={title:{default:"Camilla Studio | Gestão de Projetos",template:"%s | Camilla Studio"},description:"Plataforma de gestão de projetos, agenda, clientes e financeiro para escritório de arquitetura.",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,title:"Camilla Studio",statusBarStyle:"default"},icons:{icon:[{url:"/brand/camilla-studio-logo.png",type:"image/png"},{url:"/icons/icon-192.png",sizes:"192x192",type:"image/png"}],apple:[{url:"/icons/apple-touch-icon.png",sizes:"180x180",type:"image/png"}]}};
export default function RootLayout({children}:Readonly<{children:ReactNode}>){return <html lang="pt-BR"><body>{children}</body></html>}
