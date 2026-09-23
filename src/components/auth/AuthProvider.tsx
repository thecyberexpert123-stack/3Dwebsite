"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient, type Session, type User } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";

/** The role claim the DB policies actually check (auth.jwt() ->> 'user_role'). */
export type UserRole = "customer" | "admin";

export interface AuthState {
  /** loading = we don't know yet (do not show a flash of "signed out"). */
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  signInWithOtp: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Remember-the-flag UX for first-setup — will be scoped out in later phases.
   *  Non-authoritative: the DB role claim is what /admin actually enforces. */
  rememberAdminFlag: boolean;
  setRememberAdminFlag: (v: boolean) => void;
}

const AuthContext = createContext<AuthState | null>(null);

const ROLE_CLAIM = "user_role";
const ROLE_SEEN = "whimlet:adminflag";

/**
 * IMPORTANT — the admin flag is NOT an authorization mechanism. /admin and
 * the Supabase RLS policies authorise from the `user_role` claim in the
 * signed-in user's JWT (set on auth.users.raw_app_meta_data). The flag only
 * remembers locally that an admin has used this browser, purely so future
 * phased UI (e.g. a "show admin affordances" store entry) has a place to
 * read a hint. It must never gate data.
 */
export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rememberAdminFlag, setRememberAdminFlagState] = useState(false);

  const client = useMemo(() => createClient(SUPABASE_URL, SUPABASE_ANON_KEY), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) setSession(data.session ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const { data: sub } = client.auth.onAuthStateChange((_event, s) => {
      if (!cancelled) setSession(s);
    });

    try {
      setRememberAdminFlagState(localStorage.getItem(ROLE_SEEN) === "admin");
    } catch {
      /* private mode — flag just stays false */
    }

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  const role: UserRole | null = useMemo(() => {
    const claim = (session?.user?.app_metadata as Record<string, unknown> | undefined)?.[ROLE_CLAIM];
    return claim === "admin" ? "admin" : claim === "customer" ? "customer" : session ? "customer" : null;
  }, [session]);

  // keep the local flag honest whenever we know the role from the JWT
  useEffect(() => {
    if (role === "admin") {
      try {
        localStorage.setItem(ROLE_SEEN, "admin");
      } catch {}
      setRememberAdminFlagState(true);
    }
  }, [role]);

  const signInWithOtp = useCallback(
    async (email: string) => {
      try {
        const { error } = await client.auth.signInWithOtp({ email });
        return { error: error ? error.message : null };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Could not reach the server." };
      }
    },
    [client]
  );

  const signOut = useCallback(async () => {
    await client.auth.signOut();
    setSession(null);
  }, [client]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      role,
      signInWithOtp,
      signOut,
      rememberAdminFlag,
      setRememberAdminFlag: setRememberAdminFlagState,
    }),
    [loading, session, role, signInWithOtp, signOut, rememberAdminFlag]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
