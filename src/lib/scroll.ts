"use client";

import type Lenis from "lenis";

/**
 * One scroll engine for the whole page.
 *
 * `SmoothScroll` (components/SmoothScroll.tsx) owns the Lenis instance and
 * registers it here; everything else talks to this module so nothing imports
 * Lenis directly:
 *   - modals/lightboxes call `lockScroll()` / `unlockScroll()` instead of
 *     poking `document.body.style.overflow` — with an inertial scroller the
 *     two must agree, or the wheel keeps "scrolling" a page that cannot move
 *     and jumps when the lock lifts;
 *   - `scrollToId()` gives anchors the same eased travel as the wheel.
 *
 * Without Lenis (reduced motion, no JS yet, tests) every helper degrades to
 * the native equivalent, so callers never branch.
 */

let lenis: Lenis | null = null;
let locks = 0;
let prevOverflow = "";

export function registerLenis(instance: Lenis | null): void {
  lenis = instance;
  // QA hook (headless tours jump sections with `immediate: true`)
  (window as unknown as { __lenis?: Lenis | null }).__lenis = instance;
}

export function getLenis(): Lenis | null {
  return lenis;
}

/** Nav offset used by anchor travel — matches `scroll-padding-top` in globals.css. */
export const ANCHOR_OFFSET = -96;

export function lockScroll(): void {
  locks++;
  if (locks > 1) return;
  prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  lenis?.stop();
}

export function unlockScroll(): void {
  locks = Math.max(0, locks - 1);
  if (locks > 0) return;
  document.body.style.overflow = prevOverflow;
  lenis?.start();
}

export function scrollToId(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis && !lenis.isStopped) {
    lenis.scrollTo(el, { offset: ANCHOR_OFFSET });
    return;
  }
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const top = el.getBoundingClientRect().top + window.scrollY + ANCHOR_OFFSET;
  window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
}
