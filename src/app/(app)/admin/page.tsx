import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const metadata: Metadata = {
  title: "Admin | Whimlet",
  description: "Whimlet shop management — orders, leads, products, testimonials and customer designs.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPanel />;
}
