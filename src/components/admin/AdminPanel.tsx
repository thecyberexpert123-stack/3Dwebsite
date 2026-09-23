"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabaseClient } from "@/lib/designs";
import { useRealtimeVersion } from "@/lib/useRealtime";

/**
 * /admin — shop management, built phone-first (same layout, reflowed not
 * removed) and desktop-comfortable. Role is read from the JWT
 * (app_metadata.user_role); the database enforces the same claim again in
 * RLS, so this client check only decides what UI to paint — it is not the
 * security boundary.
 *
 * Phone behaviour (deliberate):
 *  - the section "tabs" become a horizontal scroll rail (never a 2–3 row
 *    wrap of chips that crawls down a 390 px screen);
 *  - the orders/catalog *tables* are gone — every row is a card that stacks,
 *    with full-width native <select> / inputs (the OS picker, the OS number
 *    pad), so nothing forces a two-thumb pinch;
 *  - the header (title + sign-out) stays reachable — sticky on touch.
 */

/* ---------- domain types (mirror supabase/schema.sql columns) ---------- */
type Order = { id: string; status: string; customer_name: string | null; customer_phone: string | null; notes: string | null; total_cents: number | null; created_at: string };
type Lead = { id: string; name: string; phone: string | null; message: string | null; status: string; created_at: string };
type Product = { id: string; name: string; category: string; price_cents: number | null; stock: number | null; active: boolean };
type Testimonial = { id: string; quote: string; author: string | null; approved: boolean };

type Tab = "overview" | "orders" | "leads" | "catalog" | "testimonials" | "viewer";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "orders", label: "Orders" },
  { id: "leads", label: "Messages" },
  { id: "catalog", label: "Catalog" },
  { id: "testimonials", label: "Reviews" },
  { id: "viewer", label: "Design viewer" },
];

/* ---------- status vocabularies (label + a soft tone for the badge) -------- */
const ORDER_STATUSES: { value: string; label: string; tone: string }[] = [
  { value: "new", label: "New", tone: "bg-rose/15 text-rose-ink" },
  { value: "in_progress", label: "In progress", tone: "bg-butter/70 text-cocoa" },
  { value: "ready", label: "Ready", tone: "bg-sky/70 text-cocoa" },
  { value: "done", label: "Done", tone: "bg-sage/60 text-cocoa" },
  { value: "cancelled", label: "Cancelled", tone: "bg-white/70 text-cocoa-soft" },
];
const LEAD_STATUSES: { value: string; label: string; tone: string }[] = [
  { value: "new", label: "New", tone: "bg-rose/15 text-rose-ink" },
  { value: "seen", label: "Seen", tone: "bg-sky/70 text-cocoa" },
  { value: "replied", label: "Replied", tone: "bg-sage/60 text-cocoa" },
  { value: "closed", label: "Closed", tone: "bg-white/70 text-cocoa-soft" },
];

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};
const fmtCents = (cents: number) => "₹" + (cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const telHref = (p: string) => "tel:" + p.replace(/[^\d+]/g, "");

export function AdminPanel() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  if (loading) return <Shell note="…" />;
  if (!user) {
    router.replace("/signin");
    return <Shell note="Signing in…" />;
  }

  const roleClaim = ((user.app_metadata ?? {}) as Record<string, unknown>)["user_role"];

  if (roleClaim !== "admin") {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-6">
        <div className="rounded-[1.9rem] border border-white/70 bg-white/70 p-7 text-center shadow-card backdrop-blur-md">
          <p className="font-script text-3xl text-cocoa">This corner is for the shop owner ♥</p>
          <p className="mt-3 text-sm leading-relaxed text-cocoa-soft">
            You&apos;re signed in as a customer. The admin role is a claim on your login, granted with one SQL line in{" "}
            <code className="rounded bg-blush-soft/60 px-1">supabase/README.md</code> — then sign out and back in. The
            client can&apos;t grant it for you, and that&apos;s on purpose: if it could, the panel would be meaningless.
          </p>
          <button type="button" onClick={() => router.push("/account")} className="btn btn-glass btn-sm mt-5">
            Back to my designs
          </button>
        </div>
      </div>
    );
  }

  return <AdminInner tab={tab} setTab={setTab} />;
}

