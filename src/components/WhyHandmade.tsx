"use client";

import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { GiftDoodle, HookDoodle, PencilDoodle, SwatchesDoodle } from "./Decorations";

const PRINCIPLES = [
  {
    icon: HookDoodle,
    title: "Made by Hand",
    line: "No machines, no moulds — just hooks, yarn and hours of happy stitching.",
    tint: "bg-blush-soft text-rose",
  },
  {
    icon: PencilDoodle,
    title: "Thoughtfully Designed",
    line: "Each piece is planned with care, down to the last leaf and loop.",
    tint: "bg-lavender/70 text-lavender-deep",
  },
  {
    icon: SwatchesDoodle,
    title: "Customizable",
    line: "Your colours, your size, your idea — made specially for you.",
    tint: "bg-mint text-sage-deep",
  },
  {
    icon: GiftDoodle,
    title: "Made with Care",
    line: "Finished and wrapped like a little gift, because details matter.",
    tint: "bg-butter text-dusty",
  },
] as const;

/** "Why Handmade?" — four quiet principles. */
export function WhyHandmade() {
  return (
    <section id="why" className="polka relative py-20 md:py-28">
      <div className="wrap">
        <SectionHeading
          eyebrow="the handmade difference"
          title="Why"
          accent="Handmade?"
          lead="Slow-made things carry something machines can't measure."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08} className="h-full">
              <article className="card-clay group flex h-full flex-col items-center gap-4 p-7 text-center transition-transform duration-500 hover:-translate-y-1.5 hover:rotate-[-1deg]">
                <span className={`flex h-16 w-16 items-center justify-center rounded-full shadow-clay-sm transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6 ${p.tint}`}>
                  <p.icon className="h-7 w-7" />
                </span>
                <h3 className="text-lg font-bold text-cocoa">{p.title}</h3>
                <p className="text-sm leading-relaxed text-cocoa-soft">{p.line}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
