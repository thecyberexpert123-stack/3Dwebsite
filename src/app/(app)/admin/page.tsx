import type { Metadata } from "next";
import { AdminViewer } from "@/components/studio/AdminViewer";

export const metadata: Metadata = {
  title: "Design Viewer | Whimlet",
  description: "Open a customer's .whimlet.json design and see it in 3D with its full spec sheet.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminViewer />;
}