function AdminInner({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const doSignOut = () => signOut().then(() => router.replace("/"));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(2.5rem+var(--sab))] pt-5 md:px-6 md:pt-8">
      {/* header — sticky on touch so "sign out" is never a scroll away */}
      <header className="sticky top-0 z-30 -mx-4 -mt-5 mb-4 bg-ivory/85 px-4 pb-3 pt-3 backdrop-blur-md md:static md:mx-0 md:mt-0 md:mb-6 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.24em] text-rose-ink">Whimlet · shop</p>
              <h1 className="font-script text-3xl leading-none text-cocoa md:text-4xl">The Yarn Room</h1>
            </div>
            {user?.email && (
              <span className="hidden max-w-[16rem] truncate rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-cocoa-soft sm:inline-block">
                {user.email}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="btn btn-glass btn-sm hidden md:inline-flex">
              ← Back to the shop
            </Link>
            <button type="button" onClick={doSignOut} className="btn btn-outline btn-sm">
              Sign out
            </button>
          </div>
        </div>

        {/* section tabs — a scroll rail on phones, a wrapped row on desktop */}
        <div
          role="tablist"
          aria-label="Admin sections"
          className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:mt-4 md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                id={`admin-tab-${t.id}`}
                aria-selected={active}
                aria-controls="admin-panel-body"
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active ? "bg-rose-ink text-white shadow-card" : "bg-white/70 text-cocoa-soft hover:bg-white"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main id="admin-panel-body" role="tabpanel" aria-labelledby={`admin-tab-${tab}`}>
        <TabBody tab={tab} />
      </main>
    </div>
  );
}

function TabBody({ tab }: { tab: Tab }) {
  switch (tab) {
    case "overview":
      return <Overview />;
    case "orders":
      return <Orders />;
    case "leads":
      return <Leads />;
    case "catalog":
      return <Catalog />;
    case "testimonials":
      return <Testimonials />;
    case "viewer":
      return <ViewerLink />;
  }
}

/* ---------- shared list/data hook: rows + error + reload on realtime -------- */
function useAdminRows<T>(table: string, orderBy: string, ascending = false) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const version = useRealtimeVersion(table, true);

  const reload = useCallback(async () => {
    setError(null);
    const q = supabaseClient().from(table).select("*").order(orderBy, { ascending });
    const { data, error: e } = await q;
    if (e) {
      setError(e.message);
    } else {
      setRows((data ?? []) as T[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, orderBy, ascending]);

  useEffect(() => {
    reload();
  }, [reload, version]);

  return { rows, error, reload };
}

/* ---------- pieces ---------- */
function ViewerLink() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/viewer");
  }, [router]);
  return <Shell note="Opening the design viewer…" />;
}

function Overview() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const version = useRealtimeVersion("orders", true);

  useEffect(() => {
    setError(null);
    supabaseClient()
      .rpc("admin_overview_v1")
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        else setStats((data ?? null) as Record<string, number> | null);
      });
  }, [version]);

  const cards: { key: string; label: string; money?: boolean }[] = [
    { key: "orders", label: "Orders" },
    { key: "orders_new", label: "New orders" },
    { key: "orders_in_progress", label: "Being made" },
    { key: "leads", label: "Messages" },
    { key: "leads_new", label: "Unread messages" },
    { key: "customers", label: "Customers" },
    { key: "designs", label: "Saved designs" },
    { key: "products", label: "Active products" },
    { key: "testimonials_pending", label: "Reviews to approve" },
    { key: "revenue_cents", label: "Revenue est.", money: true },
  ];

  return (
    <div>
      {error && <ErrorNote error={error} onRetry={() => setStats(null)} />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        {cards.map(({ key, label, money }) => {
          const v = stats?.[key];
          return (
            <div key={key} className="glass-sheet p-3.5 lg:p-4">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-cocoa-soft lg:text-xs">{label}</p>
              <p className="mt-1.5 font-script text-2xl leading-none text-cocoa lg:text-3xl">
                {stats === null ? "…" : v === undefined ? "—" : money ? fmtCents(v) : v.toLocaleString("en-IN")}
              </p>
            </div>
          );
        })}
      </div>
      {stats !== null && !error && (
        <p className="mt-4 text-xs text-cocoa-soft">
          {stats.orders === 0 ? "A fresh countertop — orders and messages will gather here as they come in over WhatsApp." : "Counts refresh live as the shop moves."}
        </p>
      )}
    </div>
  );
}

function StatusSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; tone: string }[];
}) {
  const tone = options.find((o) => o.value === value)?.tone ?? "bg-white/70 text-cocoa-soft";
  return (
    <label className="relative block">
      <span className="sr-only">Status</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none rounded-full border border-blush-deep/30 py-1.5 pl-3 pr-8 text-xs font-semibold focus:border-rose focus:outline-none ${tone}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-soft">
        <svg viewBox="0 0 12 8" className="h-2.5 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 1.5 6 6l4.5-4.5" />
        </svg>
      </span>
    </label>
  );
}

