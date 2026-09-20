"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { processSteps } from "@/data/process";
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

const ICONS = {
  yarn: YarnDoodle,
  pencil: PencilDoodle,
  hook: HookDoodle,
  flower: FlowerDoodle,
  gift: GiftDoodle,
  heart: HeartDoodle,
} as const;

/** YARN → DESIGN → STITCH → DETAIL → PACK → YOU, animated as you scroll. */
export function ProcessTimeline() {
  const lineRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: lineRef,
    offset: ["start 0.85", "end 0.55"],
  });
  const draw = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });

  return (
    <section id="process" className="relative bg-whitish py-20 md:py-28">
      <div className="wrap">
        <SectionHeading
          eyebrow="from yarn to you"
          title={
            <>
              The Handmade <span className="font-script font-normal text-rose">Process</span>
            </>
          }
          lead="Six slow, happy steps between a plain skein of yarn and a little piece of joy."
        />

        <div ref={lineRef} className="relative mx-auto mt-16 max-w-3xl">
          {/* the stitched line — draws itself as you scroll */}
          <div
            aria-hidden="true"
            className="absolute bottom-4 left-[1.15rem] top-2 w-0.5 -translate-x-1/2 bg-blush-deep/25 md:left-1/2"
          >
            <motion.div
              className="h-full w-full origin-top border-l-2 border-dashed border-rose"
              style={reduce ? { scaleY: 1 } : { scaleY: draw }}
            />
          </div>

          <ol className="flex flex-col gap-10 md:gap-12">
            {processSteps.map((step, i) => {
              const Icon = ICONS[step.icon];
              const left = i % 2 === 0;
              return (
                <li key={step.id} className="relative">
                  {/* yarn-ball node */}
                  <span
                    aria-hidden="true"
                    className="absolute left-[1.15rem] top-5 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border-2 border-rose bg-ivory shadow-card md:left-1/2"
                  >
                    <span className="h-3.5 w-3.5 rounded-full bg-blush" />
                  </span>

                  <Reveal
                    className={`pl-14 md:w-1/2 md:pl-0 ${
                      left ? "md:pr-12 md:text-right" : "md:ml-auto md:pl-12"
                    }`}
                  >
                    <div
                      className={`card inline-flex flex-col gap-2.5 p-6 text-left transition-all duration-500 hover:-translate-y-1 hover:shadow-soft ${
                        left ? "md:items-end md:text-right" : ""
                      }`}
                    >
                      <span className="flex items-center gap-3 text-rose">
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
    </section>
  );
}
