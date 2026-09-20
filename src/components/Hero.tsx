"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";
import { useInViewport } from "@/lib/hooks";
import { useIntroStarted } from "@/lib/intro";
import { HeroStatic } from "./HeroStatic";
import { Magnetic } from "./Magnetic";
import { HeartDoodle, SquiggleDoodle, YarnDoodle } from "./Decorations";

const HeroScene3D = dynamic(() => import("./three/HeroScene3D"), {
  ssr: false,
  loading: () => <HeroStatic />,
});

const ANNOTATIONS = [
  { text: "handmade", className: "left-[1%] top-[14%] -rotate-6" },
  { text: "custom made", className: "right-[2%] top-[24%] rotate-3" },
  { text: "one stitch at a time", className: "left-[4%] bottom-[20%] rotate-2" },
  { text: "tiny things, happy things", className: "right-[3%] bottom-[12%] -rotate-3" },
] as const;

const wordContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } },
};

const word: Variants = {
  hidden: { opacity: 0, y: 26, rotate: 2 },
  show: {
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Hero() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const heroActive = useInViewport(sectionRef, "120px");
  // the copy animates from the moment the loading curtain lifts (shared beat
  // with the 3D choreography) — never unseen behind the loader.
  // SSR/no-JS: intro is "not started" ⇒ variants are omitted ⇒ content is visible.
  const started = useIntroStarted();
  // hand-off to the next section: as the hero scrolls away, the copy drifts up
  // faster than the scene and fades — the eye is released toward the story
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -120]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.55], [1, reduce ? 1 : 0]);
  const sceneY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const animate = hydrated && !reduce; // run the choreography
  const show = started || !hydrated; // pre-hydration: render final state

  const fadeUp = (delay: number) =>
    !animate
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: show ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
          transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section id="home" ref={sectionRef} className="candy relative overflow-hidden">
      {/* subtle gingham over the candy wash */}
      <div className="gingham pointer-events-none absolute inset-0 opacity-45 mix-blend-multiply" aria-hidden="true" />
      {/* decorative doodles — kept few, with breathing room */}
      <FlowerDoodleBg />
      <LeafBg />
      <BowCorner />

      <div className="wrap grid min-h-[92vh] items-center gap-10 pb-16 pt-32 md:pb-24 md:pt-36 lg:grid-cols-[1.02fr_1fr] lg:gap-8">
        {/* ---------- left: editorial copy ----------
            keyed on hydration: framer's `initial` only applies at mount, so the
            SSR-visible copy remounts once (under the curtain) into its hidden
            pose and then plays from the shared intro beat. */}
        <motion.div
          key={hydrated ? "live" : "ssr"}
          style={{ y: copyY, opacity: copyOpacity }}
          className="relative z-10 flex max-w-xl flex-col items-start gap-6"
        >
          <motion.p
            {...fadeUp(0.05)}
            className="flex items-center gap-2.5 text-[0.7rem] font-bold uppercase tracking-[0.3em] text-rose-ink md:text-xs"
          >
            <HeartDoodle className="h-4 w-4" strokeWidth={1.8} />
            Handmade crochet&nbsp;•&nbsp;made with love
          </motion.p>

          <motion.h1
            initial={!animate ? false : "hidden"}
            animate={show ? "show" : "hidden"}
            variants={!animate ? undefined : wordContainer}
            className="text-balance text-[2.6rem] font-bold leading-[1.05] tracking-tight text-cocoa md:text-6xl"
          >
            <span className="block">
              {"Little Stitches.".split(" ").map((w, i) => (
                <motion.span
                  key={w}
                  variants={!animate ? undefined : word}
                  className="inline-block will-change-transform"
                >
                  {w}
                  {i === 0 ? "\u00A0" : ""}
                </motion.span>
              ))}
            </span>
            <motion.span
              variants={!animate ? undefined : word}
              className="mt-1 block font-script text-[3rem] font-normal leading-[1.15] text-rose-ink md:text-[4.2rem]"
            >
              Big Feelings.
            </motion.span>
          </motion.h1>

          <motion.p {...fadeUp(0.25)} className="text-pretty text-lg font-medium leading-relaxed text-cocoa md:text-xl">
            Handmade crochet pieces for gifting, collecting, celebrating — and
            making everyday moments a little sweeter.
          </motion.p>

          <motion.p {...fadeUp(0.32)} className="max-w-md text-pretty leading-relaxed text-cocoa-soft">
            From tiny charms and keychains to floral bouquets and custom
            creations, every Whimlet piece is made by hand, one stitch at a
            time.
          </motion.p>

          <motion.div {...fadeUp(0.4)} className="mt-2 flex flex-wrap items-center gap-3.5">
            <Magnetic>
              <a href="#shop" className="btn btn-primary btn-lg">
                Explore the Collection
              </a>
            </Magnetic>
            <Magnetic strength={0.2}>
              <a href="#custom" className="btn btn-outline btn-lg">
                Create Something Custom
              </a>
            </Magnetic>
          </motion.div>

          <motion.p
            {...fadeUp(0.48)}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-cocoa-soft"
          >
            <span className="flex items-center gap-1.5">
              <HeartDoodle className="h-3.5 w-3.5 text-rose-ink" /> Custom orders available
            </span>
            <span aria-hidden="true" className="text-blush-deep">•</span>
            <span className="flex items-center gap-1.5">
              <HeartDoodle className="h-3.5 w-3.5 text-rose-ink" /> WhatsApp enquiries
            </span>
          </motion.p>
        </motion.div>

        {/* ---------- right: the 3D studio ---------- */}
        <motion.div style={{ y: sceneY }} className="relative h-[440px] w-full sm:h-[500px] md:h-[580px] lg:h-[660px]">
          {/* soft pastel blobs give the scene a "stage" without boxing it in */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <span className="absolute left-[8%] top-[12%] h-[62%] w-[78%] rounded-[46%_54%_52%_48%/58%_44%_56%_42%] bg-blush-soft/80 blur-2xl" />
            <span className="absolute right-[2%] top-[4%] h-40 w-40 rounded-full bg-lavender/70 blur-2xl" />
            <span className="absolute bottom-[8%] left-[2%] h-32 w-32 rounded-full bg-mint/80 blur-2xl" />
          </div>
          {/* the canvas is always mounted so shaders compile behind the curtain */}
          <HeroScene3D active={heroActive} />

          {/* floating handmade annotations — arrive after the charms land (~3s beat) */}
          {ANNOTATIONS.map((a, i) => (
            <motion.span
              key={a.text}
              aria-hidden="true"
              {...(!animate
                ? {}
                : {
                    initial: { opacity: 0, y: 8 },
                    animate: show ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
                    transition: { duration: 0.7, delay: 3.0 + i * 0.16, ease: [0.22, 1, 0.36, 1] as const },
                  })}
              className={`pointer-events-none absolute z-10 hidden font-hand text-xl text-rose-ink sm:block ${a.className}`}
            >
              <span className="block animate-float" style={{ animationDelay: `${i * 1.1}s` }}>
                {a.text}
                <SquiggleDoodle className="mt-0.5 h-2 w-full text-blush-deep/70" />
              </span>
            </motion.span>
          ))}

          {/* a quiet hint that the bouquet is tappable */}
          <motion.span
            aria-hidden="true"
            {...(!animate
              ? {}
              : {
                  initial: { opacity: 0 },
                  animate: show ? { opacity: 1 } : { opacity: 0 },
                  transition: { duration: 0.8, delay: 4.2 },
                })}
            className="sticker pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap text-cocoa-soft"
            style={{ "--tilt": "-2deg" } as React.CSSProperties}
          >
            tap the bouquet ✿
          </motion.span>
        </motion.div>
      </div>

      {/* scroll cue */}
      <a
        href="#story"
        className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-cocoa-soft transition-colors hover:text-rose-ink md:flex"
        aria-label="Scroll to the next section"
      >
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em]">scroll</span>
        <YarnDoodle className="h-5 w-5 animate-bounce-soft" />
      </a>
    </section>
  );
}

