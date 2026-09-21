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
  { text: "custom made", className: "right-[2%] top-[22%] rotate-3" },
  { text: "one stitch at a time", className: "left-[4%] bottom-[30%] rotate-2" },
  { text: "tiny things, happy things", className: "right-[3%] bottom-[24%] -rotate-3" },
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

const scriptLine: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.55 } },
};
const letter: Variants = {
  hidden: { opacity: 0, y: "70%", rotate: -6, filter: "blur(4px)", textShadow: "0 0 18px rgba(240,124,140,0.9)" },
  show: {
    opacity: 1,
    y: "0%",
    rotate: 0,
    filter: "blur(0px)",
    textShadow: "0 0 0px rgba(240,124,140,0)",
    transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Hero() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const heroActive = useInViewport(sectionRef, "120px");
  const started = useIntroStarted();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -140]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.5], [1, reduce ? 1 : 0]);
  const copyScale = useTransform(scrollYProgress, [0, 0.5], [1, reduce ? 1 : 0.96]);
  const sceneY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);
  const sceneScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.08]);
  const vignetteOpacity = useTransform(scrollYProgress, [0, 0.6], [0.04, 0]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const animate = hydrated && !reduce;
  const show = started || !hydrated;

  const fadeUp = (delay: number) =>
    !animate
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: show ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
          transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section id="home" ref={sectionRef} className="relative overflow-hidden bg-[#cfe2f4]">
      {/* ---------- meadow + bouquet ---------- */}
      <motion.div style={{ y: sceneY, scale: sceneScale }} className="absolute inset-0" aria-hidden="true">
        <HeroScene3D active={heroActive} />
        {/* cinematic veils — legibility + depth */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-white/70 via-white/40 via-[38%] to-white/10 to-transparent lg:w-[66%]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-ivory via-ivory/80 via-40% to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/50 via-white/20 to-transparent" />
        <motion.div style={{ opacity: vignetteOpacity }} className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,transparent_40%,rgba(0,0,0,0.06)_100%)]" />
        {/* soft film grain over hero for texture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.025] mix-blend-multiply" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
      </motion.div>
      <BowCorner />

      {/* ---------- copy ---------- */}
      <div className="wrap relative grid min-h-[100svh] items-end gap-10 pb-20 pt-[46svh] md:pb-28 md:pt-[42svh] lg:items-center lg:pt-36 lg:grid-cols-[1.02fr_1fr] lg:gap-8">
        <motion.div
          key={hydrated ? "live" : "ssr"}
          style={{ y: copyY, opacity: copyOpacity, scale: copyScale }}
          className="glass-panel hero-panel relative z-10 flex max-w-xl flex-col items-start gap-5 px-6 py-7 md:gap-6 md:px-10 md:py-10"
        >
          <motion.p
            {...fadeUp(0.05)}
            className="flex items-center gap-2.5 text-[0.7rem] font-bold uppercase tracking-[0.3em] text-rose-ink md:text-xs"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose/15">
              <HeartDoodle className="h-3.5 w-3.5" strokeWidth={1.8} />
            </span>
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
              variants={!animate ? undefined : scriptLine}
              className={`u-hand mt-1 block font-script text-[3rem] font-normal leading-[1.15] text-rose-ink md:text-[4.2rem]${show ? " is-inview" : ""}`}
              aria-label="Big Feelings."
            >
              {Array.from("Big Feelings.").map((ch, i) => (
                <span key={i} className="inline-block overflow-hidden pb-[0.15em] pr-[0.04em] align-bottom" aria-hidden="true">
                  <motion.span variants={!animate ? undefined : letter} className="inline-block will-change-transform">
                    {ch === " " ? "\u00A0" : ch}
                  </motion.span>
                </span>
              ))}
            </motion.span>
          </motion.h1>

          <motion.p {...fadeUp(0.25)} className="text-pretty text-lg font-medium leading-relaxed text-cocoa md:text-xl">
            Handmade crochet pieces for gifting, collecting, celebrating — and making everyday moments a little sweeter.
          </motion.p>

          <motion.p {...fadeUp(0.32)} className="max-w-md text-pretty leading-relaxed text-cocoa-soft">
            From tiny charms and keychains to floral bouquets and custom creations, every Whimlet piece is made by hand, one stitch at a time.
          </motion.p>

          <motion.div {...fadeUp(0.4)} className="mt-2 flex flex-wrap items-center gap-3.5">
            <Magnetic>
              <a href="#shop" className="btn btn-primary btn-lg group">
                <span className="relative z-10">Explore the Collection</span>
                <span className="absolute inset-0 -z-0 translate-y-full bg-white/15 transition-transform duration-300 group-hover:translate-y-0" />
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

        {/* ---------- right: annotations ---------- */}
        <div className="pointer-events-none relative hidden h-[440px] w-full sm:h-[500px] md:h-[580px] lg:block lg:h-[660px]">
          {ANNOTATIONS.map((a, i) => (
            <motion.span
              key={a.text}
              aria-hidden="true"
              {...(!animate
                ? {}
                : {
                    initial: { opacity: 0, y: 12, rotate: i % 2 ? 3 : -3 },
                    animate: show ? { opacity: 1, y: 0, rotate: 0 } : { opacity: 0, y: 12 },
                    transition: { duration: 0.8, delay: 3.0 + i * 0.16, ease: [0.22, 1, 0.36, 1] as const },
                  })}
              className={`absolute z-10 hidden rounded-full bg-white/60 px-3 py-1 font-hand text-xl text-rose-ink shadow-[0_2px_12px_rgba(120,40,60,0.08)] backdrop-blur-md sm:block ${a.className}`}
            >
              <span className="block animate-float" style={{ animationDelay: `${i * 1.1}s` }}>
                {a.text}
                <SquiggleDoodle className="mt-0.5 h-2 w-full text-blush-deep/70" />
              </span>
            </motion.span>
          ))}

          <motion.span
            aria-hidden="true"
            {...(!animate
              ? {}
              : {
                  initial: { opacity: 0, y: 8 },
                  animate: show ? { opacity: 1, y: 0 } : { opacity: 0 },
                  transition: { duration: 0.8, delay: 4.2 },
                })}
            className="sticker pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap text-cocoa-soft"
            style={{ "--tilt": "-2deg" } as React.CSSProperties}
          >
            tap the bouquet ✿
          </motion.span>
        </div>
      </div>

      {/* scroll cue — yarn ball rolls down */}
      <motion.a
        href="#story"
        initial={{ opacity: 0 }}
        animate={{ opacity: show ? 1 : 0 }}
        transition={{ delay: 4.5, duration: 0.8 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-cocoa-soft transition-colors hover:text-rose-ink md:flex"
        aria-label="Scroll to the next section"
      >
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em]">scroll</span>
        <span className="relative flex h-9 w-5 justify-center rounded-full border border-cocoa/20 pt-1">
          <motion.span
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="h-2 w-2 rounded-full bg-rose shadow-[0_0_8px_rgba(224,122,154,0.6)]"
          />
        </span>
      </motion.a>
    </section>
  );
}

function BowCorner() {
  return (
    <motion.svg
      aria-hidden="true"
      viewBox="0 0 120 80"
      initial={{ opacity: 0, rotate: -25 }}
      animate={{ opacity: 1, rotate: -18 }}
      transition={{ delay: 1.2, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      className="absolute -right-6 top-24 hidden h-24 w-36 text-rose/55 md:block lg:right-[3%] lg:top-28"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 40c-12-16-38-22-46-10s6 30 22 26 24-10 24-16z" />
        <path d="M60 40c12-16 38-22 46-10s-6 30-22 26-24-10-24-16z" />
        <circle cx="60" cy="40" r="6" fill="currentColor" fillOpacity="0.25" />
        <path d="M56 46c-8 10-12 18-14 30M64 46c8 10 12 18 14 30" />
      </g>
    </motion.svg>
  );
}