function Orders() {
  const { rows, error, reload } = useAdminRows<Order>("orders", "created_at");

  const setStatus = async (id: string, status: string) => {
    await supabaseClient().from("orders").update({ status }).eq("id", id);
  };

  return (
    <section aria-label="Orders">
      {error && <ErrorNote error={error} onRetry={reload} />}
      <ul className="grid gap-3 lg:gap-4">
        {(rows ?? []).map((o) => (
          <li key={o.id} className="glass-sheet flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-cocoa">{o.customer_name ?? "Walk-in customer"}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-cocoa-soft">
                  <span>{fmtDate(o.created_at)}</span>
                  {o.customer_phone && <a href={telHref(o.customer_phone)} className="font-semibold text-rose-ink underline-offset-2 hover:underline">{o.customer_phone}</a>}
                </p>
              </div>
              {o.total_cents != null && <p className="shrink-0 font-script text-2xl leading-none text-cocoa">{fmtCents(o.total_cents)}</p>}
            </div>
            {o.notes && <p className="rounded-2xl bg-white/60 px-3 py-2 text-sm leading-relaxed text-cocoa-soft">{o.notes}</p>}
            <div className="max-w-[15rem]">
              <StatusSelect value={o.status} onChange={(v) => setStatus(o.id, v)} options={ORDER_STATUSES} />
            </div>
          </li>
        ))}
      </ul>
      {!error && rows && rows.length === 0 && <Empty note="No orders yet. Mirror a WhatsApp order here and it appears on this board." />}
      {!error && rows === null && <Skeleton />}
    </section>
  );
}

function Leads() {
  const { rows, error, reload } = useAdminRows<Lead>("leads", "created_at");

  const setStatus = async (id: string, status: string) => {
    await supabaseClient().from("leads").update({ status }).eq("id", id);
  };

  return (
    <section aria-label="Messages">
      {error && <ErrorNote error={error} onRetry={reload} />}
      <ul className="grid gap-3 lg:gap-4">
        {(rows ?? []).map((l) => (
          <li key={l.id} className="glass-sheet flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-cocoa">
                  {l.name}
                  {l.phone && (
                    <a href={telHref(l.phone)} className="ml-2 text-xs font-semibold text-rose-ink underline-offset-2 hover:underline">
                      {l.phone}
                    </a>
                  )}
                </p>
                <p className="text-xs text-cocoa-soft">{fmtDate(l.created_at)}</p>
              </div>
              <div className="w-28 shrink-0">
                <StatusSelect value={l.status} onChange={(v) => setStatus(l.id, v)} options={LEAD_STATUSES} />
              </div>
            </div>
            {l.message && <p className="text-sm leading-relaxed text-cocoa-soft">{l.message}</p>}
          </li>
        ))}
      </ul>
      {!error && rows && rows.length === 0 && <Empty note="No messages yet. Messages from the enquiry forms land here." />}
      {!error && rows === null && <Skeleton />}
    </section>
  );
}

