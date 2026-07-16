"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { AccessContext } from "@/app/types/permissions";
import { loadAccessContext, recordSecurityEvent } from "@/app/services/security/permission.service";

export type AuthProfile = {
  id: string;
  name: string;
  email: string;
  camilla_role?: string | null;
  role?: string | null;
  active?: boolean;
  blocked_at?: string | null;
  session_revoked_at?: string | null;
  last_access_at?: string | null;
  permission_profile_id?: string | null;
};

const emptyAccess: AccessContext = { valid: true, profileCode: "viewer", profileName: "Somente leitura", permissions: [], sessionRevokedAt: null, blockedAt: null };

type AuthContextValue = {
  user: User | null;
  profile: AuthProfile | null;
  access: AccessContext;
  ready: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadAccess: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(user: User): Promise<AuthProfile | null> {
  const detailed = await supabase.from("profiles")
    .select("id,name,email,camilla_role,role,active,blocked_at,session_revoked_at,last_access_at,permission_profile_id")
    .eq("id", user.id).maybeSingle();
  if (!detailed.error && detailed.data) return detailed.data as AuthProfile;
  const basic = await supabase.from("profiles").select("id,name,email,role,active").eq("id", user.id).maybeSingle();
  return basic.error ? null : (basic.data as AuthProfile | null);
}

async function auditFailedLogin(email: string, message: string) {
  try {
    await supabase.functions.invoke("auth-audit", { body: { event_type: "login_failure", email, reason: message } });
  } catch { /* auditoria não deve impedir o retorno do erro original */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [access, setAccess] = useState<AccessContext>(emptyAccess);
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const syncing = useRef(false);

  const syncUser = useCallback(async (nextUser: User | null) => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      setUser(nextUser);
      if (nextUser && isSupabaseConfigured) {
        const nextProfile = await loadProfile(nextUser);
        const nextAccess = await loadAccessContext(nextProfile?.camilla_role ?? nextProfile?.role);
        setProfile(nextProfile);
        setAccess(nextAccess);
        if (!nextAccess.valid || nextProfile?.active === false || nextProfile?.blocked_at) {
          await supabase.auth.signOut();
          setUser(null); setProfile(null); setAccess(emptyAccess);
        }
      } else {
        setProfile(null); setAccess(emptyAccess);
      }
      setReady(true);
    } finally { syncing.current = false; }
  }, []);

  const reloadAccess = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;
    const nextProfile = await loadProfile(user);
    const nextAccess = await loadAccessContext(nextProfile?.camilla_role ?? nextProfile?.role);
    setProfile(nextProfile); setAccess(nextAccess);
  }, [user]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void supabase.auth.getSession().then(({ data }) => syncUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { void syncUser(session?.user ?? null); });
    return () => data.subscription.unsubscribe();
  }, [syncUser]);

  const value = useMemo<AuthContextValue>(() => ({
    user, profile, access, ready, configured: isSupabaseConfigured, reloadAccess,
    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { await auditFailedLogin(email, error.message); throw error; }
      if (data.user) {
        try { await recordSecurityEvent("login_success", { provider: "password" }); } catch { /* compatibilidade pré-migration */ }
      }
    },
    async signOut() {
      try { await recordSecurityEvent("logout", {}); } catch { /* compatibilidade pré-migration */ }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  }), [access, profile, ready, reloadAccess, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser utilizado dentro de AuthProvider.");
  return context;
}
