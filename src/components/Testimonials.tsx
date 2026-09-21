"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { testimonials } from "@/data/testimonials";
import { SectionHeading } from "./SectionHeading";
import { BowDoodle, HeartDoodle, SquiggleDoodle } from "./Decorations";

/* a pinboard: each note has its own paper colour, tilt and pin colour */
const NOTES = [
  { paper: "from-[#fffdf7] to-[#fff0c2]", tilt: -3.5, pin: "#e07a9a", x: "-4%", y: "6%" },
  { paper: "from-[#fffafb] to-[#fde1e8]", tilt: 2.5, pin: "#b89be6", x: "3%", y: "-4%" },
  { paper: "from-[#fbfffd] to-[#d4f1ea]", tilt: -1.5, pin: "#f07c8c", x: "-2%", y: "-6%" },
  { paper: "from-[#fdfbff] to-[#dcccf5]", tilt: 3, pin: "#7fae92", x: "4%", y: "5%" },
] as const;

/**
 * "Kind Words" — a pinboard of little notes.
 *
 * All quotes are visible at once as tilted paper notes pinned to the board;
 * one note is "lifted" at a time (larger, flat, in front) and the lift moves
 * along every 6 s, on hover, or via the dots/arrows. A single carousel card
 * in a wide field read as an empty section; a board reads as *many* people.
 * NOTE: quotes are editable placeholder copy — see src/data/testimonials.ts.
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

  return (
    <section
      id="kind-words"
      className="surface-butter relative overflow-hidden py-20 md:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* the board: a soft cork-coloured pane behind the notes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(78vw,34rem)] w-[min(92vw,58rem)] -translate-x-1/2 -translate-y-[38%] rounded-[3rem] border border-white/70 bg-gradient-to-br from-[#fff6e1]/80 to-[#f9dfc9]/70 shadow-clay"
      />

      <div className="wrap relative flex flex-col items-center gap-10">
        <SectionHeading eyebrow="kind words" title="Little Notes," accent="Big Smiles" />

        <div
          className="relative grid w-full max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2"
          role="region"
          aria-roledescription="carousel"
          aria-label="Kind words"
        >
          {testimonials.map((t, i) => {
            const n = NOTES[i % NOTES.length];
            const lifted = i === index;
            return (
              <motion.button
                key={t.quote}
                type="button"
                onClick={() => setIndex(i)}
                aria-pressed={lifted}
                aria-label={`Show note ${i + 1}`}
                initial={false}
                animate={
                  reduce
                    ? { scale: 1, rotate: 0, x: 0, y: 0 }
                    : { scale: lifted ? 1.04 : 0.96, rotate: lifted ? 0 : n.tilt, x: lifted ? 0 : n.x, y: lifted ? 0 : n.y }
                }
                whileHover={reduce ? undefined : { scale: lifted ? 1.05 : 1, rotate: n.tilt * 0.4 }}
                transition={{ type: "spring", stiffness: 180, damping: 22, mass: 0.6 }}
                style={{ zIndex: lifted ? 2 : 1 }}
                className={`relative flex min-h-[11rem] cursor-pointer flex-col items-start justify-between rounded-[1.6rem] border border-white/80 bg-gradient-to-br p-6 text-left transition-shadow duration-500 md:p-7 ${n.paper} ${
                  lifted ? "shadow-lift" : "shadow-card"
                }`}
              >
                {/* the pin */}
                <span
                  aria-hidden="true"
                  className="absolute -top-2.5 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full shadow-md ring-2 ring-white/80"
                  style={{ background: `radial-gradient(circle at 35% 30%, #fff 0, ${n.pin} 45%, ${n.pin} 100%)` }}
                />
                <span aria-hidden="true" className="absolute right-5 top-4 font-script text-5xl leading-none text-cocoa/10">
                  ”
                </span>
                <p className={`text-pretty font-medium leading-relaxed text-cocoa transition-colors ${lifted ? "text-lg md:text-xl" : "text-base md:text-lg"}`}>
                  “{t.quote}”
                </p>
                <span className="mt-4 flex items-center gap-1.5" aria-hidden="true">
                  {[0, 1, 2].map((k) => (
                    <HeartDoodle key={k} className={`h-3.5 w-3.5 ${lifted ? "text-rose-ink" : "text-rose-ink/50"}`} />
                  ))}
                  <SquiggleDoodle className="ml-2 h-2 w-12 text-blush-deep/70" />
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* controls */}
        <div className="flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + testimonials.length) % testimonials.length)}
            aria-label="Previous kind word"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-rose/40 bg-white/70 text-rose-ink transition-all hover:bg-blush-soft"
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
                className={`h-2.5 rounded-full transition-all duration-300 ${i === index ? "w-7 bg-rose" : "w-2.5 bg-rose/30 hover:bg-rose/60"}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % testimonials.length)}
            aria-label="Next kind word"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-rose/40 bg-white/70 text-rose-ink transition-all hover:bg-blush-soft"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden="true">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="-mt-4 flex items-center gap-2 font-hand text-lg text-rose-ink">
          <BowDoodle className="h-4 w-4" /> a few little notes from happy homes
        </p>
      </div>
    </section>
  );
}
