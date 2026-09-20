"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { waLink, waMessages } from "@/lib/whatsapp";
import { WhatsAppGlyph } from "./Decorations";

/**
 * Floating WhatsApp button — bottom-right, gentle entrance, tooltip on
 * desktop, large touch target on mobile. Never visually overpowering.
 */
export function FloatingWhatsApp() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.a
      href={waLink(waMessages.general)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Whimlet on WhatsApp"
      className="group fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-lift md:bottom-7 md:right-7 md:h-16 md:w-16"
      initial={false}
      animate={show ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: show ? 0 : 0 }}
    >
      {/* soft breathing halo */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-[#22c55e]/40 animate-ping [animation-duration:3s]"
      />
      <WhatsAppGlyph className="relative h-7 w-7 md:h-8 md:w-8" strokeWidth={1.7} />

      {/* tooltip (desktop) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-cocoa shadow-soft opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:-translate-x-1 md:block"
      >
        Chat with Whimlet
      </span>
    </motion.a>
  );
}
