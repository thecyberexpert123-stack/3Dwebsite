"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useReducedMotion, type Variants } from "framer-motion";
import { startIntro, useHeroReady } from "@/lib/intro";
import { useWebGL } from "@/lib/hooks";
import { lockScroll, unlockScroll } from "@/lib/scroll";

/**
 * The signature — Whimlet's boot sequence.
 *
 * One idea, done quietly, on ONE timeline:
 *   0.00 s  the candy curtain is already painted (SSR-safe: nothing here
 *           depends on a chunk arriving)
 *   0.12 s  the wordmark signs itself — each letter pops onto the line in a
 *           staggered cascade (W h i m l e t, ~85 ms apart, hand-tuned
 *           amplitudes: the capital leads, `i` and `m` flourish, `t` pops
 *           under the heart) like a name written by hand; as the last letter
 *           lands (~0.72 s) a needle draws a soft underline flourish
 *   1.15 s  a little heart lands as the full stop
 *   1.05 s  "one stitch at a time." settles under it
 *   1.35 s  the running stitch appears and fills with *real* progress —
 *           page assets (`window.load`) → the meadow's first frame
 *           (`markHeroReady`) — with a percentage and one honest line
 *   ready   the curtain lifts straight up, scalloped hem last, and the hero's
 *           own choreography starts on that beat (`startIntro`)
 *
 * Every beat runs on the compositor: each letter is a CSS animation over
 * transform + opacity (scroll-linked per-letter amplitude via `var(--amp/
 * --rot/--pop)` — no per-letter CSS generation, no blur that would freeze
 * mid-glyph), the stitch is a clip/ink transform pair driven by a CSS
 * transition on `--stitch` (see `.whimlet-ch/.stitch-*` in globals.css) and
 * the fades are opacity. Nothing here is a `clip-path`, `width` or
 * rAF-stepped value, so the sequence keeps moving while the main thread is
 * busy compiling the hero's shaders — which is exactly when a cold Android
 * start used to freeze the earlier version mid-stroke and collapse several
 * beats into one. The percentage is the only JS-ticked number; if it hitches
 * the visuals do not. The wordmark size is a `clamp()` so a 320 px phone
 * still sees the whole signature.
 *
 * Why this shape (see AGENT-EXPERIENCE v0.18.0): waits with visible, honest
 * progress feel shorter and are abandoned less; a determinate indicator is
 * the right tool for a 1–5 s wait; the strongest recent loaders are a brand
 * signature + counter + one directed exit — not a mini-game.
 *
 * Repeat visits in the same tab get a short curtain. Reduced motion gets the
 * mark in place and a plain fade. No WebGL lifts on the minimum hold. A hard
 * cap lifts the curtain even if the hero never reports ready — the loader can
 * only ever *delay*, never trap. Client-only: SSR / no-JS never see it.
 */

const SESSION_KEY = "whimlet:entered";
/** the signature needs this long to be *seen*: write-on 1.25 s + a beat */
const MIN_SHOW_MS = 1900;
/** never hold the page longer than this, whatever the hero says */
const MAX_HOLD_MS = 7000;
const QUICK_MS = 550;

/** QA override (like `?quality=`): `?intro=skip` bypasses the loader,
 *  `?intro=hold` keeps it up so the end pose can be reviewed,
 *  `?intro=force` shows the full signature even on repeat visits. */
function introOverride(): "skip" | "hold" | "force" | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("intro");
  return v === "skip" || v === "hold" || v === "force" ? v : null;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_CURTAIN = [0.76, 0, 0.24, 1] as const;

/* ---- the wordmark signs itself, one letter at a time ----
   Each glyph is an inline-block with a CSS animation (transform + opacity)
   that pops/blurs-toward/in the glyph, staggered by ~90 ms. The amplitude is
   *scroll-linked*: all letters share one `--a` custom property tweened by a
   separate, interval-free transition, so the per-letter differences come
   from static multipliers (`--amp` / `--rot` / `--pop`) computed once per
   eyebrow of the signature instead of N bespoke keyframes.
   Per-letter tuning (cascade, hand-feel):
     W  leads big;  h and m  dip low and spring up (descender/ascender feel);
     i  a short quick pop (it's the fastest real stroke);  l  tall soft rise;
     e  curls in late with the biggest overshoot — the "swoosh out" of the pen.
   This is the O(n) per-letter effect — no filtering, no per-glyph keyframes.
   The constants this tunes (travel / rise / step / letter-dur / letter-delay
   / pop) live once in `.whimlet-write` in globals.css, so the CSS animation
   and this per-letter tuning stay in one motion language. */
