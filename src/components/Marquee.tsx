"use client";

import { BowDoodle, FlowerDoodle, HeartDoodle } from "./Decorations";

const PHRASES = [
  "handmade with love",
  "custom orders welcome",
  "one stitch at a time",
  "tiny things, happy things",
  "made just for you",
] as const;

/**
 * A soft, slow hand-written marquee — a stitched ribbon of little phrases.
 * Decorative only (aria-hidden); animation is disabled for reduced motion.
 */
export function Marquee() {
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden border-y-2 border-dashed border-blush-deep/40 bg-blush-soft py-4"
    >
      <div className="flex w-max animate-marquee motion-reduce:animate-none">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex items-center">
            {PHRASES.map((phrase, i) => (
              <li key={i} className="flex items-center">
                <span className="whitespace-nowrap px-7 font-hand text-2xl text-cocoa">
                  {phrase}
                </span>
                {i % 3 === 0 ? (
                  <BowDoodle className="h-5 w-5 shrink-0 text-rose" />
                ) : i % 3 === 1 ? (
                  <HeartDoodle className="h-4 w-4 shrink-0 text-strawberry" />
                ) : (
                  <FlowerDoodle className="h-4 w-4 shrink-0 text-lavender-deep" />
                )}
              </li>
            ))}
          </ul>
        ))}
      </div>
      {/* soft edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-blush-soft to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-blush-soft to-transparent" />
    </div>
  );
}
