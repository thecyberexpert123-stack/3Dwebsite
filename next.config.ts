import type { NextConfig } from "next";

/**
 * Images are pre-optimized at authoring time via `npm run optimize:images`
 * (ImageMagick: resize + recompress). Runtime optimization is disabled so a
 * production `next start` has zero extra native dependencies. If you deploy to
 * a platform with image optimization (e.g. Vercel), you may remove this flag.
 */
const nextConfig: NextConfig = {
  images: { unoptimized: true },
};

export default nextConfig;
