import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/paths";

// static: also emitted by the GitHub Pages export (`output: "export"`)
export const dynamic = "force-static";

/** /admin is intentionally absent — it is a maker's tool, noindex. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/studio"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/maker"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
