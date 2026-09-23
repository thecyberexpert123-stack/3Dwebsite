-- ============================================================================
-- Whimlet · Supabase setup (run ONCE in the SQL editor, then once again any
-- time the schema changes). Safe to re-run: every statement is idempotent.
--
-- What it creates:
--   • three profile roles (admin / customer) driven by `app_metadata.user_role`
--   • a `profiles` table mirroring auth.users (name + role + soft delete)
--   • `saved_designs` — a customer can SAVE up to 5 designs and must delete or
--     download one before saving a 6th (MAX_SAVED_DESIGNS trigger)
--   • `orders` + `order_items` — WhatsApp orders mirrored by an admin
--   • `leads` (customer messages) and `testimonials` (site content)
--   • `admin_overview_v1` — a one-query RPC for the dashboard
--   • one RLS policy set + the triggers that enforce them
--
-- SECURITY MODEL (read this, it is the whole point):
--   The publishable key ships in the browser and identifies the *project*,
--   not a person. Every table is write-controlled by Row Level Security
--   policies keyed to:
--     auth.uid()                 → the signed-in user's id
--     is_admin()                 → only admins (users whose metadata says so)
--   There is NO policy that grants anon (not signed in) any row access, so
--   even someone holding the publishable key can see nothing without an
--   authenticated session whose JWT carries `sub` + `user_role`.
--
-- AFTER RUNNING: create your own admin user at /signin (the form shows "make
--   me the admin" as a passphrase → then set user_role = 'admin' on that row
--   in the dashboard, OR leave it and grant yourself with the SET CURRENT
--   USER statement in the comments below).
-- ============================================================================

-- helpers ---------------------------------------------------------------
-- NOTE — the role claim lives INSIDE app_metadata. Our grant SQL writes
-- `raw_app_meta_data.user_role`, which Supabase embeds in the JWT as
-- `app_metadata.user_role`. Reading a top-level `auth.jwt() ->> 'user_role'`
-- is therefore always NULL here (that path needs a custom auth-hook, which
-- we do not run) — it made is_admin() silently false for the real admin.
create or replace function public.get_user_role()
returns text language sql stable security definer set search_path = auth, public as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'user_role', 'customer')
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.get_user_role() = 'admin'
$$;

-- profiles ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  user_role text not null default 'customer' check (user_role in ('customer','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: select own or admin" on public.profiles;
create policy "profiles: select own or admin" on public.profiles for select
  using (public.is_admin() or id = auth.uid());

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin" on public.profiles for update
  using (public.is_admin() or id = auth.uid());

-- keep new auth.users in sync with a profile row -----------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, user_role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_app_meta_data ->> 'user_role', 'customer')
  )
  on conflict (id) do update set
    email = excluded.email,
    user_role = excluded.user_role,
    updated_at = now();
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_claimed_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_claimed_at();

-- Hardening: clients may edit their own profile ROW, but never the columns
-- that carry authorization or identity. `user_role` is the mirror of the JWT
-- claim that RLS trusts (is_admin() reads the JWT, so a forged profile value
-- never grants anything) — but letting a customer paint themselves "admin"
-- in the table would corrupt admin lists/stats and mislead support. The
-- database-only sync (public.handle_new_user, which runs as its OWNER
-- `postgres`) is the ONLY writer allowed to touch these two columns; every
-- PostgREST client runs as `authenticated`/`anon` and gets them preserved.
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_user <> 'postgres' then
    new.user_role := old.user_role;
    new.email := old.email;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- saved_designs (customers: save up to 5 designs) -----------------------------
create table if not exists public.saved_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  summary text,
  config jsonb not null,
  thumbnail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint name_len check (char_length(name) <= 60)
);

alter table public.saved_designs enable row level security;

create index if not exists saved_designs_user_idx on public.saved_designs (user_id);
create index if not exists saved_designs_created_idx on public.saved_designs (created_at desc);

drop policy if exists "designs: select own or admin" on public.saved_designs;
create policy "designs: select own or admin" on public.saved_designs for select
  using (public.is_admin() or user_id = auth.uid());

drop policy if exists "designs: insert own" on public.saved_designs;
create policy "designs: insert own" on public.saved_designs for insert
  with check (user_id = auth.uid());

drop policy if exists "designs: update own or admin" on public.saved_designs;
create policy "designs: update own or admin" on public.saved_designs for update
  using (public.is_admin() or user_id = auth.uid());

drop policy if exists "designs: delete own or admin" on public.saved_designs;
create policy "designs: delete own or admin" on public.saved_designs for delete
  using (public.is_admin() or user_id = auth.uid());

create or replace function public.saved_designs_set_updated()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists saved_designs_set_updated_at on public.saved_designs;
create trigger saved_designs_set_updated_at
  before update on public.saved_designs
  for each row execute function public.saved_designs_set_updated();

