import type { Metadata } from "next";
import { StudioApp } from "@/components/studio/StudioApp";

export const metadata: Metadata = {
  title: "3D Design Studio | Whimlet",
  description:
    "Design your own crochet flower or bouquet in 3D — petals, colours, patterns, wrap, ribbon, butterflies and more — then send it straight to Whimlet.",
  robots: { index: true, follow: true },
};

export default function StudioPage() {
  return <StudioApp />;
}
