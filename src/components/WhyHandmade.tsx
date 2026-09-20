"use client";

import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { GiftDoodle, HookDoodle, PencilDoodle, SwatchesDoodle } from "./Decorations";

const PRINCIPLES = [
  {
    icon: HookDoodle,
    title: "Made by Hand",
    line: "No machines, no moulds — just hooks, yarn and hours of happy stitching.",
  },
  {
    icon: PencilDoodle,
    title: "Thoughtfully Designed",
    line: "Each piece is planned with care, down to the last leaf and loop.",
  },
  {
    icon: SwatchesDoodle,
    title: "Customizable",
    line: "Your colours, your size, your idea — made specially for you.",
  },
  {
    icon: GiftDoodle,
    title: "Made with Care",
    line: "Finished and wrapped like a little gift, because details matter.",
  },
] as const;

/** "Why Handmade?" — four quiet principles. */
export function WhyHandmade() {
  return (
    <section id="why" className="relative bg-cream/70 py-20 md:py-28">
      <div className="wrap">
        <SectionHeading
          eyebrow="the handmade difference"
          title={
            <>
              Why <span className="font-script font-normal text-rose">Handmade?</span>
            </>
          }
          lead="Slow-made things carry something machines can't measure."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08} className="h-full">
              <article className="card group flex h-full flex-col items-center gap-4 p-7 text-center transition-all duration-500 hover:-translate-y-1.5 hover:shadow-soft">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blush-soft text-rose transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
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