/* off-screen decorative doodles */
function FlowerDoodleBg() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="absolute -left-6 bottom-24 -z-0 h-40 w-40 -rotate-12 text-blush/40"
    >
      <g fill="none" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round">
        {[0, 72, 144, 216, 288].map((deg) => (
          <ellipse key={deg} cx="12" cy="7" rx="2.4" ry="3.6" transform={`rotate(${deg} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="2.1" />
      </g>
    </svg>
  );
}

/* a satin bow in the top-right corner — the coquette signature */
function BowCorner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 80"
      className="absolute -right-6 top-24 hidden h-24 w-36 -rotate-[18deg] text-rose/55 md:block lg:right-[3%] lg:top-28"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 40c-12-16-38-22-46-10s6 30 22 26 24-10 24-16z" />
        <path d="M60 40c12-16 38-22 46-10s-6 30-22 26-24-10-24-16z" />
        <circle cx="60" cy="40" r="6" fill="currentColor" fillOpacity="0.25" />
        <path d="M56 46c-8 10-12 18-14 30M64 46c8 10 12 18 14 30" />
      </g>
    </svg>
  );
}

function LeafBg() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="absolute right-[6%] top-24 -z-0 h-16 w-16 rotate-45 text-sage/50 lg:right-[52%]"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14z" />
        <path d="M7.5 16.5C10 13.7 13 10.6 16.5 8.2" />
      </g>
    </svg>
  );
}
