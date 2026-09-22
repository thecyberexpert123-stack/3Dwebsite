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

/**
 * Nav offset for the *native* anchor path — matches `scroll-padding-top`
 * (6rem) in globals.css, which `window.scrollTo` does not apply.
 *
 * Lenis (≥ 1.3) reads `scroll-padding-top` and the target's `scroll-margin`
 * itself when it resolves an element target, so it gets `LENIS_ANCHOR_OFFSET`
 * (0) — passing −96 as well landed every anchor 192 px low, with the section
 * heading hidden under nothing.
 */
export const ANCHOR_OFFSET = -96;
export const LENIS_ANCHOR_OFFSET = 0;

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
    lenis.scrollTo(el, { offset: LENIS_ANCHOR_OFFSET });
    return;
  }
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const top = el.getBoundingClientRect().top + window.scrollY + ANCHOR_OFFSET;
  window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
}
