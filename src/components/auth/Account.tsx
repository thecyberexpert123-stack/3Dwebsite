"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabaseClient } from "@/lib/designs";
import { withBasePath } from "@/lib/paths";
import { encodeDesign, type DesignConfig } from "@/lib/design";
import { useAuth } from "./AuthProvider";

/**
 * /account — the signed-in customer's shelf of saved designs (≤ 5). Also the
 * only live part of the "customer accounts" before the order-history phase:
 * open a design back into the studio, open a copy, download a .whimlet.json
 * or delete it to make room for a new one.
 */
const LIMIT = 5;

type Row = { id: string; name: string; summary: string | null; config: unknown; thumbnail: string | null; updated_at: string };

export function Account() {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();
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
          <h1 className="font-script text-4xl text-cocoa">My little designs</h1>
          <p className="mt-1 font-hand text-lg text-cocoa-soft">
            {user.email} · {rows === null ? "loading…" : `${rows.length} of ${LIMIT} saved`}
          </p>
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

      {msg && (
        <p role="status" className="mt-4 rounded-2xl bg-mint/40 px-4 py-2.5 text-sm text-cocoa">
          {msg}
        </p>
      )}

      {rows === null ? (
        <Empty note="Loading your designs…" />
      ) : rows.length === 0 ? (
        <Empty note="Nothing saved yet. Design something in the studio and tap “Save to my designs”." />
      ) : (
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
                <button type="button" onClick={() => remove(r.id)} className="btn btn-glass btn-sm shrink-0" aria-label={`Delete ${r.name}`} title="Delete (makes room for a new one)">
                  ✕
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={withBasePath(`/studio?design=${encodeDesign(r.config as DesignConfig)}`)} className="btn btn-primary btn-sm">
                  Open
                </a>
                <button type="button" onClick={() => download(r)} className="btn btn-glass btn-sm">
                  Download
                </button>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Empty({ note }: { note: string }) {
  return <p className="mt-10 rounded-2xl border border-dashed border-blush-deep/40 bg-white/40 px-6 py-8 text-center text-sm text-cocoa-soft">{note}</p>;
}

function AccountShell({ note }: { note: string }) {
  return <div className="flex min-h-[60vh] items-center justify-center font-hand text-xl text-cocoa-soft">{note}</div>;
}
