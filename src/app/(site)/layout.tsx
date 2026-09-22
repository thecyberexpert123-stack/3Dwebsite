import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SmoothScroll } from "@/components/SmoothScroll";

/**
 * The marketing site: signature loader (the wordmark writes itself while
 * the meadow compiles), sticky nav, inertial scroll,
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
      {/* overflow-x: clip (not hidden — sticky must keep working) contains the
          Beat peel: a section tilting out at the top edge projects wider than
          the viewport and would otherwise widen the page's scroll box */}
      <main id="main" className="overflow-x-clip">
        {children}
      </main>
      <Footer />
      <FloatingWhatsApp />
      <SmoothScroll />
    </>
  );
}
