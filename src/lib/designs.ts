/**
 * Customer saved-designs store — the Supabase-backed part of "customers can
 * save designs, up to 5 each, and must delete or download one to save a new
 * one". The cap is also enforced server-side by the `enforce_design_cap`
 * trigger (supabase/schema.sql) so no client can exceed it; the client checks
 * it too for a friendly message before a round-trip.
 */

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase";
import { describeDesign, encodeDesign, type DesignConfig } from "./design";
import type { Database, Json } from "./database.types";

export const MAX_SAVED_DESIGNS = 5;

export type SavedDesign = {
  id: string;
  user_id: string;
  name: string;
  summary: string | null;
  config: DesignConfig;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
};

export type SaveDesignResult = { ok: true; id: string } | { ok: false; error: string; limit?: boolean };

let cached: ReturnType<typeof createClient<Database>> | null = null;
export function supabaseClient() {
  if (!cached) cached = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}

/** Save a design for the signed-in user (session required; enforced by RLS). */
export async function saveDesign(config: DesignConfig, name?: string): Promise<SaveDesignResult> {
  const sb = supabaseClient();
  const { data: session } = await sb.auth.getSession();
  if (!session.session) return { ok: false, error: "Sign in to save designs." };

  const cleanName = (name && name.trim().slice(0, 60)) || describeDesign(config);
  const { error } = await sb.from("saved_designs").insert({
    name: cleanName,
    summary: describeDesign(config),
    config: config as unknown as Json,
  })
    .select("id")
    .single();
  if (error) {
    const limit = /SAVE_LIMIT/i.test(error.message);
    return { ok: false, error: limit ? `You can save up to ${MAX_SAVED_DESIGNS} designs — delete or download one first.` : error.message, limit };
  }
  return { ok: true, id: "" };
}

export async function listDesigns(): Promise<SavedDesign[]> {
  const sb = supabaseClient();
  const { data, error } = await sb.from("saved_designs").select("*").order("updated_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as SavedDesign[];
}

export async function deleteDesign(id: string): Promise<{ error: string | null }> {
  const sb = supabaseClient();
  const { error } = await sb.from("saved_designs").delete().eq("id", id);
  return { error: error ? error.message : null };
}

export async function countDesigns(): Promise<number> {
  const sb = supabaseClient();
  const { count, error } = await sb.from("saved_designs").select("id", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}

export function designShareUrl(config: DesignConfig): string {
  return `/studio?design=${encodeDesign(config)}`;
}

/* ------------------------------------------------------------------ *
 * Orders — a customer can watch the status of the WhatsApp orders the
 * shop has mirrored for them (the admin "New order" form links by email).
 * Reading goes through the `orders_status_history` view, which is
 * security_invoker + RLS-scoped to the caller, so even a hand-crafted
 * query can only ever return that customer's own rows.
 * ------------------------------------------------------------------ */

export type CustomerOrder = {
  id: string;
  status: string;
  customer_name: string | null;
  created_at: string;
  updated_at: string;
};

export async function listMyOrders(): Promise<CustomerOrder[]> {
  const sb = supabaseClient();
  const { data, error } = await sb
    .from("orders_status_history")
    .select("id, status, customer_name, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as CustomerOrder[];
}

/** Signed-in customers mirror their own enquiry as a trackable order. */
export async function recordCustomerOrder(name: string, phone: string, notes: string): Promise<{ error: string | null }> {
  const sb = supabaseClient();
  const { data: session } = await sb.auth.getSession();
  if (!session.session) return { error: "Sign in to track orders." };
  const { error } = await sb.rpc("record_customer_order_v1", {
    p_name: name,
    p_phone: phone,
    p_notes: notes,
  });
  return { error: error ? error.message : null };
}
