import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SmoothScroll } from "@/components/SmoothScroll";

/**
 * The marketing site: gift-unwrap door, sticky nav, inertial scroll,
 * footer and the WhatsApp bubble. The (app) group (/studio, /admin) is a
 * clean room without any of this chrome — a tool, not a page.
 */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <LoadingScreen />
      <Navbar />
      <main id="main">{children}</main>
      <Footer />
      <FloatingWhatsApp />
      <SmoothScroll />
    </>
  );
}
