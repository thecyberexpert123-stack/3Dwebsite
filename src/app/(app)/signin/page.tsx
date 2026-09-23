import type { Metadata } from "next";
import { SignIn } from "@/components/auth/SignIn";

export const metadata: Metadata = {
  title: "Sign in | Whimlet",
  description: "Sign in to Whimlet to save your designs, track orders and manage the shop.",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return <SignIn />;
}
