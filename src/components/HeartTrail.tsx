"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useMediaQuery } from "@/lib/hooks";

/**
 * Heart trail — tiny pastel hearts drift off the cursor as it moves.
 *
 * The girly-aesthetic signature, engineered so it never costs anything:
 * - a fixed pool of 18 DOM nodes is recycled (no allocation per move),
 * - spawns are distance-gated (one heart per ~26 px travelled) and
 *   rate-limited, so a fast swipe doesn't carpet the page,
 * - motion is a single CSS animation per spawn (compositor-only
 *   transform/opacity), no per-frame JS,
 * - fine pointers only (`hover: hover` + `pointer: fine`), and off entirely
 *   for `prefers-reduced-motion`.
 * Purely decorative: aria-hidden, pointer-events: none.
 */

const POOL = 18;
const MIN_DIST = 26;
const MIN_GAP_MS = 45;
const COLORS = ["#F07C8C", "#E07A9A", "#F3A8BF", "#B89BE6", "#7FAE92", "#F9C6D3"];

export function HeartTrail() {
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduce = useReducedMotion();
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!finePointer || reduce || !layer.current) return;
    const root = layer.current;
    const nodes: HTMLSpanElement[] = [];
    for (let i = 0; i < POOL; i++) {
      const el = document.createElement("span");
      el.className = "heart-trail-dot";
      el.innerHTML =
        '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 20.2C7.6 17.4 3.4 13.9 3.4 9.6 3.4 6.9 5.5 5 8 5c1.6 0 3 .8 4 2.1C13 5.8 14.4 5 16 5c2.5 0 4.6 1.9 4.6 4.6 0 4.3-4.2 7.8-8.6 10.6z"/></svg>';
      root.appendChild(el);
      nodes.push(el);
    }

    let idx = 0;
    let lastX = -1e9;
    let lastY = -1e9;
    let lastT = 0;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (dx * dx + dy * dy < MIN_DIST * MIN_DIST || now - lastT < MIN_GAP_MS) return;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;

      const el = nodes[idx];
      idx = (idx + 1) % POOL;
      const size = 9 + Math.random() * 8;
      const drift = (Math.random() - 0.5) * 40;
      const rot = (Math.random() - 0.5) * 60;
      el.style.color = COLORS[(Math.random() * COLORS.length) | 0];
      el.style.setProperty("--x", `${e.clientX - size / 2}px`);
      el.style.setProperty("--y", `${e.clientY - size / 2}px`);
      el.style.setProperty("--dx", `${drift}px`);
      el.style.setProperty("--rot", `${rot}deg`);
      el.style.setProperty("--size", `${size}px`);
      // restart the animation on a recycled node
      el.classList.remove("is-live");
      void el.offsetWidth;
      el.classList.add("is-live");
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      nodes.forEach((n) => n.remove());
    };
  }, [finePointer, reduce]);

  return <div ref={layer} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[95] overflow-hidden" />;
}
