import type { Metadata } from "next";
import { StudioApp } from "@/components/studio/StudioApp";
import { decodeDesign, describeDesign, describeShort } from "@/lib/design";

const baseDescription =
  "Design your own crochet flower or bouquet in 3D — petals, colours, patterns, wrap, ribbon, butterflies and more — then send it straight to Whimlet.";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * A shared `?design=` link previews as *that* design (title + description)
 * in chat apps, not as the generic studio page. `decodeDesign` runs the same
 * strict sanitiser as the client, so a bad code simply falls back.
 */
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const raw = sp.design;
  const code = Array.isArray(raw) ? raw[0] : raw;
  const design = code ? decodeDesign(code) : null;
  if (!design) {
    return { title: "3D Design Studio | Whimlet", description: baseDescription, robots: { index: true, follow: true } };
  }
  const short = describeShort(design);
  const title = `${short[0].toUpperCase()}${short.slice(1)} — a Whimlet design`;
  const description = `Someone designed ${describeDesign(design)}. Open it in the 3D studio to tweak it or order your own.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", url: `/studio?design=${encodeURIComponent(code!)}` },
    twitter: { card: "summary_large_image", title, description },
    // shared links are personal — keep them out of search results
    robots: { index: false, follow: true },
  };
}

export default function StudioPage() {
  return <StudioApp />;
}
