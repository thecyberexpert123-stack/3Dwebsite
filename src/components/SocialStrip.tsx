"use client";

import { socialPlaceholders } from "@/data/site";
import { Reveal } from "./Reveal";
import { HeartDoodle, SparkleDoodle } from "./Decorations";

/**
 * "More Little Things From Whimlet" — social follow strip.
 * Handles are placeholders until real accounts exist (see src/data/site.ts),
 * so they are intentionally unlinked.
 */
export function SocialStrip() {
  return (
    <section id="follow" className="gingham-pink relative py-16 md:py-20">
      <div className="wrap flex flex-col items-center gap-6 text-center">
        <Reveal className="flex flex-col items-center gap-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-rose-ink">
            <SparkleDoodle className="h-4 w-4" /> come say hi
          </p>
          <h2 className="text-balance text-2xl font-bold tracking-tight text-cocoa md:text-4xl">
            More Little Things <span className="font-script font-normal text-rose-ink">From Whimlet</span>
          </h2>
          <p className="max-w-md text-pretty leading-relaxed text-cocoa-soft">
            New pieces, works-in-progress and behind-the-stitches moments —
            follow along for the everyday whimsy.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <ul className="flex flex-wrap justify-center gap-3">
            {socialPlaceholders.map((s) => (
              <li key={s.label}>
                <span
                  className="flex cursor-default items-center gap-2 rounded-full border border-rose/30 bg-white/70 px-5 py-2.5 text-sm font-bold text-cocoa-soft shadow-card"
                  title="Coming soon"
                  aria-label={`${s.label} — coming soon`}
                >
                  <HeartDoodle className="h-4 w-4 text-rose-ink" />
                  {s.label}
                  <span className="font-hand text-base text-rose-ink">soon</span>
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
