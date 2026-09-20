"use client";

import Image from "next/image";
import { occasions } from "@/data/occasions";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { TiltCard } from "./TiltCard";
import { HeartDoodle } from "./Decorations";

/** "For Every Little Moment" — warm editorial occasion cards. */
export function OccasionSection() {
  return (
    <section id="occasions" className="relative bg-ivory py-20 md:py-28">
      <div className="wrap">
        <SectionHeading
          eyebrow="why people order"
          title={
            <>
              For Every <span className="font-script font-normal text-rose">Little Moment</span>
            </>
          }
          lead="Gifts, celebrations, ordinary Tuesdays — there's a handmade piece for each of them."
        />

        <div className="mt-14 grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3">
          {occasions.map((o, i) => (
            <Reveal key={o.id} delay={(i % 3) * 0.08}>
              <TiltCard max={5}>
              <article className="group relative aspect-[4/5] overflow-hidden rounded-[1.75rem] shadow-card transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift">
                <Image
                  src={o.image}
                  alt={o.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-cocoa/60 via-cocoa/15 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                  <h3 className="flex items-center gap-2 text-base font-bold text-white md:text-lg">
                    <HeartDoodle className="h-4 w-4 shrink-0 text-blush" />
                    {o.title}
                  </h3>
                  <p className="mt-1 text-xs leading-snug text-white/85 md:text-sm">{o.line}</p>
                </div>
              </article>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
