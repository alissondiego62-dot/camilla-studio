"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CAMILLA_BRAND } from "@/app/config/brand";
import { navigationItems } from "@/app/config/navigation";
import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";
import { useAuth } from "@/app/providers/AuthProvider";
import { LoadingState } from "@/app/components/ui/DataState";
import { LoginPage } from "./LoginPage";

export function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { ready, configured, user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useBodyScrollLock(menuOpen);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  if (!ready) {
    return <main className="cs-boot"><LoadingState label="Carregando Camilla Studio…" /></main>;
  }

  if (configured && !user) return <LoginPage />;

  async function exit() {
    setSignOutError("");
    try {
      await signOut();
    } catch (reason) {
      setSignOutError(reason instanceof Error ? reason.message : "Não foi possível sair.");
    }
  }

  return (
    <div className="cs-app">
      <aside id="studio-navigation" className={`cs-sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="cs-brand">
          <Image src={CAMILLA_BRAND.logoPath} alt={CAMILLA_BRAND.companyName} width={80} height={82} />
          <div>
            <strong>{CAMILLA_BRAND.productName}</strong>
            <span>Arquitetura & Interiores</span>
          </div>
        </div>
        <nav aria-label="Navegação principal">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname?.startsWith(item.href) ? "active" : ""}
              onClick={() => setMenuOpen(false)}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <footer>
          <div>
            <strong>{profile?.name || user?.email?.split("@")[0] || "Ambiente local"}</strong>
            <span>{profile?.camilla_role || profile?.role || "Camilla Studio 3.0"}</span>
          </div>
          {configured && user && <button type="button" onClick={() => void exit()}>Sair</button>}
          {signOutError && <small>{signOutError}</small>}
        </footer>
      </aside>

      <div className="cs-main">
        <div className="cs-mobile-topbar">
          <button
            type="button"
            aria-label="Abrir menu"
            aria-controls="studio-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            ☰
          </button>
          <span>{CAMILLA_BRAND.productName}</span>
        </div>
        {!configured && (
          <div className="cs-alert cs-alert-warning">
            Supabase não configurado. As páginas serão exibidas sem registros até que as variáveis públicas sejam definidas.
          </div>
        )}
        <main className="cs-content">{children}</main>
      </div>

      {menuOpen && <button className="cs-overlay" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
    </div>
  );
}
