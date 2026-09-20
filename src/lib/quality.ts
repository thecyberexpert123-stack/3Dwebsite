"use client";

import { useEffect, useState } from "react";

/**
 * Device-tier detection for the 3D scenes.
 *
 * Cinematic ≠ expensive. Every canvas asks for a `Quality` and adapts its
 * DPR cap, particle counts and shadow resolution. Detection is a heuristic
 * (there is no reliable GPU API on the web) and is later *corrected at
 * runtime* by drei's PerformanceMonitor (see three/Stage.tsx), which lowers
 * DPR when measured frame-rate declines.
 */

export type Tier = "low" | "mid" | "high";

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
};

const PRESETS: Record<Tier, Quality> = {
  high: { tier: "high", dpr: [1, 1.75], density: 1, shadowRes: 512, simple: false },
  mid: { tier: "mid", dpr: [1, 1.5], density: 0.7, shadowRes: 384, simple: false },
  low: { tier: "low", dpr: [1, 1.15], density: 0.4, shadowRes: 256, simple: true },
};

/** Probe once; the answer does not change during a session. */
let cached: Tier | null = null;

export function detectTier(): Tier {
  if (cached) return cached;
  if (typeof window === "undefined") return "mid";

  // QA override: ?quality=low|mid|high (lets a reviewer see every tier on one device)
  const forced = new URLSearchParams(window.location.search).get("quality");
  if (forced === "low" || forced === "mid" || forced === "high") {
    cached = forced;
    return cached;
  }

  let score = 0;

  const cores = navigator.hardwareConcurrency ?? 4;
  score += cores >= 8 ? 2 : cores >= 4 ? 1 : 0;

  // deviceMemory is Chromium-only; absent ⇒ neutral
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (mem !== undefined) score += mem >= 8 ? 2 : mem >= 4 ? 1 : -1;

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.matchMedia("(max-width: 767px)").matches;
  if (coarse && small) score -= 1;

  // Software renderers (SwiftShader, llvmpipe, Mesa on VMs) → low, always.
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGLRenderingContext | null;
    const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
    const renderer: string = dbg ? String(gl!.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    if (/swiftshader|llvmpipe|software|mesa offscreen/i.test(renderer)) score = -10;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    /* ignore — heuristics only */
  }

  if (navigator.userAgent && /Android|iPhone|iPad/i.test(navigator.userAgent)) score -= 1;

  cached = score >= 3 ? "high" : score >= 0 ? "mid" : "low";
  return cached;
}

/** Reactive quality preset — "mid" during SSR/first paint, measured after mount. */
export function useQuality(): Quality {
  const [q, setQ] = useState<Quality>(PRESETS.mid);
  useEffect(() => {
    setQ(PRESETS[detectTier()]);
  }, []);
  return q;
}

export const QUALITY_PRESETS = PRESETS;
