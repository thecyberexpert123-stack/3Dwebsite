"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { processSteps } from "@/data/process";
import { useInViewport, useWebGL } from "@/lib/hooks";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import {
  FlowerDoodle,
  GiftDoodle,
  HeartDoodle,
  HookDoodle,
  PencilDoodle,
  YarnDoodle,
} from "./Decorations";

const ProcessScene = dynamic(() => import("./three/ProcessScene"), { ssr: false });

const ICONS = {
  yarn: YarnDoodle,
  pencil: PencilDoodle,
  hook: HookDoodle,
  flower: FlowerDoodle,
  gift: GiftDoodle,
  heart: HeartDoodle,
} as const;

/**
 * THE MAKING OF A FLOWER — YARN → DESIGN → STITCH → DETAIL → PACK → YOU.
 *
 * The 3D stage is sticky while the six steps scroll past it; the section's
 * scroll progress is the timeline of the scene (a yarn ball becomes a
 * flower, becomes a gift). The active step is highlighted in sync, the
 * stitched line draws with the same progress. Scrubbing backwards rewinds
 * exactly — it is one timeline, not six triggered animations.
 *
 * Without WebGL the stage shows a still photograph; the steps remain a
 * fully readable, semantic ordered list.
 */
export function ProcessTimeline() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const webgl = useWebGL();
  const near = useInViewport(stageRef, "400px");

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 0.6", "end 0.6"],
  });
  const draw = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });

  // the scene reads this ref every frame — no React re-renders per scroll event
  const progress = useRef(0);
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progress.current = v;
    const idx = Math.min(processSteps.length - 1, Math.floor(v * processSteps.length + 0.15));
    setActive((a) => (a === idx ? a : idx));
  });

  // keyboard users: focusing a step scrolls it (and the scene) to that beat
  useEffect(() => {
    progress.current = scrollYProgress.get();
  }, [scrollYProgress]);

  return (
    <section id="process" className="ivory-bloom relative py-20 md:py-28">
      <div className="wrap">
        <SectionHeading
          eyebrow="from yarn to you"
          title="The Handmade"
          accent="Process"
          lead="Six slow, happy steps between a plain skein of yarn and a little piece of joy — scroll, and watch one flower get made."
        />

        <div className="relative mt-14 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          {/* ---------- the sticky stage ---------- */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div
              ref={stageRef}
              className="candy relative aspect-[4/5] w-full overflow-hidden rounded-[2.5rem] shadow-clay sm:aspect-[5/4] lg:aspect-[4/5] lg:h-[calc(100vh-8rem)] lg:max-h-[46rem]"
            >
              {webgl === true && near ? (
                <ProcessScene progress={progress} active={near} />
              ) : (
                <Image
                  src="/images/story-hands.jpg"
                  alt="A half-finished blush crochet flower with a wooden hook mid-stitch"
                  fill
                  sizes="(min-width: 1024px) 48vw, 92vw"
                  className="object-cover"
                />
              )}

              {/* stage caption: the current step, mirrored in the scene */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-5 md:p-6">
                <div className="rounded-full bg-white/80 px-4 py-2 shadow-card backdrop-blur-sm">
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-cocoa-soft">
                    step {active + 1} of {processSteps.length}
                  </span>
                  <span className="ml-3 font-script text-2xl leading-none text-rose-ink">
                    {processSteps[active].title}
                  </span>
                </div>
                {/* six-dot progress */}
                <div className="flex gap-1.5" aria-hidden="true">
                  {processSteps.map((s, i) => (
                    <span
                      key={s.id}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        i === active ? "w-6 bg-rose" : i < active ? "w-1.5 bg-rose/60" : "w-1.5 bg-blush-deep/40"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ---------- the steps (drive the timeline) ---------- */}
          <div ref={trackRef} className="relative">
            {/* the stitched line — draws itself as you scroll */}
            <div
              aria-hidden="true"
              className="absolute bottom-6 left-[1.15rem] top-6 w-0.5 -translate-x-1/2 bg-blush-deep/25"
            >
              <motion.div
                className="h-full w-full origin-top border-l-2 border-dashed border-rose"
                style={reduce ? { scaleY: 1 } : { scaleY: draw }}
              />
            </div>

            <ol className="flex flex-col gap-6 md:gap-8 lg:gap-[22vh] lg:py-[18vh]">
              {processSteps.map((step, i) => {
                const Icon = ICONS[step.icon];
                const isActive = i === active;
                return (
                  <li key={step.id} className="relative pl-14">
                    {/* yarn-ball node */}
                    <span
                      aria-hidden="true"
                      className={`absolute left-[1.15rem] top-6 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border-2 bg-ivory shadow-card transition-all duration-500 ${
                        isActive ? "scale-110 border-rose" : "border-blush-deep/60"
                      }`}
                    >
                      <span
                        className={`h-3.5 w-3.5 rounded-full transition-colors duration-500 ${
                          isActive ? "bg-rose" : "bg-blush"
                        }`}
                      />
                    </span>

                    <Reveal>
                      <div
                        className={`card flex flex-col gap-2.5 p-6 transition-all duration-500 ${
                          isActive ? "-translate-y-1 shadow-soft ring-1 ring-blush-deep/50" : "opacity-80"
                        }`}
                      >
                        <span className="flex items-center gap-3 text-rose-ink">
                          <Icon className="h-6 w-6" />
                          <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-cocoa-soft">
                            step {i + 1}
                          </span>
                        </span>
                        <h3 className="font-script text-3xl text-cocoa">{step.title}</h3>
                        <p className="text-sm leading-relaxed text-cocoa-soft">{step.line}</p>
                      </div>
                    </Reveal>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
