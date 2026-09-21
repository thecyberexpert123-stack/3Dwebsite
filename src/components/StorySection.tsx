"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Reveal, TextReveal } from "./Reveal";
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
  // the photograph is revealed by a soft rounded wipe as it enters — the
  // hero's camera tilted down onto a table; this is the next table
  const clip = useTransform(
    scrollYProgress,
    [0.05, 0.4],
    reduce ? ["inset(0% round 2.5rem)", "inset(0% round 2.5rem)"] : ["inset(18% 12% 18% 12% round 3rem)", "inset(0% 0% 0% 0% round 2.5rem)"]
  );
  const imgScale = useTransform(scrollYProgress, [0.05, 0.4], [reduce ? 1 : 1.16, 1]);

  return (
    <section id="story-beat" className="surface-sky scallop-bottom relative overflow-hidden py-20 md:py-28" style={{ "--scallop": "#f4f8fd" } as React.CSSProperties} ref={ref}>
      <div className="wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* image with soft parallax */}
        <motion.div style={{ y }} className="relative mx-auto w-full max-w-lg">
          <motion.div style={{ clipPath: clip }} className="relative aspect-[4/3] -rotate-1 overflow-hidden rounded-[2.5rem] shadow-lift">
            <motion.div style={{ scale: imgScale }} className="absolute inset-0">
              <Image
                src="/images/story-hands.jpg"
                alt="A half-finished blush pink crochet flower resting on linen, with a wooden crochet hook mid-stitch and a strand of yarn trailing away"
                fill
                sizes="(min-width: 1024px) 46vw, 92vw"
                className="object-cover"
              />
            </motion.div>
          </motion.div>
          <p className="sticker absolute -bottom-5 left-6 text-rose-ink" style={{ "--tilt": "-3deg" } as React.CSSProperties}>
            one stitch at a time ♡
          </p>
          <HeartDoodle className="absolute -right-3 -top-4 h-10 w-10 rotate-12 text-rose-ink animate-float" />
        </motion.div>

        {/* copy */}
        <Reveal className="flex flex-col items-start gap-5">
          <p className="inline-flex items-center gap-2 rounded-full bg-whitish/90 px-4 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.26em] text-rose-ink shadow-clay-sm">
            <HeartDoodle className="h-3.5 w-3.5" /> the whimbles &amp; wonders
          </p>
          <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-cocoa md:text-5xl">
            <TextReveal text="Made Slowly." />
            <TextReveal text="Made Specially." className="block font-script font-normal text-rose-ink" stagger={0.1} />
          </h2>
          <ScrubLine
            progress={scrollYProgress}
            text="At Whimlet, every piece begins with yarn, imagination and a lot of little stitches. What starts as a simple thread becomes something you can gift, keep, wear or treasure."
            reduce={!!reduce}
          />
          <ul className="mt-2 flex flex-col gap-3">
            {VALUES.map((v) => (
              <li key={v.label} className="flex items-center gap-3 font-semibold text-cocoa">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-rose-ink shadow-clay-sm">
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

/**
 * A paragraph that is *read by the scroll*: each word inks in from a pale
 * blush to full cocoa as the section travels through the viewport, like a
 * highlighter moving along the line. The scrub range is narrow (25–60 % of
 * the section's travel) so the whole thought is legible well before the
 * section leaves.
 */
function ScrubLine({ text, progress, reduce }: { text: string; progress: MotionValue<number>; reduce: boolean }) {
  const words = text.split(" ");
  return (
    <p className="text-pretty text-lg leading-relaxed text-cocoa-soft" aria-label={text}>
      {words.map((w, i) => (
        <Word key={i} word={w} progress={progress} start={0.22 + (i / words.length) * 0.36} reduce={reduce} />
      ))}
    </p>
  );
}

function Word({ word, progress, start, reduce }: { word: string; progress: MotionValue<number>; start: number; reduce: boolean }) {
  const color = useTransform(progress, [start, start + 0.06], ["rgb(233 178 195)", "rgb(74 50 56)"]);
  return (
    <motion.span aria-hidden="true" style={reduce ? undefined : { color }} className="inline-block whitespace-pre">
      {word + " "}
    </motion.span>
  );
}

