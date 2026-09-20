"use client";

import { useSyncExternalStore } from "react";

/**
 * Intro choreography store.
 *
 * The loading screen, the hero copy and the hero 3D scene all need to agree on
 * ONE moment: "the curtain is up". Before this change the headline stagger and
 * the scene's first frames played *behind* the loader and nobody saw them.
 *
 * Tiny external store (no dependency): `startIntro()` flips once, listeners
 * re-render via useSyncExternalStore. Server snapshot is `false` so SSR and
 * the first client paint agree (no hydration mismatch).
 */

let started = false;
let heroReady = false;
const listeners = new Set<() => void>();

export function startIntro(): void {
  if (started) return;
  started = true;
  listeners.forEach((l) => l());
}

/** The hero canvas calls this after its first rendered frame (shaders compiled). */
export function markHeroReady(): void {
  if (heroReady) return;
  heroReady = true;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useIntroStarted(): boolean {
  return useSyncExternalStore(subscribe, () => started, () => false);
}

export function useHeroReady(): boolean {
  return useSyncExternalStore(subscribe, () => heroReady, () => false);
}

/* ------------------------------------------------------------------
   Timing helpers shared by the DOM and the 3D choreography
   ------------------------------------------------------------------ */

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** 0→1 over [start, start+duration] seconds of intro time. */
export function seg(t: number, start: number, duration: number): number {
  return clamp01((t - start) / duration);
}

export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

export const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

/** Soft overshoot — the handmade "pop". */
export function easeOutBack(x: number, overshoot = 1.5): number {
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + overshoot * Math.pow(x - 1, 2);
}

export const smoothstep = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
