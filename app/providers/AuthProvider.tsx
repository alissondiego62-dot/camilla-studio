"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type AuthProfile = {
  id: string;
  name: string;
  email: string;
  camilla_role?: string;
  role?: string;
  active?: boolean;
};

type AuthContextValue = {
  user: User | null;
  profile: AuthProfile | null;
  ready: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(user: User): Promise<AuthProfile | null> {
  const detailed = await supabase
    .from("profiles")
    .select("id,name,email,camilla_role,role,active")
    .eq("id", user.id)
    .maybeSingle();

  if (!detailed.error && detailed.data) return detailed.data as AuthProfile;

  const basic = await supabase
    .from("profiles")
    .select("id,name,email,active")
    .eq("id", user.id)
    .maybeSingle();

  return basic.error ? null : (basic.data as AuthProfile | null);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured);

  const syncUser = useCallback(async (nextUser: User | null) => {
    setUser(nextUser);
    setProfile(nextUser && isSupabaseConfigured ? await loadProfile(nextUser) : null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    void supabase.auth
      .getSession()
      .then(({ data }) => syncUser(data.session?.user ?? null));

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUser(session?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, [syncUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      ready,
      configured: isSupabaseConfigured,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [profile, ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser utilizado dentro de AuthProvider.");
  return context;
}
