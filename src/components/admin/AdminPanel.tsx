"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabaseClient } from "@/lib/designs";
import { useRealtimeVersion } from "@/lib/useRealtime";

/** /admin — shop management. Role is read from the JWT (app_metadata.user_role);
 *  the database enforces the same claim again in RLS, so this client check
 *  only decides what UI to paint — it is not the security boundary. */

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
            You're signed in as a customer. The admin role is a claim on your login, granted with one SQL line in{" "}
            <code className="rounded bg-blush-soft/60 px-1">supabase/README.md</code> — then sign out and back in. The client can't grant
            it for you, and that's on purpose: if it could, the panel would be meaningless.
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
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-rose-ink">Whimlet · shop</p>
          <h1 className="font-script text-4xl text-cocoa">The Yarn Room</h1>
        </div>
        <Link href="/" className="btn btn-glass btn-sm">
          ← Back to the shop
        </Link>
      </header>

      <div role="tablist" aria-label="Admin sections" className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id ? "bg-rose-ink text-white" : "bg-white/60 text-cocoa-soft hover:bg-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="mt-6">
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

function ViewerLink() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/viewer");
  }, [router]);
  return <Shell note="Opening the design viewer…" />;
}

function Overview() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const version = useRealtimeVersion("orders", true);
  useEffect(() => {
    supabaseClient().rpc("admin_overview_v1").then(({ data }) => setStats((data ?? null) as Record<string, number> | null));
  }, [version]);
  const cards: [string, string][] = [
    ["orders", "Orders"],
    ["orders_new", "New orders"],
    ["orders_in_progress", "Being made"],
    ["leads", "Messages"],
    ["customers", "Customers"],
    ["designs", "Saved designs"],
    ["products", "Active products"],
    ["testimonials_pending", "Reviews to approve"],
    ["revenue_cents", "Revenue (¢ est.)"],
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(([k, label]) => (
        <div key={k} className="glass-sheet p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa-soft">{label}</p>
          <p className="mt-1 font-script text-3xl text-cocoa">
            {stats ? (k === "revenue_cents" ? `₹${(stats[k] / 100).toFixed(0)}` : stats[k]) : "…"}
          </p>
        </div>
      ))}
    </div>
  );
}