-- the 5-design cap, enforced in the database (no client can exceed it) --------
create or replace function public.enforce_design_cap()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.saved_designs where user_id = new.user_id) >= 5 then
    raise exception 'SAVE_LIMIT: you have reached the 5 design limit; delete or download a saved design first';
  end if;
  return new;
end $$;

drop trigger if exists enforce_design_cap_trigger on public.saved_designs;
create trigger enforce_design_cap_trigger
  before insert on public.saved_designs
  for each row execute function public.enforce_design_cap();

-- Hardening: a design's `config` must be a JSON object (never a bare scalar /
-- array — the studio always writes an object) and is capped at 200 KB, so a
-- hostile client can't bloat rows or smuggle non-design payloads through the
-- save path. `name` is already capped at 60 chars in the column definition.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'saved_designs_config_object'
      and table_schema = 'public' and table_name = 'saved_designs'
  ) then
    execute 'alter table public.saved_designs
      add constraint saved_designs_config_object check (jsonb_typeof(config) = ''object'')';
  end if;
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'saved_designs_config_size'
      and table_schema = 'public' and table_name = 'saved_designs'
  ) then
    execute 'alter table public.saved_designs
      add constraint saved_designs_config_size check (octet_length(config::text) <= 200000)';
  end if;
end $$;

-- orders + items (WhatsApp orders mirrored by an admin) ----------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete set null,
  status text not null default 'new' check (status in ('new','in_progress','ready','done','cancelled')),
  customer_name text,
  customer_phone text,
  notes text,
  source text not null default 'whatsapp',
  total_cents integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_idx on public.orders (created_at desc);

drop policy if exists "orders: admins all" on public.orders;
create policy "orders: admins all" on public.orders for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders: customers read own" on public.orders;
create policy "orders: customers read own" on public.orders for select
  using (customer_id = auth.uid());

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  design_name text,
  config jsonb,
  quantity integer not null default 1,
  notes text
);

alter table public.order_items enable row level security;

drop policy if exists "order_items: admins all" on public.order_items;
create policy "order_items: admins all" on public.order_items for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_items: customers read own" on public.order_items;
create policy "order_items: customers read own" on public.order_items for select
  using (order_id in (select id from public.orders where customer_id = auth.uid()));

create or replace function public.orders_set_updated()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.orders_set_updated();

-- Admin helper: mirror a WhatsApp order onto the board, and — when the email
-- matches a known account — LINK it to that customer so the customer can
-- watch its status on /account. SECURITY DEFINER (needs to reach auth.users),
-- so it re-checks the caller's own claim before touching anything. A forged
-- caller cannot use it to attach rows they lack; the insert still lands in
-- `orders`, which the caller only sees via the admin policy they had to pass.
create or replace function public.create_order_from_chat(
  p_customer_email text, p_customer_name text, p_customer_phone text,
  p_notes text, p_total_cents integer
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
begin
  if not public.is_admin() then
    raise exception 'create_order_from_chat: admin role required';
  end if;

  if p_customer_email is not null and btrim(p_customer_email) <> '' then
    select id into v_customer_id
      from auth.users
     where email = lower(btrim(p_customer_email))
     limit 1;
  end if;

  insert into public.orders (customer_id, customer_name, customer_phone, notes, source, total_cents)
  values (
    v_customer_id,
    nullif(btrim(p_customer_name), ''),
    nullif(btrim(p_customer_phone), ''),
    nullif(btrim(p_notes), ''),
    'whatsapp',
    p_total_cents
  )
  returning id into v_order_id;

  return jsonb_build_object('id', v_order_id, 'linked', v_customer_id is not null);
end $$;

revoke all on function public.create_order_from_chat(text, text, text, text, integer) from anon, authenticated, public;
grant execute on function public.create_order_from_chat(text, text, text, text, integer) to authenticated;

-- A signed-in CUSTOMER can mirror their own enquiry as an order. The
-- authorization is written right here (SECURITY DEFINER would otherwise
-- bypass RLS): only non-admin, authenticated callers may run it, and the row
-- is stamped with THEIR uid. The row stays admin-scoped afterwards (customers
-- can read it, never edit/delete it).
create or replace function public.record_customer_order_v1(
  p_name text, p_phone text, p_notes text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if public.get_user_role() = 'admin' then
    raise exception 'record_customer_order_v1: the shop owner records orders from the admin panel';
  end if;
  if auth.uid() is null then
    raise exception 'record_customer_order_v1: sign in required';
  end if;
  insert into public.orders (customer_id, customer_name, customer_phone, notes, source)
  values (
    auth.uid(),
    coalesce(nullif(btrim(p_name), ''), (select name from public.profiles where id = auth.uid()), 'Customer'),
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_notes), ''),
    'website'
  )
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;

revoke all on function public.record_customer_order_v1(text, text, text) from anon, authenticated, public;
grant execute on function public.record_customer_order_v1(text, text, text) to authenticated;

