"use client";

import { useRef, type ReactNode } from "react";
import { useDesktopPointer } from "@/lib/hooks";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * Beat — the transition *between* sections.
 *
 * As a section scrolls out at the top it peels away: a shallow perspective
 * tilt around its bottom edge (so the seam with the next section never
 * opens), a small lift and a fade to ~0.65. The incoming section arrives
 * flat and full-strength underneath. One move, reused for every section,
 * so the page reads as pages being turned rather than a long strip of
 * colour. Sections keep their own inner choreography (reveals, parallax).
 *
 * Desktop pointer devices only: on phones every section is a huge
 * compositor layer and a scroll-linked transform on each is exactly the
 * kind of "smooth" that costs frames; touch already has inertia. Reduced
 * motion → identity. `z` keeps earlier sections above later ones so the
 * scalloped trims still hang over the next section once transforms create
 * stacking contexts.
 */
export function Beat({ children, z = 1, className = "" }: { children: ReactNode; z?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const on = useDesktopPointer();

  // 0 while the section's bottom edge is below 70 % of the viewport … 1 once it has left
  const { scrollYProgress } = useScroll({ target: ref, offset: ["end 70%", "end start"] });
  const active = on && !reduce;
  const rotateX = useTransform(scrollYProgress, [0, 1], [0, active ? -5 : 0]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, active ? 0.65 : 1]);
  const y = useTransform(scrollYProgress, [0, 1], [0, active ? 28 : 0]);

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, opacity, y, transformPerspective: 1400, transformOrigin: "50% 100%", zIndex: z }}
      className={`relative ${className}`}
    >
      {children}
    </motion.div>
  );
}
