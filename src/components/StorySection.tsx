"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Reveal } from "./Reveal";
import { HeartDoodle, SparkleDoodle, StitchDoodle } from "./Decorations";

const VALUES = [
  { icon: StitchDoodle, label: "hours of happy stitching" },
  { icon: HeartDoodle, label: "made with love, always" },
  { icon: SparkleDoodle, label: "small things, made well" },
] as const;

/** First story beat after the hero — emotional, editorial, softly parallaxed. */
export function StorySection() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : -18, reduce ? 0 : 18]);

  return (
    <section id="story-beat" className="gingham-pink relative overflow-hidden py-20 md:py-28" ref={ref}>
      <div className="wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* image with soft parallax */}
        <motion.div style={{ y }} className="relative mx-auto w-full max-w-lg">
          <div className="relative aspect-[4/3] -rotate-1 overflow-hidden rounded-[2.5rem] shadow-lift">
            <Image
              src="/images/story-hands.jpg"
              alt="A half-finished blush pink crochet flower resting on linen, with a wooden crochet hook mid-stitch and a strand of yarn trailing away"
              fill
              sizes="(min-width: 1024px) 46vw, 92vw"
              className="object-cover"
            />
          </div>
          <p className="absolute -bottom-5 left-6 -rotate-2 font-hand text-xl text-rose md:text-2xl">
            one stitch at a time
          </p>
          <HeartDoodle className="absolute -right-3 -top-4 h-10 w-10 rotate-12 text-rose/70 animate-float" />
        </motion.div>

        {/* copy */}
        <Reveal className="flex flex-col items-start gap-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-rose">
            <HeartDoodle className="h-3.5 w-3.5" /> the whimbles &amp; wonders
          </p>
          <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-cocoa md:text-5xl">
            Made Slowly.
            <span className="block font-script font-normal text-rose">Made Specially.</span>
          </h2>
          <p className="text-pretty text-lg leading-relaxed text-cocoa-soft">
            At Whimlet, every piece begins with yarn, imagination and a lot of
            little stitches. What starts as a simple thread becomes something
            you can gift, keep, wear or treasure.
          </p>
          <ul className="mt-2 flex flex-col gap-3">
            {VALUES.map((v) => (
              <li key={v.label} className="flex items-center gap-3 font-semibold text-cocoa">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-rose shadow-card">
                  <v.icon className="h-4.5 w-4.5" />
                </span>
                {v.label}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
