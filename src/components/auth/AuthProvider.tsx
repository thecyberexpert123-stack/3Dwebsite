"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient, type Session, type User } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";
import { absoluteUrl } from "@/lib/paths";

/** The role claim the DB policies actually check (auth.jwt() ->> 'user_role'). */
export type UserRole = "customer" | "admin";

export interface AuthState {
  /** loading = we don't know yet (do not show a flash of "signed out"). */
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  /** Magic link — signs a verified user straight in. */
  signInWithOtp: (email: string) => Promise<{ error: string | null }>;
  /** Email + password sign-in (requires a confirmed email / verified sign-up). */
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Sign-up with email + password; when "Confirm email" is ON, Supabase sends
   *  a verification link and no session is created until it is confirmed. */
  signUpWithPassword: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const ROLE_CLAIM = "user_role";

/**
 * Security model (read this before changing anything):
 *   - Passwords never touch our code paths: `signInWithPassword` / `signUp`
 *     send them straight to Supabase Auth, which stores only a one-way bcrypt
 *     hash in the managed `auth.users` table (not reversible "encryption").
 *   - Email verification is a project setting (Auth → Providers → Email →
 *     "Confirm email"). With it ON, `signUp` returns no session until the
 *     link is confirmed; we surface that explicitly.
 *   - /admin and every RLS policy authorise from the `user_role` claim in the
 *     signed-in user's JWT — never from anything the client asserts.
 */
export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  const role: UserRole | null = useMemo(() => {
    const claim = (session?.user?.app_metadata as Record<string, unknown> | undefined)?.[ROLE_CLAIM];
    return claim === "admin" ? "admin" : claim === "customer" ? "customer" : session ? "customer" : null;
  }, [session]);

  const signInWithOtp = useCallback(
    async (email: string) => {
      try {
        const { error } = await client.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: absoluteUrl("/signin") },
        });
        return { error: error ? error.message : null };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Could not reach the server." };
      }
    },
    [client]
  );

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        return { error: error ? error.message : null };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Could not reach the server." };
      }
    },
    [client]
  );

  const signUpWithPassword = useCallback(
    async (email: string, password: string, name?: string) => {
      try {
        // send the `name` through so the profiles table trigger can use it;
        // emailRedirectTo lands the confirmation link on /signin, where the
        // client auto-detects the token and signs them in (detectSessionInUrl).
        const { error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: name ? { name } : undefined,
            emailRedirectTo: absoluteUrl("/signin"),
          },
        });
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
      signInWithPassword,
      signUpWithPassword,
      signOut,
    }),
    [loading, session, role, signInWithOtp, signInWithPassword, signUpWithPassword, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
