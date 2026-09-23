"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "./AuthProvider";

/**
 * /signin — "signed in" is a valid Supabase session. Three honest entry
 * points, all provider-managed (no password ever stored in our tables):
 *
 * • Magic link — email a one-tap link.
 * • Password sign-in — an existing verified email + password.
 * • Sign-up — email + password + name; when Supabase "Confirm email" is ON,
 *   Supabase emails the user a verification link and NO session is created
 *   until they confirm (shown here honestly as the "check your inbox" state).
 *
 * The admin *role* is a `user_role` claim on the JWT (set by SQL once); the
 * database re-checks it on every row, so this UI is only a gate painting.
 */
export function SignIn() {
  const { loading, user, role, signInWithOtp, signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"in" | "up">("in");
  const [method, setMethod] = useState<"otp" | "password">("otp");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "info" | "error"; text: string } | null>(null);

  const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const google = async () => {
    setBusy(true);
    try {
      const r = await signInWithGoogle();
      if (r.error) setStatus({ kind: "error", text: r.error });
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const e = email.trim().toLowerCase();
    if (!validEmail(e)) {
      setStatus({ kind: "error", text: "That email address doesn't look right — mind the @?" });
      return;
    }
    setBusy(true);
    try {
      if (method === "otp") {
        const r = await signInWithOtp(e);
        setStatus(
          r.error
            ? { kind: "error", text: r.error }
            : { kind: "info", text: "Check your email for a magic link — it signs you straight in. (Check spam too.)" }
        );
        return;
      }

      if (mode === "up") {
        if (pw.length < 6) {
          setStatus({ kind: "error", text: "Please use at least 6 characters for your password." });
          return;
        }
        const r = await signUpWithPassword(e, pw, name.trim() || undefined);
        setStatus(
          r.error
            ? { kind: "error", text: r.error }
            : { kind: "info", text: "Almost there — we've emailed you a link to verify your address. Click it, then sign in with your password." }
        );
        return;
      }

      const r = await signInWithPassword(e, pw);
      setStatus(r.error ? { kind: "error", text: r.error } : null);
      // session now set → the signed-in panel below renders automatically
    } finally {
      setBusy(false);
    }
  };

  // Already signed in?
  if (!loading && user) {
    const admin = role === "admin";
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="font-script text-4xl text-cocoa">Hi, {user.email?.split("@")[0] ?? "friend"} ♥</p>
        <p className="mt-3 text-sm text-cocoa-soft">
          {admin ? "You are signed in as the shop admin." : "You are signed in as a customer."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {admin && (
            <button type="button" onClick={() => router.push("/admin")} className="btn btn-primary btn-md">
              Open the admin panel
            </button>
          )}
          <button type="button" onClick={() => router.push("/account")} className="btn btn-glass btn-md">
            My designs
          </button>
          <button type="button" onClick={() => router.push("/")} className="btn btn-outline btn-md">
            Back to Whimlet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-6">
      <div className="rounded-[1.9rem] border border-white/70 bg-white/70 p-7 shadow-card backdrop-blur-md">
        <h1 className="text-center font-script text-4xl text-cocoa">
          {mode === "in" ? "Sign in to Whimlet" : "Join Whimlet"}
        </h1>
        <p className="mt-2 text-center font-hand text-lg leading-snug text-cocoa-soft">
          {mode === "in" ? "Save your designs (up to 5) and pick them up anywhere." : "An account keeps your crochet designs safe."}
        </p>

        {mode === "in" && (
          <>
            <button
              type="button"
              onClick={google}
              disabled={busy}
              className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-full border border-white/70 bg-white px-4 py-2.5 text-sm font-semibold text-cocoa shadow-card transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                <path
                  fill="#FFC107"
                  d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.2 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.3 35.4 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z"
                />
              </svg>
              Continue with Google
            </button>
            <div className="mt-4 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-blush-deep/30" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa-soft">or</span>
              <span className="h-px flex-1 bg-blush-deep/30" />
            </div>
          </>
        )}

        <div role="tablist" aria-label="Sign-in method" className="mt-5 flex rounded-full border border-blush-deep/30 bg-white/60 p-1">
          {(
            [
              { id: "otp", label: "Magic link" },
              { id: "password", label: "Password" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={method === m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`flex-1 rounded-full py-1.5 text-sm font-semibold transition-colors ${
                method === m.id ? "bg-blush text-cocoa shadow-sm" : "text-cocoa-soft"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === "up" && method === "password" && (
          <label className="mt-5 block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cocoa-soft">Your name</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
              className="mt-1.5 w-full rounded-full border border-blush-deep/30 bg-white/80 px-4 py-2.5 text-cocoa placeholder:text-cocoa-soft/60 focus:border-rose focus:outline-none"
            />
          </label>
        )}

        <label className="mt-5 block">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cocoa-soft">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-full border border-blush-deep/30 bg-white/80 px-4 py-2.5 text-cocoa placeholder:text-cocoa-soft/60 focus:border-rose focus:outline-none"
          />
        </label>

        {method === "password" && (
          <label className="mt-4 block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cocoa-soft">
              Password{mode === "up" ? " (6+ characters)" : ""}
            </span>
            <input
              type="password"
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-full border border-blush-deep/30 bg-white/80 px-4 py-2.5 text-cocoa placeholder:text-cocoa-soft/60 focus:border-rose focus:outline-none"
            />
          </label>
        )}

        <button type="button" onClick={submit} disabled={busy} className="btn btn-primary btn-lg mt-6 w-full disabled:opacity-60">
          {busy
            ? "…"
            : method === "otp"
              ? "Send me a magic link"
              : mode === "up"
                ? "Create my account"
                : "Sign in"}
        </button>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setStatus(null);
              if (mode === "up") setMethod("password");
            }}
            className="text-sm font-semibold text-rose-ink underline-offset-4 hover:underline"
          >
            {mode === "in" ? "No account yet? Create one" : "Already have an account? Sign in"}
          </button>
        </div>

        <AnimatePresence>
          {status && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                status.kind === "error" ? "bg-rose-ink/10 text-rose-ink" : "bg-mint/30 text-cocoa"
              }`}
              role={status.kind === "error" ? "alert" : "status"}
            >
              {status.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
