"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { testimonials } from "@/data/testimonials";
import { SectionHeading } from "./SectionHeading";
import { HeartDoodle } from "./Decorations";

/**
 * "Kind Words" carousel. NOTE: quotes are editable placeholder copy — see
 * src/data/testimonials.ts. Auto-advances gently; pauses on hover/focus and
 * for prefers-reduced-motion.
 */
export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (paused || reduce) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % testimonials.length), 6000);
    return () => clearInterval(t);
  }, [paused, reduce]);

  const current = testimonials[index];

  return (
    <section
      id="kind-words"
      className="gingham-pink relative overflow-hidden py-20 md:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="wrap flex flex-col items-center gap-10">
        <SectionHeading
          eyebrow="kind words"
          title={
            <>
              Little Notes, <span className="font-script font-normal text-rose">Big Smiles</span>
            </>
          }
        />

        <div
          className="relative w-full max-w-3xl"
          role="region"
          aria-roledescription="carousel"
          aria-label="Kind words"
        >
          <div className="card relative overflow-hidden px-6 py-12 text-center shadow-soft md:px-16 md:py-14">
            <span
              aria-hidden="true"
              className="absolute -top-5 left-6 font-script text-[7rem] leading-none text-blush-deep/40 select-none"
            >
              ”
            </span>

            <div aria-live="polite" className="min-h-[7.5rem] md:min-h-[6rem]">
              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={index}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="relative"
                >
                  <p className="text-pretty text-xl font-medium leading-relaxed text-cocoa md:text-2xl">
                    “{current.quote}”
                  </p>
                  <p className="mt-4 flex items-center justify-center gap-1.5" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <HeartDoodle key={i} className="h-4 w-4 text-rose" />
                    ))}
                  </p>
                </motion.blockquote>
              </AnimatePresence>
            </div>
          </div>

          {/* controls */}
          <div className="mt-6 flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + testimonials.length) % testimonials.length)}
              aria-label="Previous kind word"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-rose/40 bg-white/70 text-rose transition-all hover:bg-blush-soft"
            >
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flex items-center gap-2.5">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Go to kind word ${i + 1}`}
                  aria-current={i === index}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    i === index ? "w-7 bg-rose" : "w-2.5 bg-rose/30 hover:bg-rose/60"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % testimonials.length)}
              aria-label="Next kind word"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-rose/40 bg-white/70 text-rose transition-all hover:bg-blush-soft"
            >
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden="true">
                <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
