"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { startIntro } from "@/lib/intro";
import { useWebGL } from "@/lib/hooks";
import { GiftDoodle, SparkleDoodle } from "./Decorations";
import { lockScroll, unlockScroll } from "@/lib/scroll";

const GiftIntroScene = dynamic(() => import("./three/GiftIntroScene"), { ssr: false });

/**
 * The door — a gift you unwrap to enter.
 *
 * First visit in a session: a plump 3D gift box waits under the Whimlet mark.
 * Tap the bow (or press "Unwrap") → the lid pops, hearts and confetti burst,
 * the camera pushes into the box and the curtain irises out onto the hero,
 * whose own choreography starts from that exact beat (`startIntro`).
 *
 * Nobody is held hostage: the box unwraps itself after a few seconds, there is
 * a keyboard-reachable "Unwrap" button and a "skip" link, reduced-motion gets
 * a quick simple curtain, and no-WebGL gets a drawn gift with the same button.
 * Repeat visits in the same tab skip straight to a short curtain.
 *
 * Client-only: SSR and no-JS visitors never see it.
 */

const SESSION_KEY = "whimlet:unwrapped";

/** QA override (like `?quality=`): `?intro=skip` bypasses the door,
 *  `?intro=hold` keeps it up after unwrapping so the end pose can be reviewed,
 *  `?intro=gift` forces the gift even on repeat visits. */
function introOverride(): "skip" | "hold" | "gift" | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("intro");
  return v === "skip" || v === "hold" || v === "gift" ? v : null;
}

