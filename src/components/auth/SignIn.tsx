"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "./AuthProvider";

/**
 * /signin — "signed in" is simply a valid Supabase session. Two supported,
 * honest entry points (design documented in AGENT-EXPERIENCE):
 *
 * • Magic link (email) — no password to lose; works on a static site.
 * • Email + password — comes decorative; on a real deployment it hangs off
 *   the SMTP-endpoint service we gate with NEXT_PUBLIC_AUTH_API_URL.
 *
 * A "sign in" success is not "you may manage the store": /admin re-checks the
 * JWT's `user_role` claim on every entry, and the database RLS policies check
 * it again on every row — the role is enforced where it cannot be spoofed.
 */
export function SignIn() {
  const { loading, user, role, signInWithOtp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<"otp" | "password">("otp");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "info" | "error"; text: string } | null>(null);

  const send = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
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
      } else {
        setStatus({
          kind: "info",
          text: "Password sign-in needs the auth service configured (see the code note). Start with a magic link — it's the same account.",
        });
      }
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
        <h1 className="text-center font-script text-4xl text-cocoa">Sign in to Whimlet</h1>
        <p className="mt-2 text-center font-hand text-lg leading-snug text-cocoa-soft">
          Save your designs (up to 5) and pick them up anywhere.
        </p>

        <div role="tablist" aria-label="Sign-in method" className="mt-6 flex rounded-full border border-blush-deep/30 bg-white/60 p-1">
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
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cocoa-soft">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-full border border-blush-deep/30 bg-white/80 px-4 py-2.5 text-cocoa placeholder:text-cocoa-soft/60 focus:border-rose focus:outline-none"
            />
          </label>
        )}

        <button type="button" onClick={send} disabled={busy} className="btn btn-primary btn-lg mt-6 w-full disabled:opacity-60">
          {busy ? "Sending…" : method === "otp" ? "Send me a magic link" : "Sign in"}
        </button>

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
