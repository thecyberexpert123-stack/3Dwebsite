"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useMediaQuery } from "@/lib/hooks";

/**
 * Heart trail 2.0 — cinematic cursor companion
 *
 * Upgraded from simple hearts to a mixed trail: hearts + yarn sparkles + tiny thread
 * - Pool of 20 nodes recycled (no GC per move)
 * - Distance + time gated (26px / 42ms)
 * - Each spawn: random type (70% heart, 20% sparkle, 10% yarn dot)
 * - Compositor-only transform/opacity animations
 * - Fine pointers only, respects prefers-reduced-motion
 */

const POOL = 20;
const MIN_DIST = 26;
const MIN_GAP_MS = 42;
const COLORS = ["#F07C8C", "#E07A9A", "#F3A8BF", "#B89BE6", "#7FAE92", "#F9C6D3", "#FFE9A8"];

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
      root.appendChild(el);
      nodes.push(el);
    }

    let idx = 0;
    let lastX = -1e9;
    let lastY = -1e9;
    let lastT = 0;

    const heartSVG = (size: number) =>
      `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="M12 20.2C7.6 17.4 3.4 13.9 3.4 9.6 3.4 6.9 5.5 5 8 5c1.6 0 3 .8 4 2.1C13 5.8 14.4 5 16 5c2.5 0 4.6 1.9 4.6 4.6 0 4.3-4.2 7.8-8.6 10.6z"/></svg>`;
    const sparkleSVG = (size: number) =>
      `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z"/></svg>`;
    const yarnDot = (size: number) =>
      `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:currentColor;box-shadow:0 0 6px currentColor, inset 0 1px 2px rgba(255,255,255,0.6)"></span>`;

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
      const r = Math.random();
      const size = 8 + Math.random() * 10;
      const drift = (Math.random() - 0.5) * 48;
      const rot = (Math.random() - 0.5) * 70;
      const lift = -20 - Math.random() * 40;

      let html: string;
      if (r < 0.7) html = heartSVG(Math.round(size));
      else if (r < 0.9) html = sparkleSVG(Math.round(size * 0.85));
      else html = yarnDot(Math.round(size * 0.7));

      el.innerHTML = html;
      el.style.color = COLORS[(Math.random() * COLORS.length) | 0];
      el.style.setProperty("--x", `${e.clientX - size / 2}px`);
      el.style.setProperty("--y", `${e.clientY - size / 2}px`);
      el.style.setProperty("--dx", `${drift}px`);
      el.style.setProperty("--dy", `${lift}px`);
      el.style.setProperty("--rot", `${rot}deg`);
      el.style.setProperty("--size", `${size}px`);
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
