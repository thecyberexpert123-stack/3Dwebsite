/**
 * Base-path helpers for the GitHub Pages build.
 *
 * On a project Pages site the app lives under `/3Dwebsite/`. `next/link`,
 * the router and the metadata API prefix `basePath` themselves — but raw
 * `<img src>`, `next/image` with `unoptimized` (it deliberately leaves the
 * src alone), `fetch("/…")` and hand-built share URLs do not. Route every
 * such string through `withBasePath()`.
 *
 * `NEXT_PUBLIC_BASE_PATH` is inlined at build time (see next.config.ts);
 * it is "" for the normal Node deployment, so this is a no-op there.
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

/** Absolute origin of the deployment (no base path), e.g. https://user.github.io */
export const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** `/images/x.jpg` → `/3Dwebsite/images/x.jpg` on Pages, unchanged elsewhere. */
export function withBasePath(path: string): string {
  if (!BASE_PATH) return path;
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith(BASE_PATH + "/") || path === BASE_PATH) return path;
  return BASE_PATH + path;
}

/** Full canonical URL for a route, for sitemaps / robots / JSON-LD. */
export function absoluteUrl(path: string): string {
  return SITE_ORIGIN + withBasePath(path);
}
