"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const navigation = [
  ["/dashboard", "Dashboard", "⌂"],
  ["/projects", "Projetos", "▦"],
  ["/kanban", "Kanban", "⋮"],
  ["/activities", "Atividades", "✓"],
  ["/agenda", "Agenda", "◷"],
  ["/clients", "Clientes", "◎"],
  ["/finance", "Financeiro", "R$"],
  ["/files", "Arquivos", "□"],
  ["/reports", "Relatórios", "↗"],
  ["/users", "Usuários", "♙"],
  ["/settings", "Configurações", "⚙"],
] as const;

type Props = { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode };

export function AppShell({ title, subtitle, children, actions }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const activeLabel = useMemo(() => navigation.find(([href]) => pathname?.startsWith(href))?.[1] ?? title, [pathname, title]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setError(result.error.message);
  }

  if (!ready) return <div className="v3-loading">Carregando Camilla Studio…</div>;

  if (isSupabaseConfigured && !user) {
    return (
      <main className="v3-login-page">
        <section className="v3-login-card">
          <img src="/brand/camilla-studio-logo.png" alt="Camilla Studio" className="v3-login-logo" />
          <div>
            <span className="v3-kicker">GESTÃO DE ARQUITETURA</span>
            <h1>Camilla Studio</h1>
            <p>Projetos, agenda, atividades, clientes e financeiro em um único ambiente.</p>
          </div>
          <form onSubmit={signIn} className="v3-form-stack">
            <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
            <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
            {error && <div className="v3-alert v3-alert-error">{error}</div>}
            <button className="v3-button v3-button-primary" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className="v3-app">
      <aside className={`v3-sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="v3-brand">
          <img src="/brand/camilla-studio-logo.png" alt="Camilla Studio" />
          <div><strong>Camilla Studio</strong><span>Arquitetura & Interiores</span></div>
        </div>
        <nav aria-label="Navegação principal">
          {navigation.map(([href, label, icon]) => (
            <button key={href} className={pathname?.startsWith(href) ? "active" : ""} onClick={() => { router.push(href); setMenuOpen(false); }}>
              <span aria-hidden="true">{icon}</span><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="v3-sidebar-footer">
          <span>Versão 3.0</span>
          {user && <button onClick={() => void supabase.auth.signOut()}>Sair</button>}
        </div>
      </aside>
      <div className="v3-main">
        <header className="v3-topbar">
          <button className="v3-menu-button" aria-label="Abrir menu" onClick={() => setMenuOpen((value) => !value)}>☰</button>
          <div><span className="v3-breadcrumb">Camilla Studio / {activeLabel}</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
          <div className="v3-page-actions">{actions}</div>
        </header>
        {!isSupabaseConfigured && <div className="v3-alert v3-alert-warning">Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para usar dados reais.</div>}
        <main className="v3-content">{children}</main>
      </div>
      {menuOpen && <button className="v3-overlay" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
    </div>
  );
}
