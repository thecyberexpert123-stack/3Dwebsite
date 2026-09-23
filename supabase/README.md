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
   schema edit. **Re-run it now** if you already ran an earlier copy: the
   current file fixes the role read (`is_admin()`/`get_user_role()` now read
   `auth.jwt() -> 'app_metadata' ->> 'user_role'`, matching where the grant
   SQL writes it — the first attempt read a top-level claim that is always
   null without an auth-hook, so a real admin was refused with
   "admin role required").

3. **Seed the admin.** Sign in at `/signin` once (create your account), then
   in the SQL editor run (with your real email):

   ```sql
   update auth.users
      set raw_app_meta_data = raw_app_meta_data || '{"user_role":"admin"}'
    where email = 'you@example.com';
   ```

   Log out and back in at `/signin` to pick up the new `user_role` claim.
   `/admin` will now open for you; a normal customer is refused.

   > **Where do I manage this later?** There are no separate "admin
   > credentials" — *admin is your own account + the claim above.* Bookmark
   > the hidden owner door: **`https://thecyberexpert123-stack.github.io/3Dwebsite/owner`**
   > (unlisted, `noindex`, robots-disallowed). It shows the sign-in entry
   > point plus this grant SQL in one place. The door's secrecy is
   > *discretion, not security* — the lock is the claim + RLS, which refuse
   > a normal customer even at `/admin` directly.

4. **(Optional) site content.** The admin panel can manage testimonials and
   products in the `testimonials` / `products` tables above once you author
   them there.

   > **v0.25.0 ships an updated schema.** Re-run `schema.sql` now to pick up
   > the security hardening (no self role-escalation, size/shape caps on
   > designs and leads, revoked PUBLIC execute on the role helpers) and the
   > three order-tracking pieces: the `create_order_from_chat` /
   > `record_customer_order_v1` RPCs and the `security_invoker` view
   > `orders_status_history` that customers read on `/account`.

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

## Custom SMTP — Brevo (production email)

Supabase's built-in mailer is for testing only: ≈2 emails/hour, unbranded,
and (since mid-2026) new free-tier projects on it can't edit templates.
Pointing auth at a real SMTP provider fixes both.
**Brevo** works without a domain to start and needs no card (~300/day free).

1. **Brevo, top-right → your company/account name (or ⚙️) → Settings →
   Senders, Domains & IPs → Senders → Add sender**: From name `Whimlet`,
   From email = a real address you control (or authenticate a whole domain
   under the Domains tab). Brevo emails a confirmation link — click it. Fill
   any "Complete your profile" notice or first sends can silently block.
   (Note: these settings menus are under the top-right account menu, NOT the
   left sidebar; the left "Transactional" item is for campaigns/logs.)
2. **Brevo, top-right menu → Settings → SMTP & API → SMTP tab**: note the
   *server*, *port* and *Login*. The password is NOT shown by default —
   click **Generate a new SMTP key** (name e.g. `Supabase`, variant
   **Standard**, expiry **No expiration**), then **copy the full key
   immediately** — it is displayed exactly once and only the last digits
   remain visible afterwards (lost key ⇒ generate a new one and update
   Supabase).
3. **Supabase → Authentication → Emails → SMTP settings → Enable custom
   SMTP**, then:

   | Field | Value |
   | --- | --- |
   | Sender email | the verified From address (must match Brevo's exactly) |
   | Sender name | `Whimlet` |
   | Host | `smtp-relay.brevo.com` |
   | Port | `587` |
   | Username | the **Login** value from step 2 (often `1234567@smtp-brevo.com` — not necessarily your account email) |
   | Password | the **Master password / SMTP key** (not your login password, not the v3 API key) |

4. **Save**, then test: **Authentication → Users → ⋯ → Send confirmation
   email** (or sign up on the live site). With custom SMTP on, the **Email
   Templates** editor unlocks on every plan — paste the two blocks from
   [`email-templates.md`](email-templates.md).

## Order tracking (customer-facing)

- **Admin → Orders → "New order from WhatsApp"** mirrors a WhatsApp order onto
  the board; if you type the customer's sign-in email, the order is **linked**
  to their account and shows a green "linked" badge.
- A linked order appears in that customer's **`/account` → Orders** with a live
  status — they watch New → In progress → Ready → Done there. (They can never
  edit or delete it; customers only have `select` on their own orders.)
- A signed-in customer can also tap **"Start tracking"** on `/account` to
  mirror their own custom enquiry (creates an order stamped with their `uid`).
- The customer read path is the **`security_invoker` view**
  `orders_status_history` — the `orders` RLS policy stays the real boundary.

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
