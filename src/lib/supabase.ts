/**
 * Supabase client configuration.
 *
 * The publishable (anon) key is PUBLIC BY DESIGN — it identifies the
 * project, not a person, and only reaches rows that Row Level Security
 * policies (supabase/schema.sql) allow. The secret/service-role key must
 * never appear anywhere in this repo or in a NEXT_PUBLIC_* variable.
 */

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hbimqkdirfvmhitkuiqe.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_C8nLv5qLVlXWMeJO2i7t_w_ix29PZ3a";

export const isSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Constant-time string compare (timing-safe-ish) — for the admin-bootstrap
 *  passphrase. Not authentication; only remember-the-flag UX. */
export function safeEqual(a: string, b: string): boolean {
  const x = (a ?? "").slice(0, 512);
  const y = (b ?? "").slice(0, 512);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
