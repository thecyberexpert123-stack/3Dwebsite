import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Owner | Whimlet",
  description: "Whimlet owner sign-in — a quiet, unlisted door.",
  robots: { index: false, follow: false },
};

/**
 * The owner's quiet door. Deliberately linked from nowhere (no nav, footer
 * or sitemap entry), `noindex` + robots-disallowed. Bookmark it as your way
 * in.
 *
 * Honesty: this page is a *shortcut and a reminder*, not a lock. Its secrecy
 * buys discretion, not security — the security boundary is the `user_role`
 * claim in `auth.users`, re-checked by Row Level Security on every query. A
 * would-be admin who guesses this URL can sign in as themselves all they
 * like; without the admin claim they still see only the customer view.
 */

const GRANT_SQL = `-- Your account becomes the admin. Run ONCE, with your real
-- email in place of you@example.com, then sign out and back in.
update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"user_role": "admin"}'
 where email = 'you@example.com';`;

export default function OwnerPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="rounded-[1.9rem] border border-white/70 bg-white/70 p-7 shadow-card backdrop-blur-md">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.24em] text-rose-ink">
          Whimlet · owner only
        </p>
        <h1 className="mt-2 font-script text-4xl text-cocoa">The owner&apos;s door</h1>
        <p className="mt-3 text-sm leading-relaxed text-cocoa-soft">
          There is one login — your account. &ldquo;Admin&rdquo; is a claim on that login, granted
          once in the database. It can&apos;t be granted from the browser, and that&apos;s the point:
          if a button here could make you the owner, anyone could press it.
        </p>

        <ol className="mt-5 flex flex-col gap-2.5 text-sm text-cocoa">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-bold text-cocoa">1</span>
            <span>Sign in below with your email — this creates your account if it&apos;s new.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-bold text-cocoa">2</span>
            <span>In <strong>Supabase → SQL Editor</strong>, run the line below with your email.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-bold text-cocoa">3</span>
            <span>Sign out and back in — the menu now shows <strong>Admin</strong>, and <code className="rounded bg-blush-soft/60 px-1">/admin</code> opens.</span>
          </li>
        </ol>

        <pre className="mt-5 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-white/80 p-4 font-mono text-[0.72rem] leading-relaxed text-cocoa">
          {GRANT_SQL}
        </pre>

        <Link href="/signin" className="btn btn-primary btn-md mt-5 w-full">
          Go to sign in →
        </Link>

        <p className="mt-4 text-xs leading-relaxed text-cocoa-soft">
          This page is unlisted and hidden from search engines. That is discretion, not
          security — the lock is the claim + row-level security, and it refuses a customer
          even if they open <code className="rounded bg-blush-soft/60 px-1">/admin</code> directly.
        </p>
      </div>
    </div>
  );
}