function Catalog() {
  const { rows, error, reload } = useAdminRows<Product>("products", "name");

  const seed = async () => {
    const { products } = await import("@/data/products");
    const seedRows = products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      blurb: p.blurb,
      description: p.description,
      image: p.image,
      alt: p.alt,
      customizable: p.customizable,
    }));
    await supabaseClient().from("products").upsert(seedRows);
  };

  const patch = async (id: string, values: Partial<Product>) => {
    await supabaseClient().from("products").update(values).eq("id", id);
  };

  // number editors: read the DOM on blur (no local state → no clobber while
  // typing, no re-render churn); empty field = clear to NULL.
  const saveNumber = (id: string, field: "price_cents" | "stock", raw: string, scale: number) => {
    const t = raw.trim();
    if (t === "") return patch(id, { [field]: null } as Partial<Product>);
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0) return; // ignore garbage; commit next valid blur
    patch(id, { [field]: Math.round(n * scale) } as Partial<Product>);
  };

  return (
    <section aria-label="Catalog">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs text-cocoa-soft">Prices and stock you set here show in the shop (price in whole rupees).</p>
        <button type="button" onClick={seed} className="btn btn-outline btn-sm shrink-0">
          Seed from catalog file
        </button>
      </div>
      {error && <ErrorNote error={error} onRetry={reload} />}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {(rows ?? []).map((p) => (
          <li key={p.id} className="glass-sheet flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-cocoa">{p.name}</p>
                <p className="mt-0.5 truncate text-[0.68rem] font-bold uppercase tracking-[0.16em] text-rose-ink">{p.category}</p>
              </div>
              <button
                type="button"
                aria-pressed={p.active}
                onClick={() => patch(p.id, { active: !p.active })}
                className={`btn btn-sm shrink-0 ${p.active ? "btn-primary" : "btn-outline"}`}
              >
                {p.active ? "Live" : "Hidden"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[0.62rem] font-bold uppercase tracking-wide text-cocoa-soft">Price (₹)</span>
                <input
                  key={`${p.id}-price-${p.price_cents ?? "null"}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  defaultValue={p.price_cents != null ? (p.price_cents / 100).toString() : ""}
                  onBlur={(e) => saveNumber(p.id, "price_cents", e.target.value, 100)}
                  placeholder="—"
                  className="mt-1 w-full rounded-full border border-blush-deep/30 bg-white/80 px-3 py-1.5 text-sm text-cocoa placeholder:text-cocoa-soft/50 focus:border-rose focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[0.62rem] font-bold uppercase tracking-wide text-cocoa-soft">In stock</span>
                <input
                  key={`${p.id}-stock-${p.stock ?? "null"}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  defaultValue={p.stock != null ? String(p.stock) : ""}
                  onBlur={(e) => saveNumber(p.id, "stock", e.target.value, 1)}
                  placeholder="—"
                  className="mt-1 w-full rounded-full border border-blush-deep/30 bg-white/80 px-3 py-1.5 text-sm text-cocoa placeholder:text-cocoa-soft/50 focus:border-rose focus:outline-none"
                />
              </label>
            </div>
          </li>
        ))}
      </ul>
      {!error && rows && rows.length === 0 && <Empty note="No products here yet — seed them from the catalog file." />}
      {!error && rows === null && <Skeleton />}
    </section>
  );
}

function Testimonials() {
  const { rows, error, reload } = useAdminRows<Testimonial>("testimonials", "created_at");
  const [quote, setQuote] = useState("");
  const [author, setAuthor] = useState("");
  const [busy, setBusy] = useState(false);

  const approve = async (id: string, approved: boolean) => {
    await supabaseClient().from("testimonials").update({ approved }).eq("id", id);
  };
  const add = async () => {
    if (!quote.trim() || busy) return;
    setBusy(true);
    try {
      await supabaseClient().from("testimonials").insert({ quote: quote.trim(), author: author.trim() || null, approved: false });
      setQuote("");
      setAuthor("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Reviews">
      <div className="glass-sheet mb-4 flex flex-col gap-2 p-3 sm:flex-row sm:p-4">
        <input
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder="Customer quote"
          aria-label="Customer quote"
          className="flex-1 rounded-full border border-blush-deep/30 bg-white/80 px-4 py-2 text-sm text-cocoa placeholder:text-cocoa-soft/50 focus:border-rose focus:outline-none"
        />
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Name (optional)"
          aria-label="Review author"
          className="rounded-full border border-blush-deep/30 bg-white/80 px-4 py-2 text-sm text-cocoa placeholder:text-cocoa-soft/50 focus:border-rose focus:outline-none sm:w-44"
        />
        <button type="button" onClick={add} disabled={busy || !quote.trim()} className="btn btn-primary btn-sm disabled:opacity-60">
          Add
        </button>
      </div>
      {error && <ErrorNote error={error} onRetry={reload} />}
      <ul className="grid gap-3">
        {(rows ?? []).map((t) => (
          <li key={t.id} className="glass-sheet flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-cocoa">&ldquo;{t.quote}&rdquo;</p>
              {t.author && <p className="mt-0.5 text-xs text-cocoa-soft">— {t.author}</p>}
            </div>
            <button
              type="button"
              onClick={() => approve(t.id, !t.approved)}
              className={`btn btn-sm self-start sm:self-auto ${t.approved ? "btn-glass" : "btn-outline"}`}
            >
              {t.approved ? "Live ✓" : "Approve"}
            </button>
          </li>
        ))}
      </ul>
      {!error && rows && rows.length === 0 && <Empty note="No reviews yet. Approve the ones you trust to appear on the site." />}
      {!error && rows === null && <Skeleton />}
    </section>
  );
}

/* ---------- house components ---------- */
function Shell({ note }: { note: string }) {
  return <div className="flex min-h-[60vh] items-center justify-center font-hand text-xl text-cocoa-soft">{note}</div>;
}

function Empty({ note }: { note: string }) {
  return <p className="rounded-2xl border border-dashed border-blush-deep/40 bg-white/40 px-6 py-8 text-center text-sm text-cocoa-soft">{note}</p>;
}

function Skeleton() {
  return (
    <div className="grid gap-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass-sheet animate-pulse p-4">
          <div className="h-4 w-2/5 rounded-full bg-blush-soft/80" />
          <div className="mt-2.5 h-3 w-3/5 rounded-full bg-blush-soft/60" />
        </div>
      ))}
    </div>
  );
}

function ErrorNote({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <p role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-rose/10 px-4 py-3 text-sm font-semibold text-rose-ink">
      <span>Couldn&apos;t load: {error}</span>
      <button type="button" onClick={onRetry} className="btn btn-outline btn-sm">
        Retry
      </button>
    </p>
  );
}
