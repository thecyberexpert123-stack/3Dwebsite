# Whimlet · Supabase backend (free tier)

The site stays fully static on GitHub Pages — Supabase provides **auth +
database** from the browser. Security lives in **Row Level Security (RLS)**
policies (see `schema.sql`); the publishable key that ships in the site is
*designed* to be public and only reaches rows your policies allow it to.

## One-time setup (≈3 minutes)

1. **Create the project** (already done — `https://hbimqkdirfvmhitkuiqe.supabase.co`).
   In **Authentication → Providers → Email**, enable **Email** and turn
   **Confirm email** ON — this is what makes password sign-up send a
   **verification email** and blocks sign-in until the address is confirmed.
   (Magic links require a confirmed inbox either way.)

   → **Sign In / Up → Redirect URLs**: allow `https://thecyberexpert123-stack.github.io/3Dwebsite/**` (and `http://localhost:3000/**` for dev).

2. **Run the schema.** Open **SQL Editor → New query**, paste the whole of
   `schema.sql`, and run it. It is idempotent — safe to re-run after any
   schema edit.

3. **Seed the admin.** Sign in at `/signin` once (create your account), then
   in the SQL editor run (with your real email):

   ```sql
   update auth.users
      set raw_app_meta_data = raw_app_meta_data || '{"user_role":"admin"}'
    where email = 'you@example.com';
   ```

   Log out and back in at `/signin` to pick up the new `user_role` claim.
   `/admin` will now open for you; a normal customer is refused.

4. **(Optional) site content.** The admin panel can manage testimonials and
   products in the `testimonials` / `products` tables above once you author
   them there.

## Environment

The client reads these at **build time** from the deploy workflow
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Set them as
repo **Secrets → Actions** (Settings → Secrets and variables → Actions →
Repository secrets) if they are not already:

| Secret | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hbimqkdirfvmhitkuiqe.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the `sb_publishable_…` key from Project Settings → API |

For local dev, copy them into `.env.local` (already git-ignored).

## Google Sign-In (free, no SMS provider)

The `/signin` button is already wired in the code; it just needs the
provider on in Supabase and its callback URL whitelisted.

1. **Google Cloud Console → Credentials → OAuth 2.0 Client ID**
   (type *Web application*). In *Authorised redirect URIs* add the Supabase
   callback exactly:
   ```
   https://hbimqkdirfvmhitkuiqe.supabase.co/auth/v1/callback
   ```
   → Create (you can skip the OAuth consent-screen branding for now; use
   *External*, add your email as a test user).
2. **Supabase → Authentication → Providers → Google → enable**, and paste
   the **Client ID** and **Client secret** from the step above.
3. **Authentication → URL Configuration → Redirect URLs** must already contain
   `https://thecyberexpert123-stack.github.io/3Dwebsite/**` — that is where
   the browser comes back after Google approves (the client sends
   `redirectTo: …/signin`).

That's it — no server code, no per-SMS cost. Google accounts that sign up
are automatically email-verified by Google itself.

## Email templates

The "Confirm signup" and "Magic link" emails are unbranded by default. Two
paste-ready Whimlet templates (pastel, fully self-contained) live in
[`email-templates.md`](email-templates.md). Each has a clickable button plus a
plain-text link fallback. A "use a 6-digit code instead" entry box on
`/signin` (for scanners that prefetch and consume email links) is the next
auth step — the templates deliberately don't promise it until it exists.

## Security model (why admin data stays admin-only)

- Every table is guarded by **RLS** policies keyed to `auth.uid()` /
  `is_admin()`. The publishable key only reaches rows a policy allows.
- `admin_overview_v1()` is **`SECURITY DEFINER`**, so it intentionally
  bypasses RLS — that is exactly why its body re-checks `is_admin()` first
  and raises for anyone else. `grant execute … to authenticated` only
  decides who may *attempt* the call; the in-function guard decides who
  may *succeed*. This is not redundant with RLS — a DEFINER function would
  otherwise be readable by any signed-in user.

## Passwords — how they are stored

The site never stores passwords at all. Both sign-up and sign-in go through
Supabase Auth, which keeps a **one-way bcrypt hash** in its managed
`auth.users` table. (A reversible "encrypted" password would be a security
bug — it can be decrypted on breach; a hash cannot. This is the same reason
every serious platform does it.) Email confirmation is enforced by the
"Confirm email" setting above, and Supabase's own rate limits cover brute
force.

## Honesty notes

- The sandbox that builds this code has **no outbound internet to
  `*.supabase.co`**, so the integration is verified by unit tests + build and
  an on-device smoke list — the final browser round-trip happens on *your*
  machine. That is by design: the browser talks to Supabase directly and RLS
  is the security boundary, not the build machine.
- No service-role / secret key is ever used by the site. Only the publishable
  key. The secret key must never appear in `NEXT_PUBLIC_*`.
