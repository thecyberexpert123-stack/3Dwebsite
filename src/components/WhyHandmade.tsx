"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useDesktopPointer } from "@/lib/hooks";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { GiftDoodle, HookDoodle, PencilDoodle, SwatchesDoodle } from "./Decorations";

const PRINCIPLES = [
  {
    icon: HookDoodle,
    n: "01",
    title: "Made by Hand",
    line: "No machines, no moulds — just hooks, yarn and hours of happy stitching.",
    tint: "bg-blush-soft text-rose-ink",
    card: "from-[#fffafb] to-[#fde1e8]",
  },
  {
    icon: PencilDoodle,
    n: "02",
    title: "Thoughtfully Designed",
    line: "Each piece is planned with care, down to the last leaf and loop.",
    tint: "bg-lavender/70 text-lavender-deep",
    card: "from-[#fdfbff] to-[#e9defa]",
  },
  {
    icon: SwatchesDoodle,
    n: "03",
    title: "Customizable",
    line: "Your colours, your size, your idea — made specially for you.",
    tint: "bg-mint text-sage-deep",
    card: "from-[#fbfffd] to-[#d9f3ec]",
  },
  {
    icon: GiftDoodle,
    n: "04",
    title: "Made with Care",
    line: "Finished and wrapped like a little gift, because details matter.",
    tint: "bg-butter text-dusty",
    card: "from-[#fffdf7] to-[#fff0c2]",
  },
] as const;

/**
 * "Why Handmade?" — a stack of four cards.
 *
 * Each principle is a sticky card; as you scroll, the next one slides up and
 * settles on top while the one beneath shrinks back a step (like postcards
 * being dealt onto a pile). Depth is the axis here — the beat before it
 * went sideways, the grids around it are flat — so the page keeps changing
 * how it moves. Phones and reduced motion get a plain, fully readable stack.
 */
export function WhyHandmade() {
  const desktop = useDesktopPointer(768);
  const reduce = useReducedMotion();
  const stacked = desktop && !reduce;

  return (
    <section id="why" className="ivory-bloom relative py-20 md:py-28">
      <div className="wrap">
        <SectionHeading
          eyebrow="the handmade difference"
          title="Why"
          accent="Handmade?"
          lead="Slow-made things carry something machines can't measure."
        />

        <div className={`mt-14 ${stacked ? "flex flex-col gap-[9vh] pb-[6vh]" : "grid gap-5 sm:grid-cols-2 lg:grid-cols-4"}`}>
          {PRINCIPLES.map((p, i) => (
            <StackCard key={p.title} index={i} total={PRINCIPLES.length} stacked={stacked} {...p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StackCard({
  index,
  total,
  stacked,
  icon: Icon,
  n,
  title,
  line,
  tint,
  card,
}: {
  index: number;
  total: number;
  stacked: boolean;
} & (typeof PRINCIPLES)[number]) {
  const ref = useRef<HTMLDivElement>(null);
  // progress of *this* card from "settled at the top" to "the next has covered it"
  // 0 when this card has just settled at its sticky top … 1 when the next
  // card has fully covered it (one card-height + gap later)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 22%", "end 22%"] });
  const last = index === total - 1;
  const scale = useTransform(scrollYProgress, [0, 1], [1, stacked && !last ? 0.92 : 1]);
  const y = useTransform(scrollYProgress, [0, 1], [0, stacked && !last ? -22 : 0]);
  const opacity = useTransform(scrollYProgress, [0.3, 1], [1, stacked && !last ? 0.45 : 1]);

  const body = (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-[2.25rem] border border-white/80 bg-gradient-to-br p-7 shadow-clay ${card} ${
        stacked ? "min-h-[16rem] flex-row items-center gap-5 px-6 py-8 md:min-h-[20rem] md:gap-8 md:px-10 md:py-10" : "items-center gap-4 text-center"
      }`}
    >
      <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-clay-sm transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 ${tint}`}>
        <Icon className="h-7 w-7" />
      </span>
      <div className={stacked ? "max-w-xl" : ""}>
        {stacked && <p className="font-hand text-xl text-rose-ink">{n}</p>}
        <h3 className={`font-bold text-cocoa ${stacked ? "text-2xl md:text-3xl" : "text-lg"}`}>{title}</h3>
        <p className={`text-cocoa-soft ${stacked ? "mt-2 text-base leading-relaxed md:text-lg" : "text-sm leading-relaxed"}`}>{line}</p>
      </div>
      {stacked && (
        <span aria-hidden="true" className="ml-auto hidden font-script text-[6rem] leading-none text-cocoa/10 md:block">
          {n}
        </span>
      )}
    </article>
  );

  if (!stacked) {
    return (
      <Reveal delay={index * 0.08} className="h-full">
        {body}
      </Reveal>
    );
  }

  return (
    <div ref={ref} className="sticky" style={{ top: `calc(22vh + ${index * 1.1}rem)` }}>
      <motion.div style={{ scale, y, opacity, transformOrigin: "50% 0%" }}>{body}</motion.div>
    </div>
  );
}
