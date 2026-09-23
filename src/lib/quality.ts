"use client";

import { useEffect, useState } from "react";
import { demoteByPressure, gpuScore, lowerTier, MAX_PRESSURE_DEMOTION, scoreDevice, tierFromScore, type Tier } from "@/lib/engine/capability";

/**
 * Device-tier detection for the 3D scenes.
 *
 * Cinematic ≠ expensive. Every canvas asks for a `Quality` and adapts its
 * DPR cap, particle counts and shadow resolution. Detection is a heuristic
 * (there is no reliable GPU API on the web) and is later *corrected at
 * runtime* by drei's PerformanceMonitor (see three/Stage.tsx), which lowers
 * DPR when measured frame-rate declines.
 */

export type { Tier };

export type Quality = {
  tier: Tier;
  /** R3F dpr range */
  dpr: [number, number];
  /** multiplier for particle/petal counts (0.4 … 1) */
  density: number;
  /** contact-shadow map resolution */
  shadowRes: number;
  /** cheap-mode flag for per-scene simplifications */
  simple: boolean;
  /** false for the SSR/first-paint placeholder, true once the device was probed */
  measured?: boolean;
};

const PRESETS: Record<Tier, Quality> = {
  high: { tier: "high", dpr: [1, 1.75], density: 1, shadowRes: 512, simple: false },
  mid: { tier: "mid", dpr: [1, 1.5], density: 0.7, shadowRes: 384, simple: false },
  low: { tier: "low", dpr: [1, 1.15], density: 0.4, shadowRes: 256, simple: true },
};

/** Probe once per page; a runtime demotion (see `demoteTier`) is remembered
 *  for the session so the next page does not re-learn it. */
let cached: Tier | null = null;
const DEMOTE_KEY = "whimlet-tier-cap";
const listeners = new Set<() => void>();

export function detectTier(): Tier {
  if (cached) return cached;
  if (typeof window === "undefined") return "mid";

  // QA override: ?quality=low|mid|high (lets a reviewer see every tier on one device)
  const forced = new URLSearchParams(window.location.search).get("quality");
  if (forced === "low" || forced === "mid" || forced === "high") {
    cached = forced;
    return cached;
  }

  const cores = navigator.hardwareConcurrency ?? 4;
  // deviceMemory is Chromium-only; absent ⇒ neutral
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.matchMedia("(max-width: 767px)").matches;

  // The GPU is the thing that actually runs the scenes — read its name.
  // Software renderers (SwiftShader, llvmpipe, Mesa on VMs) → low, always.
  // Recognised mobile GPUs decide the tier by class (engine/capability.ts);
  // an unrecognised string on a phone keeps the old cautious −1.
  let gpu: number | null = null;
  let software = false;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGLRenderingContext | null;
    const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
    const renderer: string = dbg ? String(gl!.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    if (/swiftshader|llvmpipe|software|mesa offscreen/i.test(renderer)) software = true;
    else gpu = gpuScore(renderer);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    /* ignore — heuristics only */
  }

  const score = scoreDevice({ cores, mem, gpu, software, coarseSmall: coarse && small });

  let tier = tierFromScore(score);
  // remembered demotion from an earlier page this session
  try {
    const cap = sessionStorage.getItem(DEMOTE_KEY) as Tier | null;
    if (cap && ORDER[cap] < ORDER[tier]) tier = cap;
  } catch {
    /* private mode */
  }
  cached = tier;
  baseTier = tier;
  return cached;
}

const ORDER: Record<Tier, number> = { low: 0, mid: 1, high: 2 };

/** Subscribe to runtime tier changes (returns the unsubscribe). */
export function onTierChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/* ------------------------------------------------------------------ *
 * Device-strain governor (v0.27.0, engine-only).
 *
 * `sessionTier()` is the *effective* tier — the measured tier, demoted at
 * most one hop while the device reports pressure, and restored when it cools.
 * It is in-memory only by design: thermal events are transient (they happen
 * during a session), so they must never be written to the `DEMOTE_KEY` that
 * records *evidence-based* demotions (`demoteTier` — a starving scene, which
 * persists across pages). The one-hop budget keeps the GPU class
 * authoritative; anything deeper is `PerformanceMonitor`'s runtime job.
 * Fans out through the existing `listeners`, so canvases, the glass level
 * and parity all react together exactly as they already do for a demote.
 * ------------------------------------------------------------------ */
let pressureLevel = 0; // 0 = none, 1 = demoted once (never more)
let baseTier: Tier | null = null;

/** The effective tier right now: measured tier clamped by pressure/temperature. */
export function sessionTier(): Tier {
  const base = baseTier ?? detectTier();
  baseTier = base;
  if (pressureLevel <= 0) return base;
  return demoteByPressure(base);
}

/**
 * Strain → governor (called by the scheduler via EngineProvider): apply the
 * pressure clamp (1) or release it (0). Demoting is instant; the caller gates
 * *release* on a settled page so the restored quality never lands on a frame
 * the visitor is still watching. Returns the new effective tier.
 */
export function applyStrain(level: number): Tier {
  const base = baseTier ?? detectTier();
  baseTier = base;
  const target = level > 0 ? Math.min(level, MAX_PRESSURE_DEMOTION) : 0;
  const changed = target !== pressureLevel;
  pressureLevel = target;
  if (changed) listeners.forEach((l) => l());
  return sessionTier();
}

/** QA: is the pressure governor currently holding the tier down? */
export function pressureHeld(): boolean {
  return pressureLevel > 0;
}

/**
 * Runtime correction: a canvas that still starves at DPR 1 is telling us the
 * prior was wrong. Step the session tier down once (never below low) — every
 * mounted scene re-reads the preset, and the next page starts there too.
 */
export function demoteTier(): Tier {
  const cur = detectTier();
  if (cur === "low") return cur;
  const next = lowerTier(cur);
  cached = next;
  baseTier = next; // a starving scene *is* new evidence about this device
  try {
    sessionStorage.setItem(DEMOTE_KEY, next);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
  return next;
}

/** Reactive quality preset — "mid" during SSR/first paint, measured after mount.
 *  Reads the *effective* tier so pressure demotions reach mounted scenes. */
export function useQuality(): Quality {
  const [q, setQ] = useState<Quality>(PRESETS.mid);
  useEffect(() => {
    const sync = () => setQ({ ...PRESETS[sessionTier()], measured: true });
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);
  return q;
}

/** React-state-free `sync` body so the hook stays single-source. */
function exploreTier(): Quality | undefined {
  return undefined;
}

export const QUALITY_PRESETS = PRESETS;
