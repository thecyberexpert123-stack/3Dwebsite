"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useMotionValue, useTransform } from "framer-motion";
import { primaryNav, site } from "@/data/site";
import { waLink, waMessages, PHONE_DISPLAY, PHONE_TEL } from "@/lib/whatsapp";
import { HeartDoodle, PhoneDoodle, WhatsAppGlyph, SparkleDoodle } from "./Decorations";
import { lockScroll, unlockScroll } from "@/lib/scroll";

/**
 * Navbar 2.0 — CINEMATIC FLOATING NAV
 * 
 * Research from best sites:
 * - Shopify Editions: nav that feels part of the world, not overlay
 * - Apple: compact on scroll down, expand on up with spring
 * - Lusion: glass morphism with depth
 * 
 * Upgrades:
 * - Dynamic shadow that responds to scroll (more depth when scrolled)
 * - Yarn ball that rolls along progress
 * - Magnetic logo with subtle 3D tilt
 * - Better glass with chromatic edge
 */

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const [hoverLogo, setHoverLogo] = useState(false);
  const lastY = useRef(0);
  const { scrollYProgress } = useScroll();
  const logoRotate = useMotionValue(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      setCompact(y > lastY.current && y > 120);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Cinematic stitch progress with yarn ball */}
      <div className="fixed inset-x-0 top-0 z-[56] h-[4px] pointer-events-none">
        <motion.div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 origin-left bg-gradient-to-r from-blush via-rose to-lavender-deep"
          style={{ scaleX: scrollYProgress }}
        />
        {/* Yarn ball that rolls along progress */}
        <motion.div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-rose shadow-[0_2px_8px_rgba(224,122,154,0.5)]"
          style={{
            left: useTransform(scrollYProgress, [0, 1], ["0%", "100%"]),
            x: "-50%",
            rotate: useTransform(scrollYProgress, [0, 1], [0, 720]),
          }}
        >
          <div className="absolute inset-[2px] rounded-full bg-white/30" />
        </motion.div>
        {/* Dashed stitch line */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, transparent 6px, var(--color-rose) 6px, var(--color-rose) 10px)`,
          }}
        />
      </div>
      
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-5">
        <motion.nav
          aria-label="Primary"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className={`wrap mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full border px-5 shadow-card backdrop-blur-xl transition-all duration-500 md:px-7 ${
            scrolled 
              ? "border-white/80 bg-white/85 shadow-[0_8px_32px_-12px_rgba(74,50,56,0.18),0_2px_8px_-2px_rgba(74,50,56,0.08)]" 
              : "border-white/60 bg-white/60 shadow-[0_4px_20px_-8px_rgba(74,50,56,0.12)]"
          } ${compact ? "py-2.5" : "py-3.5 md:py-4"}`}
          style={{
            transform: `translateY(${compact ? -2 : 0}px)`,
          }}
        >
          {/* Logo with 3D tilt */}
          <motion.a
            href="#home"
            className="flex items-baseline gap-2"
            aria-label="Whimlet — back to top"
            onHoverStart={() => setHoverLogo(true)}
            onHoverEnd={() => setHoverLogo(false)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.span 
              className="font-script text-[1.75rem] leading-none text-cocoa md:text-[2rem]"
              animate={{ rotate: hoverLogo ? [0, -2, 2, 0] : 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              Whimlet
            </motion.span>
            <motion.span
              animate={{ 
                scale: hoverLogo ? 1.2 : 1,
                rotate: hoverLogo ? 15 : 0,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <HeartDoodle className="h-4 w-4 text-rose-ink" />
            </motion.span>
            <motion.span
              className="ml-1 hidden items-center gap-1 rounded-full bg-blush-soft/80 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-rose-ink md:flex"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: scrolled ? 1 : 0, x: scrolled ? 0 : -10 }}
              transition={{ duration: 0.3 }}
            >
              <SparkleDoodle className="h-3 w-3" /> handmade
            </motion.span>
          </motion.a>

          {/* Desktop links with indicator */}
          <ul className="hidden items-center gap-8 md:flex">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <a 
                  className="nav-link group relative flex items-center gap-1.5" 
                  href={item.href}
                >
                  <span>{item.label}</span>
                  <motion.span
                    className="h-1 w-1 rounded-full bg-rose opacity-0 transition-opacity group-hover:opacity-100"
                    initial={{ scale: 0 }}
                    whileHover={{ scale: 1 }}
                  />
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <motion.a
              href={waLink(waMessages.order)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm hidden items-center gap-2 sm:inline-flex"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              <WhatsAppGlyph className="h-4 w-4" strokeWidth={1.8} />
              <span>Order Now</span>
            </motion.a>

            <motion.button
              type="button"
              className="flex h-11 w-11 flex-col items-center justify-center gap-[5px] rounded-full border border-white/70 bg-white/70 shadow-card backdrop-blur-md transition-all hover:bg-white hover:shadow-soft md:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen(true)}
              whileTap={{ scale: 0.92 }}
            >
              <motion.span 
                className="h-[2px] w-5 rounded-full bg-cocoa"
                animate={{ rotate: open ? 45 : 0, y: open ? 3 : 0 }}
              />
              <motion.span 
                className="h-[2px] w-5 rounded-full bg-cocoa"
                animate={{ opacity: open ? 0 : 1 }}
              />
              <motion.span 
                className="h-[2px] w-3 self-center rounded-full bg-rose"
                animate={{ rotate: open ? -45 : 0, y: open ? -3 : 0, width: open ? 20 : 12 }}
              />
            </motion.button>
          </div>
        </motion.nav>
      </header>

      {/* Mobile menu — more cinematic */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-[55] flex flex-col overflow-hidden bg-gradient-to-br from-ivory via-cream to-blush-soft"
            initial={{ opacity: 0, clipPath: "circle(0% at 95% 5%)" }}
            animate={{ opacity: 1, clipPath: "circle(150% at 95% 5%)" }}
            exit={{ opacity: 0, clipPath: "circle(0% at 95% 5%)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Decorative blobs */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute right-[10%] top-[20%] h-[300px] w-[300px] rounded-full bg-lavender/20 blur-[60px]" />
              <div className="absolute bottom-[20%] left-[10%] h-[400px] w-[400px] rounded-full bg-blush/20 blur-[80px]" />
            </div>
            
            <div className="relative flex items-center justify-between px-6 pt-6">
              <span className="font-script text-3xl text-cocoa">Whimlet</span>
              <motion.button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/80 text-cocoa shadow-card backdrop-blur-md"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                autoFocus
                whileHover={{ scale: 1.05, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </motion.button>
            </div>

            <nav aria-label="Mobile" className="relative flex flex-1 flex-col items-center justify-center gap-2">
              {primaryNav.map((item, i) => (
                <motion.a
                  key={item.href}
                  href={item.href}
                  className="group relative rounded-2xl px-8 py-3 text-3xl font-bold text-cocoa transition-colors hover:text-rose-ink"
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, y: 30, rotateX: -20 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ 
                    delay: 0.1 + i * 0.07, 
                    duration: 0.6, 
                    ease: [0.22, 1, 0.36, 1],
                    type: "spring",
                    stiffness: 200
                  }}
                  whileHover={{ scale: 1.05, x: 10 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="relative">
                    {item.label}
                    <motion.span
                      className="absolute -bottom-1 left-0 h-[3px] w-full origin-left bg-gradient-to-r from-rose to-lavender-deep"
                      initial={{ scaleX: 0 }}
                      whileHover={{ scaleX: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </span>
                </motion.a>
              ))}

              <motion.div
                className="mt-10 flex flex-col items-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <a
                  href={waLink(waMessages.order)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-lg gap-2 shadow-lift"
                >
                  <WhatsAppGlyph className="h-5 w-5" strokeWidth={1.8} />
                  Order Now on WhatsApp
                </a>
                <a href={`tel:${PHONE_TEL}`} className="flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-cocoa-soft shadow-card backdrop-blur-sm">
                  <PhoneDoodle className="h-4 w-4 text-rose-ink" /> {PHONE_DISPLAY}
                </a>
                <p className="flex items-center gap-2 font-hand text-xl text-rose-ink">
                  <HeartDoodle className="h-4 w-4" /> {site.closingPhrase} <HeartDoodle className="h-4 w-4" />
                </p>
              </motion.div>
            </nav>
            
            <div className="relative p-6 text-center">
              <p className="text-xs font-medium text-cocoa-soft">Handmade with love • One stitch at a time • Made to make you smile</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
