"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * A brief "yarn loop drawing a heart" welcome — capped at ~1.2s so it never
 * makes anyone wait. Client-only: SSR and no-JS visitors never see it.
 */
export function LoadingScreen() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [gone, setGone] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    setMounted(true);
    // tiny delay so the entrance is perceived, then dismissed
    const showTimer = setTimeout(() => setVisible(true), 0);
    let hidden = false;
    const hide = () => {
      if (hidden) return;
      hidden = true;
      setVisible(false);
      setTimeout(() => setGone(true), 700);
    };
    const hideTimer = setTimeout(hide, reduce ? 350 : 1150);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [reduce]);

  if (!mounted || gone) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ivory"
          exit={{ opacity: 0, transition: { duration: 0.55, ease: "easeOut" } }}
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
