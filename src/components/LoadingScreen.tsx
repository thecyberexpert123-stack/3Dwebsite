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
 *   0.15 s  the wordmark writes itself left → right like a name being signed
 *           on a gift tag (clip-path, 1.1 s)
 *   1.10 s  a little heart lands as the full stop
 *   0.90 s  "one stitch at a time." settles under it
 *   1.20 s  the running stitch appears and fills with *real* progress —
 *           page assets (`window.load`) → the meadow's first frame
 *           (`markHeroReady`) — with a percentage and one honest line
 *   ready   the curtain lifts straight up, scalloped hem last, and the hero's
 *           own choreography starts on that beat (`startIntro`)
 *
 * Every beat runs on the compositor: the write-on and the stitch are pure
 * transform animations (a clip box sliding one way, the ink inside sliding
 * the other — see `.sig-pen/.sig-ink/.stitch-*` in globals.css) and the
 * fades are opacity. Nothing here is a `clip-path`, `width` or rAF-stepped
 * value, so the sequence keeps moving while the main thread is busy
 * compiling the hero's shaders — which is exactly when a cold Android start
 * used to freeze the earlier version mid-stroke and collapse several beats
 * into one. The percentage is the only JS-ticked number; if it hitches the
 * visuals do not.
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

/* ---- the timeline: one parent, children keyed by beat ---- */
const timeline: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.15, staggerChildren: 0 } },
};
const fullStop: Variants = {
  hidden: { opacity: 0, scale: 0.3 },
  show: { opacity: 1, scale: 1, transition: { delay: 1.05, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } },
};
const settle = (delay: number): Variants => ({
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { delay, duration: 0.6, ease: EASE_OUT } },
});

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
            {/* ---- the signature: the wordmark writes itself left → right;
                 a small heart is the pen, pausing at the end like a full stop ---- */}
            <div className="relative">
              {/* the pen: an overflow-hidden clip box slides in from the left
                  while the ink slides the opposite way — glyphs stay put, the
                  visible edge advances. Padding on both keeps the swashes. */}
              <span className={`block overflow-hidden px-[0.35em] py-[0.15em] font-script text-[4.2rem] leading-[1.15] text-cocoa md:text-[5.6rem] ${full ? "sig-pen" : ""}`}>
                <span className={`block ${full ? "sig-ink" : ""}`}>Whimlet</span>
              </span>
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
            </div>

            <motion.p variants={full ? settle(0.9) : undefined} className="mt-1 font-hand text-xl text-cocoa-soft md:text-2xl">
              one stitch at a time.
            </motion.p>

            {full && (
              <>
                {/* ---- the running stitch: a dashed seam that closes with real progress ---- */}
                <motion.div
                  variants={settle(1.2)}
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
