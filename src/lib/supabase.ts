/**
 * Supabase client configuration.
 *
 * The publishable (anon) key is PUBLIC BY DESIGN — it identifies the
 * project, not a person, and only reaches rows that Row Level Security
 * policies (supabase/schema.sql) allow. The secret/service-role key must
 * never appear anywhere in this repo or in a NEXT_PUBLIC_* variable.
 */

/** An unset secret reaches the build as "" (empty string is NOT nullish, so
 *  `?? fallback` would silently keep ""). Treat "" as "not configured" and
 *  fall back to the project defaults — otherwise `createClient("", "")`
 *  throws during static prerender. */
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const SUPABASE_URL = envUrl && envUrl.length > 0 ? envUrl : "https://hbimqkdirfvmhitkuiqe.supabase.co";
export const SUPABASE_ANON_KEY =
  envKey && envKey.length > 0 ? envKey : "sb_publishable_C8nLv5qLVlXWMeJO2i7t_w_ix29PZ3a";

export const isSupabaseConfigured = Boolean(envUrl && envUrl.length > 0) && Boolean(envKey && envKey.length > 0);

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