const LETTERS = [
  { ch: "W", amp: 1, rot: -1, pop: 1 },
  { ch: "h", amp: 0.9, rot: 2, pop: 0.9 },
  { ch: "i", amp: 0.6, rot: 1, pop: 1.5 },
  { ch: "m", amp: 0.95, rot: -2, pop: 1.2 },
  { ch: "l", amp: 0.7, rot: 2, pop: 1 },
  { ch: "e", amp: 1.35, rot: -2, pop: 2.3 },
  { ch: "t", amp: 0.75, rot: 3, pop: 0.7 },
];

/* ---- the timeline: one parent, children keyed by beat ---- */
const timeline: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.15, staggerChildren: 0 } },
};
const fullStop: Variants = {
  hidden: { opacity: 0, scale: 0.3 },
  show: { opacity: 1, scale: 1, transition: { delay: 1.15, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] } },
};
const settle = (delay: number): Variants => ({
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { delay, duration: 0.6, ease: EASE_OUT } },
});
// ↑ the settle delay for the stitch has been moved from 1.2 s → 1.35 s so it
// appears right as the underline flourish finishes (0.72 s + 0.6 s draw).

export function LoadingScreen() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [gone, setGone] = useState(false);
  const [mode, setMode] = useState<"full" | "quick">("full");
  // honest stages: 0 = page assets still arriving, 1 = loaded, the meadow is
  // compiling its shaders, 2 = first frame painted. The stitch tweens toward
  // each stage's ceiling over a few seconds (so a slow network never looks
  // frozen) and snaps to 100 on the last.
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [shown, setShown] = useState(0);
  // the stitch only starts filling once it has appeared on the timeline
  // (1.2 s) — without this, a page that is already loaded showed "73 %"
  // under a wordmark that had not been written yet
  const [armed, setArmed] = useState(false);
  const shownRef = useRef(0);
  const reduce = useReducedMotion();
  const webgl = useWebGL();
  const heroReady = useHeroReady();
  const override = useRef<ReturnType<typeof introOverride>>(null);
  const shownAt = useRef(0);

  useEffect(() => {
    override.current = introOverride();
    if (override.current === "skip") {
      startIntro();
      setGone(true);
      return;
    }
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      /* private mode etc. — treat as first visit */
    }
    setMode(seen && override.current !== "force" && override.current !== "hold" ? "quick" : "full");
    shownAt.current = performance.now();
    setMounted(true);
    setVisible(true);
    const t = setTimeout(() => setArmed(true), 1250);
    return () => clearTimeout(t);
  }, []);

  // stage 0 → 1 on window load (chunks, fonts, images requested by the shell)
  useEffect(() => {
    if (!mounted) return;
    if (document.readyState === "complete") {
      setStage((s) => (s < 1 ? 1 : s));
      return;
    }
    const onLoad = () => setStage((s) => (s < 1 ? 1 : s));
    window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, [mounted]);

  // stage → 2 on the meadow's first frame (or straight away without WebGL,
  // where the static hero is already painted)
  useEffect(() => {
    if (heroReady || webgl === false) setStage(2);
  }, [heroReady, webgl]);

  // lock the page while the curtain is down
  useEffect(() => {
    if (!visible) return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [visible]);

  const lifted = useRef(false);
  const lift = useCallback(() => {
    if (lifted.current) return;
    lifted.current = true;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
    startIntro();
    setTimeout(() => setGone(true), 1100);
  }, []);

  /* ---- quick mode (repeat visit) / reduced motion: a short curtain ---- */
  useEffect(() => {
    if (!mounted || gone) return;
    if (mode === "quick" || reduce) {
      const t = setTimeout(lift, reduce ? 350 : QUICK_MS);
      return () => clearTimeout(t);
    }
  }, [mounted, gone, mode, reduce, lift]);

  /* ---- full mode: lift once the hero is ready AND the signature has been
          seen; never later than the hard cap ---- */
  useEffect(() => {
    if (!mounted || gone || mode !== "full" || reduce) return;
    if (override.current === "hold") return;
    const elapsed = performance.now() - shownAt.current;
    const ready = stage === 2;
    const wait = ready ? Math.max(0, MIN_SHOW_MS - elapsed) : Math.max(0, MAX_HOLD_MS - elapsed);
    const t = setTimeout(lift, wait);
    return () => clearTimeout(t);
  }, [mounted, gone, mode, reduce, stage, lift]);

  // the number follows the same tween as the stitch (JS-ticked; visuals are CSS)
  const pctTarget = !armed ? 0 : stage === 0 ? 42 : stage === 1 ? 88 : 100;
  useEffect(() => {
    if (!mounted || gone) return;
    const ctrl = animate(shownRef.current, pctTarget, {
      duration: pctTarget === 100 ? 0.45 : 4.5,
      ease: pctTarget === 100 ? EASE_OUT : [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        const r = Math.round(v);
        if (r !== shownRef.current) {
          shownRef.current = r;
          setShown(r);
        }
      },
    });
    return () => ctrl.stop();
  }, [mounted, gone, pctTarget]);

  if (!mounted || gone) return null;

  const full = mode === "full" && !reduce;
  // the stitch's target and how long it takes to get there: a slow creep
  // toward the stage ceiling, a quick snap to 100 (fast start, slow finish
  // reads quicker than linear — and never runs ahead of the truth)
  const target = !armed ? 0 : stage === 0 ? 42 : stage === 1 ? 88 : 100;
  const stitchMs = stage === 2 ? 450 : 4500;
  // the line follows the number the visitor can see, never runs ahead of it
  const line = shown >= 100 ? "ready!" : stage === 0 ? "gathering the yarn…" : "warming up the hooks…";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-label="Whimlet is loading"
          className="candy scallop-bottom fixed inset-0 z-[100] flex items-center justify-center [--scallop:#fbe3ea]"
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0.25 } }
              : {
                  // the curtain lifts straight up, scalloped hem last — the
                  // meadow is *revealed* underneath, not cut to
                  y: "-102%",
                  transition: { duration: 0.9, ease: EASE_CURTAIN },
                }
          }
        >
          {/* soft dot texture over the candy wash */}
          <div className="polka pointer-events-none absolute inset-0 overflow-hidden opacity-40 mix-blend-multiply" aria-hidden="true" />

          <motion.div
            className="relative flex flex-col items-center px-6 text-center"
            variants={full ? timeline : undefined}
            initial={full ? "hidden" : false}
            animate="show"
            exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.4, ease: EASE_CURTAIN } }}
          >
            {/* ---- the signature: each letter signs onto the line in a
                 staggered cascade, then a needle draws the underline flourish ---- */}
            <div className="relative">
              {full ? (
                <span
                  className="whimlet-write inline-block font-script text-[clamp(3.4rem,12.5vw,4.2rem)] leading-[1.18] text-cocoa md:text-[clamp(4rem,7vw,5.6rem)]"
                  aria-label="Whimlet"
                >
                  {LETTERS.map((g, i) => (
                    <span
                      key={`${g.ch}-${i}`}
                      aria-hidden="true"
                      className="whimlet-ch inline-block will-change-[transform,opacity]"
                      style={
                        {
                          "--i": i,
                          "--amp": g.amp,
                          "--rot": `${g.rot}deg`,
                          "--pop": g.pop,
                        } as React.CSSProperties
                      }
                    >
                      {g.ch}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="inline-block font-script text-[clamp(3.4rem,12.5vw,4.2rem)] leading-[1.18] text-cocoa md:text-[clamp(4rem,7vw,5.6rem)]">
                  Whimlet
                </span>
              )}
              {/* the needle's flourish under the freshly-signed name */}
              {full && (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 260 14"
                  className="underline-flourish absolute -bottom-2 left-1/2 h-3.5 w-[min(88%,22rem)] -translate-x-1/2 text-rose"
                >
                  <path
                    d="M3 8.5C52 4.5 92 10.5 129 7.2 156 4.7 182 11.5 208 8.3 224.5 6.6 240 8.5 256.5 5.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              <motion.svg
                variants={full ? fullStop : undefined}
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="absolute right-0 top-[38%] h-5 w-5 text-rose-ink md:-right-1 md:h-6 md:w-6"
              >
                <path
                  d="M12 20.2C7.6 17.4 3.4 13.9 3.4 9.6 3.4 6.9 5.5 5 8 5c1.6 0 3 .8 4 2.1C13 5.8 14.4 5 16 5c2.5 0 4.6 1.9 4.6 4.6 0 4.3-4.2 7.8-8.6 10.6z"
                  fill="rgb(240 124 140 / 0.22)"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className={full ? "origin-center animate-heartbeat [animation-delay:1.6s]" : undefined}
                />
              </motion.svg>
              {/* fairy sparkles: a curved 4-point pair that winks once near the
                  heart as it lands (scale + rotate + opacity, whizzed once) */}
              {full && (
                <>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute -right-5 -top-4 h-4 w-4 text-cocoa-soft/70 md:-right-7 md:h-[1.15rem] md:w-[1.15rem]">
                    <path
                      className="sparkle"
                      d="M12 2 C12.7 7 15.1 9.4 20 10 C15.1 10.6 12.7 13 12 18 C11.3 13 8.9 10.6 4 10 C8.9 9.4 11.3 7 12 2 Z"
                      fill="currentColor"
                    />
                  </svg>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute -right-8 top-0 h-3 w-3 text-rose-ink/70 md:-right-11 md:h-3.5 md:w-3.5">
                    <path
                      className="sparkle"
                      style={{ animationDelay: "1.55s" }}
                      d="M12 2 C12.7 7 15.1 9.4 20 10 C15.1 10.6 12.7 13 12 18 C11.3 13 8.9 10.6 4 10 C8.9 9.4 11.3 7 12 2 Z"
                      fill="currentColor"
                    />
                  </svg>
                </>
              )}
            </div>

            <motion.p variants={full ? settle(0.9) : undefined} className="mt-1 font-hand text-xl text-cocoa-soft md:text-2xl">
              one stitch at a time.
            </motion.p>

            {full && (
              <>
                {/* ---- the running stitch: a dashed seam that closes with real progress ---- */}
                <motion.div
                  variants={settle(1.35)}
                  className="relative mt-9 h-3 w-[min(60vw,15rem)]"
                  style={{ "--stitch": target, "--stitch-ms": `${stitchMs}ms` } as React.CSSProperties}
                  aria-hidden="true"
                >
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-blush-deep/45" />
                  {/* the seam: same clip/ink pair as the wordmark; the needle
                      rides the clip box's right edge */}
                  <div className="stitch-clip absolute inset-0 overflow-visible">
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="stitch-ink absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-rose" />
                    </div>
                    <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-rose shadow-[0_0_0_4px_rgb(240_124_140_/_0.18)]" />
                  </div>
                </motion.div>

                <motion.p
                  variants={settle(1.3)}
                  className="mt-4 flex items-baseline gap-3 text-[0.68rem] font-bold uppercase tracking-[0.26em] text-cocoa-soft"
                >
                  <span className="tabular-nums text-rose-ink">{shown}%</span>
                  <span className="font-hand text-base normal-case tracking-normal text-cocoa-soft">{line}</span>
                </motion.p>

                <motion.button
                  variants={settle(1.7)}
                  type="button"
                  onClick={lift}
                  className="mt-10 text-[0.66rem] font-semibold uppercase tracking-[0.25em] text-cocoa-soft/70 underline-offset-4 transition-colors hover:text-rose-ink hover:underline"
                >
                  skip
                </motion.button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
