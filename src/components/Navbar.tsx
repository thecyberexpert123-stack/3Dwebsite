"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { primaryNav, site } from "@/data/site";
import { waLink, waMessages, PHONE_DISPLAY, PHONE_TEL } from "@/lib/whatsapp";
import { HeartDoodle, PhoneDoodle, WhatsAppGlyph } from "./Decorations";

/**
 * Floating translucent navbar: compacts while scrolling down, expands when
 * scrolling back up. Mobile opens a full-screen menu.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      // scrolling down past 140px → compact; scrolling up → expand
      setCompact(y > lastY.current && y > 140);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // scroll lock + Escape while the mobile menu is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-5 md:pt-4">
        <nav
          aria-label="Primary"
          className={`wrap mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full border px-4 shadow-card backdrop-blur-md transition-all duration-500 md:px-6 ${
            scrolled ? "border-white/80 bg-white/80 shadow-soft" : "border-white/60 bg-white/55"
          } ${compact ? "py-2" : "py-3 md:py-3.5"}`}
        >
          {/* logo */}
          <a
            href="#home"
            className="flex items-baseline gap-1.5"
            aria-label="Whimlet — back to top"
          >
            <span className="font-script text-[1.7rem] leading-none text-cocoa md:text-3xl">
              Whimlet
            </span>
            <HeartDoodle className="h-3.5 w-3.5 text-rose animate-heartbeat" />
          </a>

          {/* desktop links */}
          <ul className="hidden items-center gap-7 md:flex">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <a className="nav-link" href={item.href}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2.5">
            <a
              href={waLink(waMessages.order)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm hidden sm:inline-flex"
            >
              Order Now
            </a>

            {/* hamburger */}
            <button
              type="button"
              className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-full border border-white/70 bg-white/60 md:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen(true)}
            >
              <span className="h-[2px] w-4 rounded-full bg-cocoa" />
              <span className="h-[2px] w-4 rounded-full bg-cocoa" />
              <span className="h-[2px] w-2.5 self-center rounded-full bg-rose" />
            </button>
          </div>
        </nav>
      </header>

      {/* ---------- mobile full-screen menu ---------- */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="gingham fixed inset-0 z-[55] flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="flex items-center justify-between px-6 pt-6">
              <span className="font-script text-3xl text-cocoa">Whimlet</span>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/70 text-cocoa"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                autoFocus
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6 6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <nav aria-label="Mobile" className="flex flex-1 flex-col items-center justify-center gap-1">
              {primaryNav.map((item, i) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl px-6 py-2.5 text-2xl font-bold text-cocoa transition-colors hover:text-rose"
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  {item.label}
                </motion.a>
              ))}

              <motion.div
                className="mt-8 flex flex-col items-center gap-3"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.45 }}
              >
                <a
                  href={waLink(waMessages.order)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-lg"
                >
                  <WhatsAppGlyph className="h-5 w-5" strokeWidth={1.8} />
                  Order Now
                </a>
                <a href={`tel:${PHONE_TEL}`} className="flex items-center gap-2 text-sm font-semibold text-cocoa-soft">
                  <PhoneDoodle className="h-4 w-4 text-rose" /> {PHONE_DISPLAY}
                </a>
                <p className="font-hand text-lg text-rose/80">{site.closingPhrase}</p>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
