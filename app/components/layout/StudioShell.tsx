"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CAMILLA_BRAND } from "@/app/config/brand";
import { navigationItems } from "@/app/config/navigation";
import { useBodyScrollLock } from "@/app/hooks/useBodyScrollLock";
import { useAuth } from "@/app/providers/AuthProvider";
import { usePermissions } from "@/app/hooks/usePermissions";
import { LoadingState } from "@/app/components/ui/DataState";
import { AccessDenied } from "@/app/components/security/PermissionGate";
import { LoginPage } from "./LoginPage";
import { NotificationBell } from "@/app/features/notifications/NotificationBell";
import { SkipLink } from "@/app/components/a11y/SkipLink";

export function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { ready, configured, user, profile, access, signOut } = useAuth();
  const { can } = usePermissions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useBodyScrollLock(menuOpen);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menuOpen) { setMenuOpen(false); menuButtonRef.current?.focus(); }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [menuOpen]);

  if (!ready) {
    return <main className="cs-boot"><LoadingState label="Carregando Camilla Studio…" /></main>;
  }

  if (configured && !user) return <LoginPage />;

  const currentNavigation = navigationItems.find((item) => pathname === item.href || pathname?.startsWith(`${item.href}/`));
  const navigationAllowed = (item: (typeof navigationItems)[number]) => {
    const profileAllowed = !item.profileCodes?.length || item.profileCodes.includes(access.profileCode);
    return profileAllowed && item.permissions.some((permission) => can(permission.module, permission.action));
  };
  const routeAllowed = !configured || !currentNavigation || navigationAllowed(currentNavigation);

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
      <SkipLink />
      <aside id="studio-navigation" className={`cs-sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="cs-brand">
          <Image src={CAMILLA_BRAND.logoPath} alt={CAMILLA_BRAND.companyName} width={80} height={82} />
          <div>
            <strong>{CAMILLA_BRAND.productName}</strong>
            <span>Arquitetura & Interiores</span>
          </div>
        </div>
        <nav aria-label="Navegação principal">
          {navigationItems.filter((item) => !configured || navigationAllowed(item)).map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );})}
        </nav>
        <footer>
          <div>
            <strong>{profile?.name || user?.email?.split("@")[0] || "Ambiente local"}</strong>
            <span>{access.profileName || profile?.camilla_role || profile?.role || "Camilla Studio 3.0"}</span>
          </div>
          {configured && user && <button type="button" onClick={() => void exit()}>Sair</button>}
          {signOutError && <small>{signOutError}</small>}
        </footer>
      </aside>

      <div className="cs-main">
        <div className="cs-mobile-topbar">
          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Abrir menu"
            aria-controls="studio-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            ☰
          </button>
          <span>{CAMILLA_BRAND.productName}</span><NotificationBell />
        </div>
        {!configured && (
          <div className="cs-alert cs-alert-warning">
            Supabase não configurado. As páginas serão exibidas sem registros até que as variáveis públicas sejam definidas.
          </div>
        )}
        <div className="cs-desktop-tools"><NotificationBell /></div><main id="main-content" className="cs-content" tabIndex={-1}>{routeAllowed ? children : <AccessDenied />}</main>
      </div>

      {menuOpen && <button className="cs-overlay" aria-label="Fechar menu" onClick={() => { setMenuOpen(false); menuButtonRef.current?.focus(); }} />}
    </div>
  );
}