function Orders() {
  const [rows, setRows] = useState<Order[] | null>(null);
  const version = useRealtimeVersion("orders", true);
  useEffect(() => {
    supabaseClient().from("orders").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows((data ?? []) as Order[]));
  }, [version]);

  const setStatus = async (id: string, status: string) => {
    await supabaseClient().from("orders").update({ status }).eq("id", id);
  };

  return (
    <div className="glass-sheet overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-blush-soft/60 text-xs uppercase tracking-wide text-cocoa-soft">
          <tr>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Notes</th>
            <th className="px-4 py-3">Status</th>
            <th className="hidden px-4 py-3 md:table-cell">When</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((o) => (
            <tr key={o.id} className="border-t border-white/70">
              <td className="px-4 py-3">{o.customer_name ?? "—"}</td>
              <td className="px-4 py-3 text-cocoa-soft">{o.notes ?? "—"}</td>
              <td className="px-4 py-3">
                <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="rounded-full border border-blush-deep/30 bg-white/80 px-3 py-1.5 text-xs focus:border-rose focus:outline-none">
                  {["new", "in_progress", "ready", "done", "cancelled"].map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </td>
              <td className="hidden px-4 py-3 text-cocoa-soft md:table-cell">{new Date(o.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
          {rows && rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-cocoa-soft">No orders yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Leads() {
  const [rows, setRows] = useState<Lead[] | null>(null);
  const version = useRealtimeVersion("leads", true);
  useEffect(() => {
    supabaseClient().from("leads").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows((data ?? []) as Lead[]));
  }, [version]);

  const setStatus = async (id: string, status: string) => {
    await supabaseClient().from("leads").update({ status }).eq("id", id);
  };

  return (
    <ul className="grid gap-4">
      {(rows ?? []).map((l) => (
        <li key={l.id} className="glass-sheet flex flex-col gap-2 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold text-cocoa">{l.name}{l.phone ? <span className="font-normal text-cocoa-soft"> · {l.phone}</span> : null}</p>
            <select value={l.status} onChange={(e) => setStatus(l.id, e.target.value)} className="rounded-full border border-blush-deep/30 bg-white/80 px-3 py-1 text-xs focus:border-rose focus:outline-none">
              {["new", "seen", "replied", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <p className="text-sm text-cocoa-soft">{l.message}</p>
        </li>
      ))}
      {rows && rows.length === 0 && <li className="rounded-2xl border border-dashed border-blush-deep/40 bg-white/40 px-6 py-8 text-center text-sm text-cocoa-soft">No messages yet.</li>}
    </ul>
  );
}

function Catalog() {
  const [rows, setRows] = useState<Product[] | null>(null);
  const version = useRealtimeVersion("products", true);
  useEffect(() => {
    supabaseClient().from("products").select("*").order("name").then(({ data }) => setRows((data ?? []) as Product[]));
  }, [version]);

  const seed = async () => {
    const { PRODUCT_CATEGORIES, products } = await import("@/data/products");
    const seedRows = products.map((p) => ({ id: p.id, name: p.name, category: p.category, blurb: p.blurb, description: p.description, image: p.image, alt: p.alt, customizable: p.customizable }));
    await supabaseClient().from("products").upsert(seedRows);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button type="button" onClick={seed} className="btn btn-outline btn-sm">Seed from catalog file</button>
      </div>
      <div className="glass-sheet overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-blush-soft/60 text-xs uppercase tracking-wide text-cocoa-soft">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price (¢)</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Live</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((p) => (
              <tr key={p.id} className="border-t border-white/70">
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3 text-cocoa-soft">{p.category}</td>
                <td className="px-4 py-3">{p.price_cents ?? "—"}</td>
                <td className="px-4 py-3">{p.stock ?? "—"}</td>
                <td className="px-4 py-3">{p.active ? "✓" : "—"}</td>
              </tr>
            ))}
            {rows && rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-cocoa-soft">No products here yet — seed them from the catalog file.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Testimonials() {
  const [rows, setRows] = useState<Testimonial[] | null>(null);
  const version = useRealtimeVersion("testimonials", true);
  const [quote, setQuote] = useState("");
  const [author, setAuthor] = useState("");

  useEffect(() => {
    supabaseClient().from("testimonials").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows((data ?? []) as Testimonial[]));
  }, [version]);

  const approve = async (id: string, approved: boolean) => {
    await supabaseClient().from("testimonials").update({ approved }).eq("id", id);
  };
  const add = async () => {
    if (!quote.trim()) return;
    await supabaseClient().from("testimonials").insert({ quote: quote.trim(), author: author.trim() || null, approved: false });
    setQuote("");
    setAuthor("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-sheet flex flex-col gap-2 p-4 sm:flex-row">
        <input value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Customer quote" className="flex-1 rounded-full border border-blush-deep/30 bg-white/80 px-4 py-2 text-sm focus:border-rose focus:outline-none" />
        <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Name (optional)" className="sm:w-44 rounded-full border border-blush-deep/30 bg-white/80 px-4 py-2 text-sm focus:border-rose focus:outline-none" />
        <button type="button" onClick={add} className="btn btn-primary btn-sm">Add</button>
      </div>
      <ul className="grid gap-3">
        {(rows ?? []).map((t) => (
          <li key={t.id} className="glass-sheet flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm text-cocoa">“{t.quote}”</p>
              {t.author && <p className="text-xs text-cocoa-soft">— {t.author}</p>}
            </div>
            <button type="button" onClick={() => approve(t.id, !t.approved)} className={`btn btn-sm ${t.approved ? "btn-glass" : "btn-outline"}`}>
              {t.approved ? "Live ✓" : "Approve"}
            </button>
          </li>
        ))}
        {rows && rows.length === 0 && <li className="rounded-2xl border border-dashed border-blush-deep/40 bg-white/40 px-6 py-8 text-center text-sm text-cocoa-soft">No reviews yet.</li>}
      </ul>
    </div>
  );
}

function Shell({ note }: { note: string }) {
  return <div className="flex min-h-[60vh] items-center justify-center font-hand text-xl text-cocoa-soft">{note}</div>;
}
