import type { Metadata } from "next";
import { MakerApp } from "@/components/maker/MakerApp";

export const metadata: Metadata = {
  title: "Whimlet Maker — free-form 3D crochet design",
  description:
    "Build any crochet piece from soft shapes — balls, eggs, tubes, hearts, petals — move, mirror and sculpt them in 3D, then send the design to Whimlet to be made by hand.",
  alternates: { canonical: "/maker" },
  openGraph: {
    title: "Whimlet Maker — design anything, we crochet it",
    description: "A small, friendly Blender for crochet: shapes, gizmos, sculpt brushes, yarn estimates — straight to WhatsApp.",
    type: "website",
    url: "/maker",
  },
};

/**
 * `/maker` is a pure client application (the document lives in the URL,
 * localStorage and downloaded files), so the page itself is static —
 * which also keeps it exportable for GitHub Pages.
 */
export default function MakerPage() {
  return <MakerApp />;
}
