"use client";

import { useRef, type ReactNode } from "react";
import { useDesktopPointer } from "@/lib/hooks";
import { motion, useReducedMotion, useScroll, useTransform, useSpring } from "framer-motion";

/**
 * Beat 2.0 — CINEMATIC SECTION TRANSITIONS
 * 
 * Research from best sites (Shopify Editions, Cartier):
 * - Scroll as narrative device, not just reveal
 * - Each section should feel like turning a page in a storybook
 * - Transitions need weight, not just fade
 * 
 * Upgrades:
 * - Yarn stitch wipe: as section leaves, a dashed line sews across top edge
 * - Depth peel with perspective + subtle scale + fabric texture
 * - Spring physics for natural feel (not linear)
 * - Parallax inside: content moves at different speeds
 * - Reduced motion: simple fade only
 */

export function Beat({ children, z = 1, className = "" }: { children: ReactNode; z?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const on = useDesktopPointer();

  const { scrollYProgress } = useScroll({ target: ref, offset: ["end 75%", "end 10%"] });
  const active = on && !reduce;
  
  // Spring for natural motion
  const springProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, mass: 0.8 });
  
  const rotateX = useTransform(springProgress, [0, 1], [0, active ? -6 : 0]);
  const opacity = useTransform(springProgress, [0, 0.7, 1], [1, 1, active ? 0.6 : 1]);
  const y = useTransform(springProgress, [0, 1], [0, active ? 32 : 0]);
  const scale = useTransform(springProgress, [0, 1], [1, active ? 0.98 : 1]);
  const filter = useTransform(springProgress, [0, 1], ["blur(0px)", active ? "blur(0.5px)" : "blur(0px)"]);

  // Stitch wipe progress
  const stitchProgress = useTransform(springProgress, [0, 0.5], [0, 1]);

  return (
    <motion.div
      ref={ref}
      style={{ 
        rotateX, 
        opacity, 
        y, 
        scale,
        filter: active ? filter : undefined,
        transformPerspective: 1600, 
        transformOrigin: "50% 100%", 
        zIndex: z,
        willChange: active ? "transform, opacity, filter" : "auto"
      }}
      className={`relative ${className}`}
    >
      {/* Yarn stitch wipe that draws across top as section exits */}
      {active && (
        <motion.div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[3px] overflow-hidden"
          style={{ opacity: useTransform(springProgress, [0, 0.2, 1], [0, 1, 0]) }}
        >
          <motion.div
            className="h-full w-full"
            style={{
              background: `repeating-linear-gradient(90deg, var(--color-rose) 0px, var(--color-rose) 8px, transparent 8px, transparent 14px)`,
              scaleX: stitchProgress,
              transformOrigin: "left",
            }}
          />
          {/* Small yarn ball that rolls along stitch line */}
          <motion.div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-rose shadow-sm"
            style={{
              left: useTransform(stitchProgress, [0, 1], ["0%", "100%"]),
              x: "-50%",
            }}
          />
        </motion.div>
      )}
      
      {/* Subtle fabric texture overlay that fades as section leaves */}
      {active && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            opacity: useTransform(springProgress, [0, 1], [0.015, 0]),
          }}
        />
      )}
      
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

/**
 * Enhanced Beat with parallax layers inside
 */
export function BeatWithParallax({ 
  children, 
  z = 1, 
  className = "",
  parallax = 0.3
}: { 
  children: ReactNode; 
  z?: number; 
  className?: string;
  parallax?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const on = useDesktopPointer();

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const active = on && !reduce;
  
  const y = useTransform(scrollYProgress, [0, 1], [active ? parallax * 100 : 0, active ? -parallax * 100 : 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, active ? 0.7 : 1]);

  return (
    <div ref={ref} className={`relative ${className}`} style={{ zIndex: z }}>
      <motion.div style={{ y, opacity }}>
        {children}
      </motion.div>
    </div>
  );
}
