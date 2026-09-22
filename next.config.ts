import type { NextConfig } from "next";

/**
 * Two deployment shapes from one codebase:
 *
 *  1. Node (`next build && next start`) — the default. Server features stay
 *     on (e.g. /studio's per-link Open Graph metadata).
 *  2. Static export for GitHub Pages — `NEXT_EXPORT=1 npm run build` writes
 *     `out/`. A *project* Pages site is served under `/<repo>/`, so the
 *     build also gets `basePath`/`assetPrefix` from `NEXT_PUBLIC_BASE_PATH`
 *     (the workflow sets it to `/3Dwebsite`; a user/organisation site or a
 *     custom domain leaves it empty). `trailingSlash` makes every route a
 *     `folder/index.html`, which is what Pages' static file server expects.
 *
 *  3. Whimlet Engine / VPS — `NEXT_STANDALONE=1 npm run build` emits a
 *     self-contained server in `.next/standalone` (Node only, no
 *     node_modules) that `engine/Dockerfile` ships behind Caddy. See
 *     `engine/README.md`.
 *
 * Images are pre-optimized at authoring time via `npm run optimize:images`
 * (ImageMagick: resize + recompress); runtime optimization is off so all
 * shapes need zero native dependencies.
 */
const isExport = process.env.NEXT_EXPORT === "1";
const isStandalone = process.env.NEXT_STANDALONE === "1" && !isExport;
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

/** One year, immutable — for content that is versioned by its file name. */
const IMMUTABLE = "public, max-age=31536000, immutable";
/** A day at the edge, a week stale-while-revalidate — for hand-named assets. */
const ASSET = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  ...(isExport
    ? {
        output: "export",
        trailingSlash: true,
        ...(basePath ? { basePath, assetPrefix: basePath } : {}),
      }
    : {
        ...(isStandalone ? { output: "standalone" as const } : {}),
        // Node/VPS shape: cache policy for the static payload. `/_next/static`
        // is already immutable by default; these cover `public/`. (Static
        // export has no server — GitHub Pages / Caddy set headers there.)
        async headers() {
          return [
            { source: "/images/:path*", headers: [{ key: "Cache-Control", value: ASSET }] },
            { source: "/_next/static/:path*", headers: [{ key: "Cache-Control", value: IMMUTABLE }] },
            {
              source: "/:path*",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "X-Frame-Options", value: "SAMEORIGIN" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                { key: "X-DNS-Prefetch-Control", value: "on" },
                { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
                // HSTS is only valid over HTTPS; GitHub Pages / Caddy own the
                // TLS edge (Caddyfile already sets its own headers), so keep
                // the app-level value conservative for local/dev.
                { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
              ],
            },
          ];
        },
      }),
  env: {
    // make the base path visible to client code (withBasePath helper)
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
