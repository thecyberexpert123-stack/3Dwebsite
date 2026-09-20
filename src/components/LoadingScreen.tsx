"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { startIntro, useHeroReady } from "@/lib/intro";

/**
 * The curtain. A yarn loop draws a heart while the hero scene compiles its
 * shaders behind it; the moment the hero has painted its first frame (or a
 * hard cap of 2.4s passes — nobody waits on a slow GPU), the curtain lifts
 * and `startIntro()` fires: headline, buttons and 3D choreography all begin
 * from that one shared beat instead of playing unseen behind the loader.
 *
 * Client-only: SSR and no-JS visitors never see it (and the intro store's
 * server snapshot keeps the hero visible for them).
 */
export function LoadingScreen() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [gone, setGone] = useState(false);
  const reduce = useReducedMotion();
  const heroReady = useHeroReady();

  useEffect(() => {
    setMounted(true);
    setVisible(true);
  }, []);

  // lift the curtain: min hold (so the mark is perceived) · hero ready · hard cap.
  // `shownAt` is fixed once — re-running this effect (heroReady flips, the
  // media query resolves) must never restart the clock.
  const shownAt = useRef<number | null>(null);
  const lifted = useRef(false);
  useEffect(() => {
    if (!mounted || gone) return;
    if (shownAt.current === null) shownAt.current = performance.now();
    const minHold = reduce ? 250 : 900;
    const hardCap = reduce ? 600 : 2400;

    const lift = () => {
      if (lifted.current) return;
      lifted.current = true;
      setVisible(false);
      startIntro();
      setTimeout(() => setGone(true), 750);
    };

    const elapsed = performance.now() - shownAt.current;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (heroReady) timers.push(setTimeout(lift, Math.max(0, minHold - elapsed)));
    timers.push(setTimeout(lift, Math.max(0, hardCap - elapsed)));
    return () => timers.forEach(clearTimeout);
  }, [mounted, gone, heroReady, reduce]);

  if (!mounted || gone) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ivory"
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0.2 } }
              : {
                  // the curtain lifts: fades while the mark drifts up and the
                  // background parts along a soft radial — reads as a reveal, not a cut
                  opacity: 0,
                  clipPath: "circle(0% at 50% 50%)",
                  transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] },
                }
          }
          style={{ clipPath: "circle(150% at 50% 50%)" }}
        >
          <svg viewBox="0 0 24 24" className="h-16 w-16 text-rose">
            <path
              d="M12 20.2C7.6 17.4 3.4 13.9 3.4 9.6 3.4 6.9 5.5 5 8 5c1.6 0 3 .8 4 2.1C13 5.8 14.4 5 16 5c2.5 0 4.6 1.9 4.6 4.6 0 4.3-4.2 7.8-8.6 10.6z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeDasharray="120"
              strokeDashoffset={reduce ? 0 : 120}
              style={reduce ? undefined : { animation: "draw 1s ease-out forwards" }}
            />
          </svg>
          <motion.p
            className="mt-5 font-script text-4xl text-cocoa md:text-5xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
          >
            Whimlet
          </motion.p>
          <motion.p
            className="mt-1.5 font-hand text-lg text-cocoa-soft"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            one stitch at a time.
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
