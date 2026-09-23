import type { Metadata } from "next";
import { AdminViewer } from "@/components/studio/AdminViewer";

/**
 * The design-file viewer (formerly `/admin`): open a customer's
 * `.whimlet.json` and see it in 3D with its full spec sheet. Moved here so
 * `/admin` can be the shop-management panel. The viewer opens *local* files
 * and carries no store data, so it stays a plain tool.
 */
export const metadata: Metadata = {
  title: "Design Viewer | Whimlet",
  description: "Open a customer's .whimlet.json design and see it in 3D with its full spec sheet.",
  robots: { index: false, follow: false },
};

export default function AdminViewerPage() {
  return <AdminViewer />;
}
