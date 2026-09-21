import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  allowedDevOrigins: ["*.e2b.app", "*.e2b.dev"],
  experimental: {
    // Fix for Next.js 15.5 devtools RSC issue
    optimizePackageImports: ["three", "@react-three/fiber", "@react-three/drei", "framer-motion"],
  },
};

export default nextConfig;
