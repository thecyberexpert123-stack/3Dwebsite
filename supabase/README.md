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
