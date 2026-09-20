"use client";

import Image from "next/image";
import { Reveal } from "./Reveal";
import { HeartDoodle, LadybugDoodle, SquiggleDoodle } from "./Decorations";

/**
 * "The Whimlet Story" — warm editorial layout. Copy sticks to facts provided
 * by the business: a small handmade crochet brand, craftsmanship, creativity,
 * personalized pieces. No invented founders, dates, awards or locations.
 */
export function OurStory() {
  return (
    <section id="story" className="gingham relative overflow-hidden py-20 md:py-28">
      <div className="wrap grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        {/* copy */}
        <Reveal className="flex flex-col items-start gap-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-rose">
            <HeartDoodle className="h-3.5 w-3.5" /> our story
          </p>
          <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-cocoa md:text-5xl">
            The Whimlet <span className="font-script font-normal text-rose">Story</span>
          </h2>

          <p className="text-pretty leading-relaxed text-cocoa-soft md:text-lg">
            Whimlet is a small handmade crochet brand built on a simple love for
            craft — for yarn, for colour, and for the quiet magic of making
            things by hand.
          </p>
          <p className="text-pretty leading-relaxed text-cocoa-soft md:text-lg">
            Every piece — from a single stem to a full bouquet, a tiny charm to
            a custom creation — is crocheted slowly and thoughtfully. Nothing is
            mass-produced: each piece begins with an idea and ends with
            something made specially for you.
          </p>

          <blockquote className="relative mt-2 rounded-[2rem] bg-white/70 p-6 shadow-card md:p-8">
            <p className="font-script text-3xl leading-snug text-rose md:text-4xl">
              “Every piece begins with a single loop of yarn.”
            </p>
            <SquiggleDoodle className="mt-3 h-2.5 w-28 text-blush-deep" />
          </blockquote>

          <p className="text-pretty leading-relaxed text-cocoa-soft md:text-lg">
            The name says it all: a whim, a little bit of wonder. If you can
            dream it, we'd love to crochet it.
          </p>
        </Reveal>

        {/* image */}
        <Reveal delay={0.12} className="relative mx-auto w-full max-w-lg">
          <div className="relative aspect-[4/5] rotate-1 overflow-hidden rounded-[3rem_2rem_3rem_2rem] shadow-lift">
            <Image
              src="/images/hero-fallback.jpg"
              alt="The Whimlet crochet studio scene: a hand-crocheted bouquet with pastel yarn balls, a wooden hook, ribbon and a small gift box on a cream surface"
              fill
              sizes="(min-width: 1024px) 44vw, 92vw"
              className="object-cover"
            />
          </div>
          <p className="absolute -bottom-4 right-6 rotate-2 font-hand text-xl text-rose md:text-2xl">
            the little studio
          </p>
          <LadybugDoodle className="absolute -left-3 top-8 h-9 w-9 -rotate-12 text-dusty/70 animate-float-slow" />
        </Reveal>
      </div>
    </section>
  );
}