-- Customer-facing pre-filtered order history (their own rows, safe columns).
-- security_invoker keeps the underlying orders RLS policy authoritative.
create or replace view public.orders_status_history
with (security_invoker = on) as
  select id, customer_id, status, customer_name,
         created_at, updated_at
    from public.orders;

-- leads (customer messages) --------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text,
  message text,
  status text not null default 'new' check (status in ('new','seen','replied','closed')),
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_created_idx on public.leads (created_at desc);

drop policy if exists "leads: admins all" on public.leads;
create policy "leads: admins all" on public.leads for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "leads: insert own (signed in)" on public.leads;
create policy "leads: insert own (signed in)" on public.leads for insert
  with check (user_id = auth.uid());

drop policy if exists "leads: select own (signed in)" on public.leads;
create policy "leads: select own (signed in)" on public.leads for select
  using (user_id = auth.uid());

-- Hardening: bound the free-text fields so a hostile client can't stuff
-- megabytes into a single enquiry row (name ≤ 80, message ≤ 4000).
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'leads_name_len'
      and table_schema = 'public' and table_name = 'leads'
  ) then
    execute 'alter table public.leads add constraint leads_name_len check (char_length(name) between 1 and 80)';
  end if;
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'leads_message_len'
      and table_schema = 'public' and table_name = 'leads'
  ) then
    execute 'alter table public.leads add constraint leads_message_len check (message is null or char_length(message) <= 4000)';
  end if;
end $$;

-- testimonials (site content; admin-managed) ----------------------------------
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  author text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;

drop policy if exists "testimonials: select approved (public)" on public.testimonials;
create policy "testimonials: select approved (public)" on public.testimonials for select
  using (approved = true);

drop policy if exists "testimonials: admins all" on public.testimonials;
create policy "testimonials: admins all" on public.testimonials for all
  using (public.is_admin()) with check (public.is_admin());

-- products (catalog; admin-managed) ------------------------------------------
create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  blurb text,
  description text,
  image text,
  alt text,
  price_cents integer,
  stock integer,
  customizable boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "products: select active (public)" on public.products;
create policy "products: select active (public)" on public.products for select
  using (active = true);

drop policy if exists "products: admins all" on public.products;
create policy "products: admins all" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

-- dashboard RPC (admins only — a single query for the overview) ---------------
-- SECURITY DEFINER runs this with the function owner's rights, so it bypasses
-- RLS. The table-level policies do NOT apply, which is why the very first
-- statement re-checks the caller's claim: `grant execute to authenticated`
-- below therefore only decides who may *try*, while `is_admin()` decides who
-- may succeed. A signed-in customer calling this gets an error, not the counts.
create or replace function public.admin_overview_v1()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'admin_overview_v1: admin role required';
  end if;

  return (
    select jsonb_build_object(
      'orders',        coalesce((select count(*) from public.orders), 0),
      'orders_new',    coalesce((select count(*) from public.orders where status = 'new'), 0),
      'orders_in_progress', coalesce((select count(*) from public.orders where status = 'in_progress'), 0),
      'leads_new',     coalesce((select count(*) from public.leads where status = 'new'), 0),
      'leads',         coalesce((select count(*) from public.leads), 0),
      'customers',     coalesce((select count(*) from public.profiles where user_role = 'customer'), 0),
      'designs',       coalesce((select count(*) from public.saved_designs), 0),
      'testimonials',  coalesce((select count(*) from public.testimonials), 0),
      'testimonials_pending', coalesce((select count(*) from public.testimonials where approved = false), 0),
      'products',      coalesce((select count(*) from public.products where active), 0),
      'revenue_cents', coalesce((select sum(total_cents) from public.orders where status in ('ready','done')), 0)
    )
  );
end;
$$;

revoke all on function public.admin_overview_v1() from anon, authenticated, public;
grant execute on function public.admin_overview_v1() to authenticated;

-- grant the app role the table surface ---------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.saved_designs to authenticated;
grant select, insert, update, delete on public.orders, public.order_items, public.leads, public.testimonials, public.products to authenticated;
grant select on public.products to anon;
grant select on public.orders_status_history to authenticated;
grant execute on function public.is_admin(), public.get_user_role(), public.admin_overview_v1() to authenticated;

-- Hardening: Postgres grants EXECUTE to PUBLIC by default on every function.
-- The role accessors are only ever used by signed-in requests (RLS policies
-- evaluated by `authenticated`) and, internally, by the definer functions,
-- so shrink their audience to `authenticated`. `admin_overview_v1` was already
-- revoked-by-default above and re-granted to `authenticated` only.
revoke execute on function public.is_admin(), public.get_user_role() from public, anon;

-- ============================================================================
-- MAKING YOURSELF AN ADMIN (after you have signed in at /signin once)
-- Run this once with YOUR email plugged in:
--
--   update auth.users
--      set raw_app_meta_data = raw_app_meta_data || '{"user_role": "admin"}'
--    where email = 'you@example.com';
--
-- then log out / back in so the JWT refreshes with the new claim.
-- ============================================================================
