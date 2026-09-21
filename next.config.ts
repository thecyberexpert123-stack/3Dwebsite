import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  allowedDevOrigins: ["*.e2b.app", "*.app.github.dev", "localhost"],
  devIndicators: false,
};

export default nextConfig;
