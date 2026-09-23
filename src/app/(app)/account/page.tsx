import type { Metadata } from "next";
import { Account } from "@/components/auth/Account";

export const metadata: Metadata = {
  title: "My Whimlet | Whimlet",
  description: "Your saved designs and orders.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <Account />;
}
