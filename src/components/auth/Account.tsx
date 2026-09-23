"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { listMyOrders, recordCustomerOrder, supabaseClient, type CustomerOrder } from "@/lib/designs";
import { withBasePath } from "@/lib/paths";
import { encodeDesign, type DesignConfig } from "@/lib/design";
import { useAuth } from "./AuthProvider";

/**
 * /account — the signed-in customer's space.
 *
 *  • Designs (≤ 5): open a saved design back into the studio, open a copy,
 *    download a .whimlet.json or delete it to make room for a new one.
 *  • Orders: watch the status of the WhatsApp orders the shop has mirrored
 *    for you, and record a custom order from the website so it joins that
 *    list. Reading uses the RLS-scoped `orders_status_history` view, so this
 *    UI (and any hand-rolled client query) can only ever see your own rows.
 */

const LIMIT = 5;

type Row = { id: string; name: string; summary: string | null; config: unknown; thumbnail: string | null; updated_at: string };

const ORDER_STATUSES: { value: string; label: string; tone: string }[] = [
  { value: "new", label: "New", tone: "bg-rose/15 text-rose-ink" },
  { value: "in_progress", label: "In progress", tone: "bg-butter/70 text-cocoa" },
  { value: "ready", label: "Ready", tone: "bg-sky/70 text-cocoa" },
  { value: "done", label: "Done", tone: "bg-sage/60 text-cocoa" },
  { value: "cancelled", label: "Cancelled", tone: "bg-white/70 text-cocoa-soft" },
];
const statusMeta = (s: string) => ORDER_STATUSES.find((o) => o.value === s) ?? { value: s, label: s, tone: "bg-white/70 text-cocoa-soft" };

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

type Tab = "designs" | "orders";

