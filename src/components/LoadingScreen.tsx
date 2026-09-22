"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { startIntro, useHeroReady } from "@/lib/intro";
import { useWebGL } from "@/lib/hooks";
import { lockScroll, unlockScroll } from "@/lib/scroll";

/**
 * The signature — Whimlet's loading page.
 *
 * One idea, done quietly: the wordmark writes itself across the page like a
 * name being signed on a gift tag, a running stitch fills underneath with the
 * *real* progress (page assets → the meadow's first frame), and the curtain
 * lifts straight up onto the hero, whose own choreography starts on that beat
 * (`startIntro`). No box to open, nothing to tap — the visitor is never asked
 * to do anything to get in.
 *
 * Why this shape (see AGENT-EXPERIENCE v0.18.0): waits with visible, honest
 * progress feel 11–15 % shorter and are abandoned less; a determinate
 * indicator is the right tool for a 1–5 s wait; a fast start / slow finish
 * reads quicker than a linear one; and the strongest loaders of the last few
 * years are a brand signature + a counter + a single directed exit — not a
 * mini-game. Everything here is DOM + CSS: it must paint before any 3D chunk
 * arrives, so it costs nothing to load.
 *
 * Repeat visits in the same tab get a short curtain. Reduced motion gets the
 * mark in place and a plain fade. No WebGL lifts on the minimum hold. A hard
 * cap lifts the curtain even if the hero never reports ready (blocked GPU,
 * very slow network) — the loader can only ever *delay*, never trap.
 *
 * Client-only: SSR and no-JS visitors never see it.
 */

const SESSION_KEY = "whimlet:entered";
/** the signature needs this long to be *seen*: write-on 1.1 s + a beat */
const MIN_SHOW_MS = 1500;
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

export function LoadingScreen() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [gone, setGone] = useState(false);
  const [mode, setMode] = useState<"full" | "quick">("full");
  const [written, setWritten] = useState(false);
  // honest stages: 0 = page assets still arriving, 1 = loaded, the meadow is
  // compiling its shaders, 2 = first frame painted. `pct` only moves forward
  // and eases toward each stage's ceiling, so a slow network never looks
  // frozen and the finish is a quick snap to 100.
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [pct, setPct] = useState(0);
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
    // the pen starts on the next frame so the write-on transitions from blank
    const raf = requestAnimationFrame(() => setWritten(true));
    return () => cancelAnimationFrame(raf);
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

  // the stitch: creep toward the current stage's ceiling, snap on the last
  useEffect(() => {
    if (!mounted || gone) return;
    const ceiling = stage === 0 ? 0.42 : stage === 1 ? 0.88 : 1;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setPct((p) => {
        if (p >= ceiling - 0.001) return stage === 2 ? 1 : p;
        return Math.min(ceiling, p + (ceiling - p) * (stage === 2 ? 7 : 1.1) * dt);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mounted, gone, stage]);

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
    setTimeout(() => setGone(true), 1000);
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

  if (!mounted || gone) return null;

  const full = mode === "full" && !reduce;
  const shown = Math.round(pct * 100);
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
            exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.4, ease: EASE_CURTAIN } }}
          >
            {/* ---- the signature: the wordmark writes itself left → right;
                 a small heart is the pen, pausing at the end like a full stop ---- */}
            <div className="relative">
              <span
                className="font-script block text-[4.2rem] leading-[1.15] text-cocoa md:text-[5.6rem]"
                style={{
                  clipPath: written || !full ? "inset(-20% -6% -20% -2%)" : "inset(-20% 104% -20% -2%)",
                  transition: full ? "clip-path 1.1s cubic-bezier(0.65, 0, 0.35, 1) 0.15s" : undefined,
                }}
              >
                Whimlet
              </span>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="absolute -right-4 top-[38%] h-5 w-5 text-rose-ink md:-right-5 md:h-6 md:w-6"
                style={{
                  opacity: written || !full ? 1 : 0,
                  transform: written || !full ? "scale(1)" : "scale(0.3)",
                  transition: full ? "opacity 0.35s ease 1.15s, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1.15s" : undefined,
                }}
              >
                <path
                  d="M12 20.2C7.6 17.4 3.4 13.9 3.4 9.6 3.4 6.9 5.5 5 8 5c1.6 0 3 .8 4 2.1C13 5.8 14.4 5 16 5c2.5 0 4.6 1.9 4.6 4.6 0 4.3-4.2 7.8-8.6 10.6z"
                  fill="rgb(240 124 140 / 0.22)"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className={full ? "origin-center animate-heartbeat" : undefined}
                />
              </svg>
            </div>

            <p
              className="mt-1 font-hand text-xl text-cocoa-soft md:text-2xl"
              style={{
                opacity: written || !full ? 1 : 0,
                transform: written || !full ? "translateY(0)" : "translateY(6px)",
                transition: full ? "opacity 0.6s ease 0.9s, transform 0.6s ease 0.9s" : undefined,
              }}
            >
              one stitch at a time.
            </p>

            {full && (
              <>
                {/* ---- the running stitch: a dashed seam that closes with real progress ---- */}
                <div
                  className="relative mt-9 h-[3px] w-[min(60vw,15rem)]"
                  style={{
                    opacity: written ? 1 : 0,
                    transition: "opacity 0.6s ease 1.1s",
                  }}
                  aria-hidden="true"
                >
                  <div className="absolute inset-0 rounded-full border-t-2 border-dashed border-blush-deep/45" />
                  <div
                    className="absolute inset-y-0 left-0 overflow-hidden"
                    style={{ width: `${pct * 100}%`, transition: "width 0.25s linear" }}
                  >
                    <div className="h-full w-[min(60vw,15rem)] border-t-2 border-dashed border-rose" />
                  </div>
                  {/* the needle at the seam's leading edge */}
                  <span
                    className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-rose shadow-[0_0_0_4px_rgb(240_124_140_/_0.18)]"
                    style={{ left: `calc(${pct * 100}% - 4px)`, transition: "left 0.25s linear" }}
                  />
                </div>

                <p
                  className="mt-4 flex items-baseline gap-3 text-[0.68rem] font-bold uppercase tracking-[0.26em] text-cocoa-soft"
                  style={{ opacity: written ? 1 : 0, transition: "opacity 0.6s ease 1.2s" }}
                >
                  <span className="tabular-nums text-rose-ink">{shown}%</span>
                  <span className="font-hand text-base normal-case tracking-normal text-cocoa-soft">{line}</span>
                </p>

                <button
                  type="button"
                  onClick={lift}
                  className="mt-10 text-[0.66rem] font-semibold uppercase tracking-[0.25em] text-cocoa-soft/70 underline-offset-4 transition-colors hover:text-rose-ink hover:underline"
                  style={{ opacity: written ? 1 : 0, transition: "opacity 0.6s ease 1.6s" }}
                >
                  skip
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
