import type { MetadataRoute } from "next";
import { withBasePath } from "@/lib/paths";

/**
 * Web App Manifest — what Android Chrome needs to treat Whimlet as an
 * installable app (home-screen icon, splash, standalone window) and what
 * Bubblewrap reads to build the Play Store shell (see android/README.md).
 *
 * `id` is fixed so a later change of start_url does not become a "new app".
 * `display: standalone` keeps the browser chrome out; `orientation` is left
 * free (the maker is fine in landscape). Colours = the site's own tokens.
 */
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: withBasePath("/"),
    name: "Whimlet — Handmade Crochet",
    short_name: "Whimlet",
    description: "Handmade crochet pieces for gifting, collecting and celebrating. Design your own in 3D and order on WhatsApp.",
    start_url: withBasePath("/?source=pwa"),
    scope: withBasePath("/"),
    display: "standalone",
    background_color: "#FFF6F8",
    theme_color: "#FFF6F8",
    lang: "en",
    dir: "ltr",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: withBasePath("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: withBasePath("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
      { src: withBasePath("/icons/maskable-192.png"), sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: withBasePath("/icons/maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Design Studio", short_name: "Studio", url: withBasePath("/studio/"), icons: [{ src: withBasePath("/icons/icon-192.png"), sizes: "192x192" }] },
      { name: "Whimlet Maker", short_name: "Maker", url: withBasePath("/maker/"), icons: [{ src: withBasePath("/icons/icon-192.png"), sizes: "192x192" }] },
    ],
  };
}