export function LoadingScreen() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [gone, setGone] = useState(false);
  const [mode, setMode] = useState<"gift" | "quick">("gift");
  const [opened, setOpened] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  // honest loading stages: the 3D chunk arriving (dynamic import resolved ⇒
  // the scene component mounted), then shaders compiling (first frame), then
  // the meadow fades in. `pct` is what the ring shows; it only ever moves
  // forward, and it eases toward each stage's ceiling while we wait so a slow
  // network never looks frozen.
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [pct, setPct] = useState(0);
  const reduce = useReducedMotion();
  const webgl = useWebGL();
  const override = useRef<ReturnType<typeof introOverride>>(null);

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
    setMode(seen && override.current !== "gift" && override.current !== "hold" ? "quick" : "gift");
    setMounted(true);
    setVisible(true);
  }, []);

  // progress ring: creep toward the current stage's ceiling; jump on stage change
  useEffect(() => {
    if (!mounted || gone) return;
    const ceiling = stage === 0 ? 0.38 : stage === 1 ? 0.86 : 1;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setPct((p) => {
        if (p >= ceiling - 0.001) return stage === 2 ? 1 : p;
        // ease-out toward the ceiling: fast at first, slower as it nears
        const next = p + (ceiling - p) * (stage === 2 ? 6 : 0.9) * dt;
        return Math.min(ceiling, next);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mounted, gone, stage]);

  useEffect(() => {
    if (sceneReady) setStage(2);
  }, [sceneReady]);

  // lock the page while the door is closed
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
    setTimeout(() => setGone(true), 900);
  }, []);

  /* ---- quick mode (repeat visit / reduced motion): a short curtain ---- */
  useEffect(() => {
    if (!mounted || gone) return;
    if (mode === "quick" || reduce) {
      const t = setTimeout(lift, reduce ? 350 : 700);
      return () => clearTimeout(t);
    }
  }, [mounted, gone, mode, reduce, lift]);

  /* ---- gift mode: unwrap on tap; auto-unwrap after a polite wait ---- */
  const unwrap = useCallback(() => {
    setOpened((o) => (o ? o : true));
  }, []);

  useEffect(() => {
    if (!mounted || gone || mode !== "gift" || reduce) return;
    if (opened || override.current === "hold") return;
    // the wait starts once the visitor can actually see the box
    const t = setTimeout(unwrap, sceneReady || webgl === false ? 5200 : 8000);
    return () => clearTimeout(t);
  }, [mounted, gone, mode, reduce, opened, sceneReady, webgl, unwrap]);

  useEffect(() => {
    if (!opened || override.current === "hold") return;
    // the lid pops at 0.25s, the burst at 0.4s, the bouquet springs up 0.4–0.95s,
    // the camera pushes in from 0.55s — the curtain irises out once the bouquet
    // has been *seen* (≈0.5s of hold), landing on the hero that grows it in full.
    const t = setTimeout(lift, webgl === false ? 700 : 1900);
    return () => clearTimeout(t);
  }, [opened, lift, webgl]);

  // keyboard: Enter / Space anywhere unwraps (the button also works natively)
  useEffect(() => {
    if (!visible || mode !== "gift") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        unwrap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, mode, unwrap]);

  // HARD FAILSAFE: always lift after 12s even if 3D fails — never block the site
  useEffect(() => {
    if (!mounted || gone) return;
    const t = setTimeout(() => {
      if (!lifted.current) {
        console.warn("[Whimlet] LoadingScreen failsafe lift after 12s");
        lift();
      }
    }, 12000);
    return () => clearTimeout(t);
  }, [mounted, gone, lift]);

  if (!mounted || gone) return null;

  const gift = mode === "gift" && !reduce;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role={gift ? "dialog" : undefined}
          aria-modal={gift ? true : undefined}
          aria-label={gift ? "Welcome — unwrap to enter Whimlet" : undefined}
          aria-hidden={gift ? undefined : true}
          className="candy fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0.25 } }
              : {
                  // iris out from the gift's opening onto the hero — a reveal, not a cut
                  clipPath: "circle(0% at 50% 52%)",
                  transition: { duration: 0.85, ease: [0.76, 0, 0.24, 1] },
                }
          }
          style={{ clipPath: "circle(150% at 50% 52%)" }}
        >
          {/* soft dot texture over the candy wash — the loading backdrop; the
              meadow fades in over it once its first frame is painted */}
          <div className="polka pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply" aria-hidden="true" />

          {/* the meadow fills the whole door; the mark and the invitation float over it */}
          {gift && webgl !== false && (
            <div className={`absolute inset-0 transition-opacity duration-700 ${sceneReady ? "opacity-100" : "opacity-0"}`}>
              <GiftIntroScene
                opened={opened}
                onTap={unwrap}
                onMount={() => setStage((st) => (st < 1 ? 1 : st))}
                onReady={() => setSceneReady(true)}
                reduced={!!reduce}
              />
              {/* legibility: a soft light veil at the top and bottom edges only */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-white/55 to-transparent" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/25 to-transparent" />
            </div>
          )}

          {/* the mark */}
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: opened || (gift && webgl !== false && !sceneReady) ? 0 : 1, y: opened ? -14 : 0 }}
            transition={{ duration: opened ? 0.35 : 0.6, delay: opened ? 0 : 0.2 }}
          >
            <p className="font-script text-5xl text-cocoa md:text-6xl">Whimlet</p>
            <p className="mt-1 font-hand text-lg text-cocoa-soft">
              {gift ? "a little something, just for you" : "one stitch at a time."}
            </p>
          </motion.div>

          {/* ---- the loading card: a glass tag hanging in the middle of the door
               while the meadow arrives. Real progress (chunk → shaders → first
               frame), a running stitch around a heart, and one line that says
               what is happening. It irises away once the scene is up. ---- */}
          {gift && webgl !== false && (
            <AnimatePresence>
              {!sceneReady && (
                <motion.div
                  key="loading-card"
                  role="status"
                  aria-live="polite"
                  className="glass-panel absolute left-1/2 top-1/2 z-20 flex w-[min(86vw,22rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4 px-8 py-8 text-center"
                  initial={{ opacity: 0, scale: 0.94, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)", transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                >
                  <SparkleDoodle aria-hidden="true" className="absolute -right-2 -top-2 h-7 w-7 animate-twinkle text-lavender-deep" />
                  <SparkleDoodle aria-hidden="true" className="absolute -left-2 bottom-6 h-5 w-5 animate-twinkle text-rose-ink [animation-delay:0.9s]" />
                  <div className="relative h-24 w-24">
                    {/* progress ring: a stitched seam that closes as we load */}
                    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                      <circle cx="50" cy="50" r="44" fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth="3" />
                      <circle
                        cx="50"
                        cy="50"
                        r="44"
                        fill="none"
                        stroke="var(--color-rose)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray="3.2 3.2"
                        pathLength="100"
                        style={{ strokeDashoffset: 0, strokeDasharray: `${pct * 100} 100`, transition: "stroke-dasharray 0.25s linear" }}
                      />
                    </svg>
                    {/* the heart in the middle beats a little faster as it fills */}
                    <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-9 w-9 text-rose-ink" aria-hidden="true">
                      <path
                        d="M12 20.2C7.6 17.4 3.4 13.9 3.4 9.6 3.4 6.9 5.5 5 8 5c1.6 0 3 .8 4 2.1C13 5.8 14.4 5 16 5c2.5 0 4.6 1.9 4.6 4.6 0 4.3-4.2 7.8-8.6 10.6z"
                        fill="rgb(240 124 140 / 0.18)"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeDasharray="120"
                        strokeDashoffset={reduce ? 0 : 120}
                        style={reduce ? undefined : { animation: "draw 0.9s ease-out forwards" }}
                        className={reduce ? undefined : "origin-center animate-heartbeat"}
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-hand text-xl text-cocoa">
                      {stage === 0 ? "wrapping your gift…" : stage === 1 ? "tying the bow…" : "ready!"}
                    </p>
                    <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.26em] text-cocoa-soft">
                      <span className="tabular-nums">{Math.round(pct * 100)}</span>%
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={lift}
                    className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-cocoa-soft/80 underline-offset-4 transition-colors hover:text-rose-ink hover:underline"
                  >
                    skip the intro
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {gift ? (
            <>
              {/* the drawn gift stands in until the meadow's first frame (or for good without WebGL);
                  once the 3D is up this box is just the spacer the copy is laid out around */}
              <div className="pointer-events-none relative z-0 mt-2 h-[52vh] min-h-[300px] w-full max-w-3xl md:h-[56vh]">
                {webgl === false && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.button
                      type="button"
                      onClick={unwrap}
                      aria-label="Unwrap the gift"
                      className="pointer-events-auto relative text-rose-ink"
                      animate={opened ? { scale: [1, 1.12, 0], rotate: [0, -6, 8] } : { y: [0, -8, 0] }}
                      transition={opened ? { duration: 0.6 } : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <GiftDoodle className="h-36 w-36 md:h-44 md:w-44" strokeWidth={1.1} />
                      <SparkleDoodle className="absolute -right-4 -top-3 h-7 w-7 animate-twinkle text-lavender-deep" />
                      <SparkleDoodle className="absolute -left-5 bottom-8 h-5 w-5 animate-twinkle text-rose-ink [animation-delay:0.9s]" />
                    </motion.button>
                  </div>
                )}
              </div>

              {/* the invitation */}
              <motion.div
                className="relative z-10 -mt-2 flex flex-col items-center gap-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: opened || !(sceneReady || webgl === false) ? 0 : 1, y: opened ? 10 : 0 }}
                transition={{ duration: 0.5, delay: opened ? 0 : 0.35 }}
                style={{ pointerEvents: opened || !(sceneReady || webgl === false) ? "none" : "auto" }}
              >
                <button type="button" onClick={unwrap} className="btn btn-primary btn-lg min-w-48">
                  Unwrap
                  <SparkleDoodle className="h-4 w-4" />
                </button>
                <p className="font-hand text-lg text-cocoa-soft">or tap the bow <span className="hidden md:inline">· or press enter</span></p>
                <button
                  type="button"
                  onClick={lift}
                  className="text-xs font-semibold uppercase tracking-[0.25em] text-cocoa-soft/70 underline-offset-4 transition-colors hover:text-rose-ink hover:underline"
                >
                  skip
                </button>
              </motion.div>
            </>
          ) : (
            <svg viewBox="0 0 24 24" className="relative z-10 mt-6 h-14 w-14 text-rose-ink" aria-hidden="true">
              <path
                d="M12 20.2C7.6 17.4 3.4 13.9 3.4 9.6 3.4 6.9 5.5 5 8 5c1.6 0 3 .8 4 2.1C13 5.8 14.4 5 16 5c2.5 0 4.6 1.9 4.6 4.6 0 4.3-4.2 7.8-8.6 10.6z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeDasharray="120"
                strokeDashoffset={reduce ? 0 : 120}
                style={reduce ? undefined : { animation: "draw 0.7s ease-out forwards" }}
              />
            </svg>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
