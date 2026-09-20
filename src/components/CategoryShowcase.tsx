"use client";

import Image from "next/image";
import { showcaseCategories } from "@/data/categories";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { ArrowDoodle, BowDoodle } from "./Decorations";

/** Per-card organic radii + tilt so nothing feels like a template grid. */
const SHAPES = [
  { radius: "3rem 2rem 3.25rem 2rem", rotate: "-rotate-2", lift: "md:translate-y-6", frame: "bg-blush-soft", bow: "text-rose" },
  { radius: "2rem 3rem 2rem 3.25rem", rotate: "rotate-1", lift: "md:-translate-y-2", frame: "bg-lavender/70", bow: "text-lavender-deep" },
  { radius: "3.25rem 2rem 2.75rem 2.25rem", rotate: "-rotate-1", lift: "md:translate-y-8", frame: "bg-mint", bow: "text-sage-deep" },
  { radius: "2.25rem 2.75rem 2rem 3rem", rotate: "rotate-2", lift: "md:translate-y-0", frame: "bg-butter", bow: "text-dusty" },
  { radius: "3rem 2.25rem 3rem 2.75rem", rotate: "-rotate-[1.5deg]", lift: "md:translate-y-5", frame: "bg-sky", bow: "text-rose" },
] as const;

/** Editorial floating category cards — "Find Your Little Something". */
export function CategoryShowcase() {
  return (
    <section id="collections" className="relative bg-ivory py-24 md:py-32">
      <div className="wrap">
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
              <Reveal
                key={cat.id}
                delay={i * 0.08}
                className={`w-[calc(50%-0.65rem)] sm:w-56 md:w-60 lg:w-[13.5rem] ${shape.lift}`}
              >
                <a
                  href="#shop"
                  className={`group relative block transition-transform duration-500 ease-out hover:-translate-y-2 hover:rotate-0 ${shape.rotate}`}
                  aria-label={`Shop ${cat.title}`}
                >
                  {/* a little bow pinned to the top edge — it wiggles on hover */}
                  <BowDoodle
                    className={`absolute -top-4 left-1/2 z-10 h-9 w-9 -translate-x-1/2 drop-shadow-sm transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110 ${shape.bow}`}
                  />
                  <div
                    className={`relative aspect-[4/5] overflow-hidden p-2 shadow-clay transition-shadow duration-500 group-hover:shadow-lift ${shape.frame}`}
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
                    {/* soft veil for legibility */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-cocoa/55 via-cocoa/10 to-transparent"
                    />
                    <span className="absolute left-4 top-4 -rotate-3 font-hand text-lg text-white/95 drop-shadow-sm">
                      {cat.note}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <h3 className="text-lg font-bold text-white">{cat.title}</h3>
                      <p className="mt-0.5 text-[0.8rem] leading-snug text-white/85">{cat.description}</p>
                      <span className="mt-2 inline-flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-blush transition-transform duration-300 group-hover:translate-x-1">
                        Explore <ArrowDoodle className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                  </div>
                </a>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
