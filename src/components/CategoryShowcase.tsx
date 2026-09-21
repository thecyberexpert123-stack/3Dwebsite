"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useDesktopPointer } from "@/lib/hooks";
import { showcaseCategories } from "@/data/categories";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { ArrowDoodle, BowDoodle } from "./Decorations";

const SHAPES = [
  { radius: "3rem 2rem 3.25rem 2rem", rotate: "-rotate-2", lift: "md:translate-y-6", frame: "bg-blush-soft", bow: "text-rose-ink", shadow: "shadow-[0_12px_32px_-12px_rgba(224,122,154,0.35)]" },
  { radius: "2rem 3rem 2rem 3.25rem", rotate: "rotate-1", lift: "md:-translate-y-2", frame: "bg-lavender/70", bow: "text-lavender-deep", shadow: "shadow-[0_12px_32px_-12px_rgba(184,155,230,0.35)]" },
  { radius: "3.25rem 2rem 2.75rem 2.25rem", rotate: "-rotate-1", lift: "md:translate-y-8", frame: "bg-mint", bow: "text-sage-deep", shadow: "shadow-[0_12px_32px_-12px_rgba(127,174,146,0.35)]" },
  { radius: "2.25rem 2.75rem 2rem 3rem", rotate: "rotate-2", lift: "md:translate-y-0", frame: "bg-butter", bow: "text-dusty", shadow: "shadow-[0_12px_32px_-12px_rgba(231,199,122,0.35)]" },
  { radius: "3rem 2.25rem 3rem 2.75rem", rotate: "-rotate-[1.5deg]", lift: "md:translate-y-5", frame: "bg-sky", bow: "text-rose-ink", shadow: "shadow-[0_12px_32px_-12px_rgba(160,200,230,0.35)]" },
] as const;

export function CategoryShowcase() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 95%", "start 35%"] });
  const spread = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.5 });
  const bgY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);

  return (
    <section id="collections" ref={ref} className="ivory-bloom relative overflow-hidden py-24 md:py-32">
      {/* ambient orbs */}
      <motion.div style={{ y: bgY }} aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-20 h-[400px] w-[400px] rounded-full bg-lavender/15 blur-[80px]" />
        <div className="absolute -right-20 bottom-20 h-[500px] w-[500px] rounded-full bg-blush/15 blur-[100px]" />
      </motion.div>

      <div className="wrap relative">
        <SectionHeading
          eyebrow="browse the little shop"
          title="Find Your"
          accent="Little Something"
          lead="Five little worlds of crochet — pick the one that feels most like you (or the person you're gifting)."
        />

        <div className="mt-14 flex flex-wrap justify-center gap-5 md:gap-7">
          {showcaseCategories.map((cat, i) => {
            const shape = SHAPES[i % SHAPES.length];
            return (
              <FanCard
                key={cat.id}
                index={i}
                total={showcaseCategories.length}
                spread={spread}
                reduce={!!reduce}
                className={`w-[calc(50%-0.65rem)] sm:w-56 md:w-60 lg:w-[13.5rem] ${shape.lift}`}
              >
                <a
                  href="#shop"
                  className={`group relative block transition-transform duration-500 ease-out hover:-translate-y-2 hover:rotate-0 ${shape.rotate}`}
                  aria-label={`Shop ${cat.title}`}
                >
                  <BowDoodle
                    className={`absolute -top-4 left-1/2 z-10 h-9 w-9 -translate-x-1/2 drop-shadow-sm transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110 ${shape.bow}`}
                  />
                  <div
                    className={`relative aspect-[4/5] overflow-hidden p-2 transition-all duration-500 group-hover:shadow-lift ${shape.frame} ${shape.shadow}`}
                    style={{ borderRadius: shape.radius }}
                  >
                    <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: `calc(${shape.radius.split(" ")[0]} - 0.5rem)` }}>
                      <Image
                        src={cat.image}
                        alt={cat.alt}
                        fill
                        sizes="(min-width: 768px) 240px, 45vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
                      />
                      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-cocoa/60 via-cocoa/15 to-transparent" />
                      {/* light sheen on hover */}
                      <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(at_30%_20%,rgba(255,255,255,0.35),transparent_60%)]" />
                      <span className="absolute left-4 top-4 -rotate-3 font-hand text-lg text-white/95 drop-shadow-sm">
                        {cat.note}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <h3 className="text-lg font-bold text-white drop-shadow-sm">{cat.title}</h3>
                        <p className="mt-0.5 text-[0.8rem] leading-snug text-white/85">{cat.description}</p>
                        <span className="mt-2 inline-flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-blush transition-transform duration-300 group-hover:translate-x-1">
                          Explore <ArrowDoodle className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </a>
              </FanCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FanCard({
  index,
  total,
  spread,
  reduce,
  className,
  children,
}: {
  index: number;
  total: number;
  spread: MotionValue<number>;
  reduce: boolean;
  className: string;
  children: React.ReactNode;
}) {
  const desktop = useDesktopPointer(768);
  const k = index - (total - 1) / 2;
  const on = desktop && !reduce;
  const x = useTransform(spread, [0, 1], [on ? -k * 150 : 0, 0]);
  const y = useTransform(spread, [0, 1], [on ? Math.abs(k) * 26 + 40 : 0, 0]);
  const rotate = useTransform(spread, [0, 1], [on ? k * 9 : 0, 0]);
  const opacity = useTransform(spread, [0, 0.35], [on ? 0.6 : 1, 1]);
  const scale = useTransform(spread, [0, 1], [on ? 0.92 : 1, 1]);
  if (!on) {
    return (
      <Reveal delay={index * 0.08} className={className}>
        {children}
      </Reveal>
    );
  }
  return (
    <motion.div style={{ x, y, rotate, opacity, scale, zIndex: total - Math.abs(k) }} className={`relative ${className}`}>
      {children}
    </motion.div>
  );
}
