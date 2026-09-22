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
 * Images are pre-optimized at authoring time via `npm run optimize:images`
 * (ImageMagick: resize + recompress); runtime optimization is off so both
 * shapes need zero native dependencies.
 */
const isExport = process.env.NEXT_EXPORT === "1";
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  ...(isExport
    ? {
        output: "export",
        trailingSlash: true,
        ...(basePath ? { basePath, assetPrefix: basePath } : {}),
      }
    : {}),
  env: {
    // make the base path visible to client code (withBasePath helper)
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
