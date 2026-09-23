import type { MetadataRoute } from "next";
import { absoluteUrl, withBasePath } from "@/lib/paths";

// static: also emitted by the GitHub Pages export (`output: "export"`)
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: withBasePath("/"),
        disallow: [withBasePath("/admin"), withBasePath("/account"), withBasePath("/signin"), withBasePath("/owner")],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
