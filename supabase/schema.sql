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
create or replace function public.get_user_role()
returns text language sql stable security definer set search_path = auth, public as $$
  select coalesce(auth.jwt() ->> 'user_role', 'customer')
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = auth, public as $$
  select coalesce(auth.jwt() ->> 'user_role', 'customer') = 'admin'
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
create or replace function public.admin_overview_v1()
returns jsonb language sql stable security definer set search_path = public as $$
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
  );
$$;

revoke all on function public.admin_overview_v1() from anon, authenticated, public;
grant execute on function public.admin_overview_v1() to authenticated;

-- grant the app role the table surface ---------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.saved_designs to authenticated;
grant select, insert, update, delete on public.orders, public.order_items, public.leads, public.testimonials, public.products to authenticated;
grant select on public.products to anon;
grant execute on function public.is_admin(), public.get_user_role(), public.admin_overview_v1() to authenticated;

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
