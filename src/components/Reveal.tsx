"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useState, type ReactNode } from "react";

/** The one easing curve used by every reveal on the page. */
export const EASE = [0.22, 1, 0.36, 1] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

/** Soft scroll-reveal that respects prefers-reduced-motion.
 *  Adds `is-inview` once visible so CSS-only flourishes inside (e.g. the
 *  hand-drawn `.u-hand` underline) can play on the same beat. */
export function Reveal({ children, className, delay = 0, y = 26 }: RevealProps) {
  const reduce = useReducedMotion();
  const [seen, setSeen] = useState(false);

  return (
    <motion.div
      className={`${className ?? ""}${seen ? " is-inview" : ""}`}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      onViewportEnter={() => setSeen(true)}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------
   TextReveal — words rise out of a clipping line, one after another.
   Reserved for headings: the *first* thing a section says should
   arrive with intent; everything else uses the quiet Reveal above.
   ------------------------------------------------------------------ */

const lineVariants: Variants = {
  hidden: {},
  show: (stagger: number) => ({ transition: { staggerChildren: stagger, delayChildren: 0.05 } }),
};

const wordVariants: Variants = {
  hidden: { y: "110%", rotate: 3, opacity: 0 },
  show: { y: "0%", rotate: 0, opacity: 1, transition: { duration: 0.75, ease: EASE } },
};

export function TextReveal({
  text,
  className,
  as: Tag = "span",
  stagger = 0.07,
}: {
  text: string;
  className?: string;
  as?: "span" | "h2" | "h3" | "p";
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  const MotionTag = motion[Tag];
  // Same DOM structure whether or not motion is reduced — the server cannot
  // know the preference, and a structural branch here is a hydration mismatch.
  // Reduced motion simply gets no variants (words render in place).
  return (
    <MotionTag
      className={className}
      variants={reduce ? undefined : lineVariants}
      custom={stagger}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      aria-label={text}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom" aria-hidden="true">
          <motion.span variants={reduce ? undefined : wordVariants} className="inline-block will-change-transform">
            {w}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}
