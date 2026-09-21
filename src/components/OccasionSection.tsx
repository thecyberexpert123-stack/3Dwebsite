"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { occasions } from "@/data/occasions";
import { useDesktopPointer } from "@/lib/hooks";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { TiltCard } from "./TiltCard";
import { HeartDoodle, SquiggleDoodle } from "./Decorations";

/* each card leans a different way so the strip reads like photos laid on a
   table, not a carousel */
const TILT = [-2.2, 1.6, -1.2, 2.4, -1.8, 1.2] as const;
const STICKERS = ["for them", "never wilts", "thinking of you", "one of a kind", "just because", "their colour"] as const;

/**
 * "For Every Little Moment" — a sideways stroll.
 *
 * On desktop the section pins and vertical scroll pulls the six occasion
 * cards past the viewport horizontally: the page briefly changes axis, which
 * is the single biggest cue that this beat is *different* from the grids
 * around it. On phones (and under reduced motion) it is a native horizontal
 * scroller with snap points — same content, thumb-driven.
 */
export function OccasionSection() {
  const desktop = useDesktopPointer();
  const reduce = useReducedMotion();
  const pinned = desktop && !reduce;

  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // a touch of spring so the strip glides rather than tracks the wheel notch
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });
  // travel = track width − viewport width; read lazily from CSS var so the
  // transform never needs a resize listener
  const travel = useMotionValue(0);
  const x = useTransform([p, travel], ([v, t]) => -(v as number) * (t as number));
  const progress = useTransform(p, [0, 1], ["0%", "100%"]);

  // travel = track width − viewport width, measured (fonts/padding change it)
  useEffect(() => {
    if (!pinned || !track.current) return;
    const el = track.current;
    const measure = () => travel.set(Math.max(0, el.scrollWidth - window.innerWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pinned, travel]);

  return (
    <section
      id="occasions"
      ref={ref}
      className={`surface-butter relative ${pinned ? "lg:h-[260vh]" : ""}`}
    >
      <div className={`${pinned ? "lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-center" : ""} py-24 md:py-32 ${pinned ? "lg:py-0" : ""}`}>
        <div className="wrap">
          <SectionHeading
            eyebrow="why people order"
            title="For Every"
            accent="Little Moment"
            lead="Gifts, celebrations, ordinary Tuesdays — there's a handmade piece for each of them."
          />
        </div>

        {/* the strip */}
        <div
          className={`mt-12 ${pinned ? "lg:overflow-visible" : "overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"}`}
          data-lenis-prevent-wheel={pinned ? undefined : ""}
          style={pinned ? undefined : { scrollPaddingInline: "max(1.5rem, calc((100vw - 72rem) / 2))" }}
        >
          <motion.div
            ref={track}
            style={pinned ? { x } : undefined}
            className="flex w-max items-stretch gap-6 px-[max(1.5rem,calc((100vw-72rem)/2))] md:gap-8"
          >
            {occasions.map((o, i) => (
              <Reveal key={o.id} delay={pinned ? 0 : (i % 3) * 0.06} className="snap-start">
                <TiltCard max={5}>
                  <article
                    className="group relative aspect-[4/5] w-[17rem] overflow-hidden rounded-[2rem] shadow-card transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift md:w-[19.5rem]"
                    style={{ rotate: `${TILT[i % TILT.length]}deg` }}
                  >
                    <Image
                      src={o.image}
                      alt={o.alt}
                      fill
                      sizes="(min-width: 768px) 312px, 272px"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                    />
                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-cocoa/65 via-cocoa/10 to-transparent" />
                    <span
                      aria-hidden="true"
                      className="sticker absolute left-4 top-4 text-rose-ink"
                      style={{ "--tilt": `${-TILT[i % TILT.length] * 1.5}deg` } as React.CSSProperties}
                    >
                      {STICKERS[i % STICKERS.length]}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                        <HeartDoodle className="h-4 w-4 shrink-0 text-blush" />
                        {o.title}
                      </h3>
                      <p className="mt-1 text-sm leading-snug text-white/85">{o.line}</p>
                    </div>
                  </article>
                </TiltCard>
              </Reveal>
            ))}
          </motion.div>
        </div>

        {/* stitched progress line — the "how far along the table am I" cue */}
        <div className="wrap mt-10 hidden items-center gap-4 lg:flex" aria-hidden="true">
          <SquiggleDoodle className="h-2 w-10 text-blush-deep" />
          <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-blush-deep/25">
            <motion.span style={{ width: progress }} className="absolute inset-y-0 left-0 rounded-full bg-rose" />
          </div>
          <span className="font-hand text-lg text-rose-ink">keep scrolling ♡</span>
        </div>
      </div>
    </section>
  );
}