export function Account() {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("designs");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabaseClient().from("saved_designs").select("*").order("updated_at", { ascending: false });
    setRows(error ? [] : ((data ?? []) as Row[]));
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  if (loading) return <AccountShell note="…" />;
  if (!user) {
    // Next's router is already basePath-aware (no withBasePath here).
    router.replace("/signin");
    return <AccountShell note="Signing in…" />;
  }

  const remove = async (id: string) => {
    setMsg(null);
    const { error } = await supabaseClient().from("saved_designs").delete().eq("id", id);
    setMsg(error ? error.message : "Deleted — room for a new one ♥");
    load();
  };

  const download = (r: Row) => {
    const blob = new Blob([JSON.stringify({ format: "whimlet-design", name: r.name, config: r.config }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "design"}.whimlet.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-script text-4xl text-cocoa">My Whimlet</h1>
          <p className="mt-1 font-hand text-lg text-cocoa-soft">{user.email}</p>
        </div>
        <div className="flex items-center gap-2.5">
          {role === "admin" && (
            <Link href="/admin" className="btn btn-primary btn-sm">
              Admin panel
            </Link>
          )}
          <button type="button" onClick={() => router.push("/studio")} className="btn btn-outline btn-sm">
            New design
          </button>
          <button type="button" onClick={() => signOut().then(() => router.replace("/"))} className="btn btn-glass btn-sm">
            Sign out
          </button>
        </div>
      </header>

      {/* tabs */}
      <div role="tablist" aria-label="Account sections" className="mt-7 flex gap-2 rounded-full border border-blush-deep/30 bg-white/60 p-1">
        {(
          [
            { id: "designs", label: `Designs${rows !== null ? ` (${rows.length}/${LIMIT})` : ""}` },
            { id: "orders", label: "Orders" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`account-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="account-panel"
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
              tab === t.id ? "bg-blush text-cocoa shadow-sm" : "text-cocoa-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && (
        <p role="status" className="mt-4 rounded-2xl bg-mint/40 px-4 py-2.5 text-sm text-cocoa">
          {msg}
        </p>
      )}

      <main id="account-panel" role="tabpanel" aria-labelledby={`account-tab-${tab}`}>
        {tab === "designs" ? <Designs rows={rows} onRemove={remove} onDownload={download} /> : <Orders />}
      </main>
    </div>
  );
}

/* ---------- Designs shelf ---------- */
function Designs({ rows, onRemove, onDownload }: { rows: Row[] | null; onRemove: (id: string) => void; onDownload: (r: Row) => void }) {
  if (rows === null) return <Empty note="Loading your designs…" />;
  if (rows.length === 0)
    return <Empty note="Nothing saved yet. Design something in the studio and tap “Save to my designs”. Your last five stay here." />;
  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2">
      {rows.map((r, i) => (
        <motion.li
          key={r.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="glass-sheet flex flex-col gap-3 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-script text-2xl leading-tight text-cocoa">{r.name}</p>
              <p className="mt-0.5 text-xs text-cocoa-soft">{r.summary}</p>
            </div>
            <button type="button" onClick={() => onRemove(r.id)} className="btn btn-glass btn-sm shrink-0" aria-label={`Delete ${r.name}`} title="Delete (makes room for a new one)">
              ✕
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={withBasePath(`/studio?design=${encodeDesign(r.config as DesignConfig)}`)} className="btn btn-primary btn-sm">
              Open
            </a>
            <button type="button" onClick={() => onDownload(r)} className="btn btn-glass btn-sm">
              Download
            </button>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

/* ---------- Orders: status history + record-a-custom-order ---------- */
function Orders() {
  const [orders, setOrders] = useState<CustomerOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setOrders(await listMyOrders());
    } catch {
      setError("Couldn't load your orders right now.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (busy) return;
    if (!name.trim()) {
      setNote("Tell us the name your order will be under.");
      return;
    }
    setBusy(true);
    setNote(null);
    const r = await recordCustomerOrder(name.trim(), phone.trim(), notes.trim());
    if (r.error) {
      setNote(r.error);
    } else {
      setName("");
      setNotes("");
      setNote("Order noted — its status appears above once we confirm it. We'll also confirm details in WhatsApp.");
      load();
    }
    setBusy(false);
  };

  return (
    <div className="mt-8">
      {/* record a custom order */}
      <section aria-label="Track a custom order" className="glass-sheet flex flex-col gap-3 p-5 md:p-6">
        <div>
          <p className="font-script text-2xl text-cocoa">Tracking an order?</p>
          <p className="mt-1 text-xs leading-relaxed text-cocoa-soft">
            Custom orders are confirmed over WhatsApp and mirrored here by the shop, so you can watch their progress. If yours hasn't appeared yet, tell us here and we'll link it to your account.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            aria-label="Your name"
            autoComplete="name"
            className="rounded-full border border-blush-deep/30 bg-white/80 px-4 py-2.5 text-sm text-cocoa placeholder:text-cocoa-soft/50 focus:border-rose focus:outline-none"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Phone (optional)"
            aria-label="Phone"
            className="rounded-full border border-blush-deep/30 bg-white/80 px-4 py-2.5 text-sm text-cocoa placeholder:text-cocoa-soft/50 focus:border-rose focus:outline-none"
          />
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="What did you order? (e.g. a blush rose bouquet for my sister's birthday)"
          aria-label="Order details"
          className="w-full resize-none rounded-2xl border border-blush-deep/30 bg-white/80 px-4 py-3 text-sm text-cocoa placeholder:text-cocoa-soft/50 focus:border-rose focus:outline-none"
        />
        {note && (
          <p role="status" className="text-sm font-semibold text-rose-ink">
            {note}
          </p>
        )}
        <button type="button" onClick={submit} disabled={busy} className="btn btn-primary btn-sm self-start disabled:opacity-60">
          {busy ? "Noting…" : "Start tracking"}
        </button>
      </section>

      {/* history */}
      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-rose/10 px-4 py-3 text-sm font-semibold text-rose-ink">
          {error}
        </p>
      )}
      <h2 className="mt-8 font-script text-3xl text-cocoa">Your orders</h2>
      {orders === null ? (
        <Empty note="Loading your orders…" />
      ) : orders.length === 0 ? (
        <Empty note="No orders yet — they'll appear here once we mirror them from WhatsApp, or when you start tracking one above." />
      ) : (
        <ul className="mt-4 grid gap-3">
          {orders.map((o) => {
            const s = statusMeta(o.status);
            return (
              <li key={o.id} className="glass-sheet flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-cocoa">{o.customer_name ?? "Your order"}</p>
                  <p className="mt-0.5 text-xs text-cocoa-soft">Placed {fmtDate(o.created_at)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${s.tone}`}>{s.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------- house components ---------- */
function Empty({ note }: { note: string }) {
  return <p className="mt-8 rounded-2xl border border-dashed border-blush-deep/40 bg-white/40 px-6 py-8 text-center text-sm text-cocoa-soft">{note}</p>;
}

function AccountShell({ note }: { note: string }) {
  return <div className="flex min-h-[60vh] items-center justify-center font-hand text-xl text-cocoa-soft">{note}</div>;
}
