"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { useReducedMotion } from "framer-motion";
import { registerLenis, ANCHOR_OFFSET } from "@/lib/scroll";

/**
 * Inertial page scroll (Lenis, MIT) — the thing that makes every
 * scroll-linked motion on the page (parallax, sticky stage, reveals) read as
 * one continuous camera move instead of a series of wheel notches.
 *
 * Decisions:
 *   - `lerp: 0.085` — a little slower than Lenis' default; the page is a
 *     picnic, not a launch site.
 *   - Touch stays native (`syncTouch: false`): phones already have inertia
 *     and hijacking it is the classic smooth-scroll mistake.
 *   - Reduced motion → Lenis is not created at all (native scroll).
 *   - Anchors (`<a href="#…">`) get the same eased travel and the nav offset.
 *   - `data-lenis-prevent` marks nested scrollers (modals) so they scroll
 *     natively; modals also `lockScroll()` (lib/scroll) so the page and the
 *     smoother pause together.
 */
export function SmoothScroll() {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    // never smooth inside the loading door, and never on hover-less devices'
    // wheel emulation — Lenis handles the latter; the former is scroll-locked
    const lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.95,
      smoothWheel: true,
      syncTouch: false,
      anchors: { offset: ANCHOR_OFFSET },
      prevent: (node) => node.hasAttribute("data-lenis-prevent"),
    });
    registerLenis(lenis);
    document.documentElement.classList.add("lenis-on");

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      registerLenis(null);
      document.documentElement.classList.remove("lenis-on");
      lenis.destroy();
    };
  }, [reduce]);

  return null;
}
