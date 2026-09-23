/**
 * Whimlet Engine — the frame scheduler.
 *
 * One requestAnimationFrame for every WebGL canvas on the page. Each canvas
 * registers a "root" (its R3F `advance` function + its DOM element); the
 * scheduler decides, per frame, which roots render:
 *
 *  - roots that are not intersecting the viewport never render (no CPU,
 *    no GPU, no battery — and no hitch when they come back, because they
 *    stay *mounted*: the context and compiled shaders survive);
 *  - the *primary* root (largest visible area) renders every frame;
 *  - secondary roots render every frame while there is headroom and drop to
 *    half rate when the measured frame time exceeds the budget, so a
 *    decorative scene never steals frames from the one the user is
 *    looking at;
 *  - a paused hint (a scene's own `frameloop="never"`) always wins;
 *  - when the tab is hidden the browser stops rAF; when it returns, the
 *    first frame's dt is clamped by R3F's clock so intros don't jump.
 *
 * Pure decision logic lives in `decide()` so it can be unit-tested without
 * a DOM (see scripts/engine-tests.mjs).
 */

export type RootHint = "run" | "pause";

export type RootInfo = {
  id: string;
  /** visible fraction × viewport share — 0 when offscreen */
  area: number;
  hint: RootHint;
  /** larger = more important when budget is tight (default 0) */
  priority: number;
  /** wants one off-screen "priming" frame (first-use GPU uploads) */
  prime?: boolean;
};

export type Decision = { id: string; render: boolean; primary: boolean };

/** frame budget in ms — beyond this, secondary roots go half-rate. This is
 *  the legacy constant (60 Hz). The scheduler now scales the *measured* budget
 *  with the panel's refresh rate via `effectiveFrameBudget()` so a 144 Hz
 *  display still triggers half-rate for decorative scenes; `FRAME_BUDGET_MS`
 *  remains the value `decide()` is called with on a 60 Hz display and stays
 *  exported for the unit tests and for anything reading it. */
export const FRAME_BUDGET_MS = 18;

/** When the page first boots we have no rAF median yet: use the 60 Hz budget. */
export const INITIAL_FRAME_BUDGET_MS = 18;

/** scroll speed (CSS px per ms) above which the page is "flinging" — the
 *  compositor is busy and a secondary scene's frame is the first thing to give */
export const FLING_PX_PER_MS = 1.5;

/** Is the page flinging? `dy` px travelled in `dtMs`, and how long ago (ms). */
export function isFlinging(dy: number, dtMs: number, agoMs: number): boolean {
  if (dtMs <= 0 || agoMs > 120) return false;
  return Math.abs(dy) / dtMs > FLING_PX_PER_MS;
}

/**
 * Decide which roots render this frame.
 * `frameIndex` alternates secondary roots when over budget or while the
 * page flings (`busy`); the primary root always renders every frame.
 */
export function decide(roots: RootInfo[], avgFrameMs: number, frameIndex: number, busy = false, budgetMs: number = FRAME_BUDGET_MS): Decision[] {
  const visible = roots.filter((r) => r.hint === "run" && r.area > 0);
  const out = new Map<string, Decision>();
  // Priming: an off-screen root whose programs are linked gets ONE frame so
  // the remaining first-use costs (buffer/texture uploads, VAOs) are paid
  // now, out of sight, instead of on the frame it scrolls in. One prime per
  // frame at most, so two scenes never stack their first frames.
  const primer = roots.find((r) => r.prime && r.hint === "run" && r.area === 0);
  if (primer) out.set(primer.id, { id: primer.id, render: true, primary: false });
  if (visible.length) {
    const sorted = [...visible].sort((a, b) => b.priority - a.priority || b.area - a.area);
    const primary = sorted[0].id;
    const tight = (avgFrameMs > budgetMs || busy) && sorted.length > 1;
    sorted.forEach((r, i) => {
      if (r.id === primary) out.set(r.id, { id: r.id, render: true, primary: true });
      else {
        // secondary roots alternate frames when tight (odd/even by rank)
        const render = !tight || (frameIndex + i) % 2 === 0;
        out.set(r.id, { id: r.id, render, primary: false });
      }
    });
  }
  return roots.map((r) => out.get(r.id) ?? { id: r.id, render: false, primary: false });
}

/** Exponential moving average of frame time, clamped so tab-switch gaps don't poison it. */
export function smoothFrameMs(prev: number, dt: number): number {
  const d = Math.min(dt, 100);
  return prev === 0 ? d : prev + (d - prev) * 0.1;
}

/** The engine leans on the page's inertial scroller for the relax callbacks:
 *  Lenis keeps calling rAF while it eases back to rest, which is exactly the
 *  window in which a cooled-down scene should ease back up. `scrollerRunning`
 *  is checked before promoting, never before demoting (demotes act instantly). */
export function scrollerRunning(): boolean {
  try {
    const w = window as { __lenis?: { isStopped?: boolean; velocity?: number } | null };
    const l = w.__lenis;
    if (!l) return false;
    if (typeof l.isStopped === "boolean" && l.isStopped) return false;
    return Math.abs(l.velocity ?? 0) > 0.01;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Runtime                                                              */
/* ------------------------------------------------------------------ */

import { effectiveFrameBudget, nearestRefreshRate, renderIntervalMs } from "./capability";
import type { PressureState } from "./pressure";

type Root = {
  id: string;
  el: Element;
  advance: (t: number) => void;
  hint: RootHint;
  priority: number;
  area: number;
  prime: boolean;
  /** frames rendered — exposed for QA */
  frames: number;
  /** frames rendered while off-screen (priming) — exposed for QA */
  primed: number;
};

export type EngineStats = {
  roots: { id: string; area: number; hint: RootHint; rendering: boolean; frames: number; primed: number }[];
  avgFrameMs: number;
  fps: number;
  hidden: boolean;
  /** page was flinging on the last frame (secondary scenes at half rate) */
  flinging: boolean;
  /** measured panel rate (Hz) — 0 until the rAF cadence settles */
  hz: number;
  /** frame cap in ms (0 = native rate) — touch high-refresh panels only */
  intervalMs: number;
  /** refresh-scaled frame-time budget the scheduler is currently using */
  budgetMs: number;
  /** latest Compute-Pressure / thermal state ("" when unsupported) */
  pressure: PressureState | "";
};

class Scheduler {
  private roots = new Map<string, Root>();
  private io: IntersectionObserver | null = null;
  private raf = 0;
  private last = 0;
  private avg = 0;
  private frameIndex = 0;
  private lastDecisions: Decision[] = [];
  private fpsWindow: number[] = [];
  private scroll = { y: 0, t: 0, dy: 0, dt: 0 };
  /** rAF timestamps of the last few frames → the panel's real cadence.
   *  `null` once the median has settled (or the window gave up). */
  private stamps: number[] | null = [];
  /** measured frame-time median (ms) → the panel rate the budget scales by. */
  private medianMs = 0;
  /** touch devices: render only at a clean divisor of the panel rate. */
  private intervalMs = 0;
  /** Touch is detected once per page and defaults to *not* capped. */
  private touch: boolean | null = null;
  /** refresh-scaled frame-time budget (see effectiveFrameBudget). */
  private budget: number = INITIAL_FRAME_BUDGET_MS;
  private hiddenWired = false;
  private lastAdvance = 0;
  /** latest CPU/thermal traffic light — "" until the observer first fires. */
  private pressure: PressureState | "" = "";
  private onScroll = () => {
    const now = performance.now();
    const y = window.scrollY;
    const s = this.scroll;
    if (s.t) {
      s.dy = y - s.y;
      s.dt = now - s.t;
    }
    s.y = y;
    s.t = now;
  };

  register(id: string, el: Element, advance: (t: number) => void, priority = 0): () => void {
    const root: Root = { id, el, advance, hint: "run", priority, area: 0, prime: false, frames: 0, primed: 0 };
    this.roots.set(id, root);
    this.observer().observe(el);
    this.detectTouch();
    this.ensureLoop();
    return () => {
      this.io?.unobserve(el);
      this.roots.delete(id);
      if (!this.roots.size) this.stopLoop();
    };
  }

  /** Touch (coarse-pointer) devices get a frame cap only while the panel is
   *  high-refresh; the scene renders at a clean divisor (48–60 fps) instead
   *  of every vsync. Fine-pointer devices stay uncapped. */
  private detectTouch(): void {
    if (this.touch !== null) return;
    try {
      this.touch = window.matchMedia("(pointer: coarse)").matches;
    } catch {
      this.touch = false;
    }
    this.touch = this.touch === true;
    this.recomputeCadence();
  }

  /** Recompute the frame cap + frame-time budget from the measured rAF median. */
  private recomputeCadence(): void {
    if (!this.medianMs) {
      this.intervalMs = 0;
      return;
    }
    const hz = nearestRefreshRate(this.medianMs);
    this.intervalMs = this.touch ? renderIntervalMs(hz) : 0;
    this.budget = effectiveFrameBudget(hz);
  }

  setHint(id: string, hint: RootHint): void {
    const r = this.roots.get(id);
    if (r) r.hint = hint;
  }

  setPriority(id: string, priority: number): void {
    const r = this.roots.get(id);
    if (r) r.priority = priority;
  }

  /** Ask for one off-screen frame (after the scene's programs are compiled). */
  prime(id: string): void {
    const r = this.roots.get(id);
    if (r) r.prime = true;
  }

  /** Is this root currently being rendered? (for warm-up gating) */
  isRendering(id: string): boolean {
    return this.lastDecisions.find((d) => d.id === id)?.render ?? false;
  }

  /** EngineProvider relays the Compute-Pressure state here so the scheduler
   *  hard-clamps all secondaries to half rate the instant the device stalls. */
  setPressure(state: PressureState | null | ""): void {
    this.pressure = state ?? "";
  }

  /** Is CPU/thermal pressure currently holding the scheduler in its hard clamp? */
  pressureActive(): boolean {
    return this.pressure === "serious" || this.pressure === "critical";
  }

  stats(): EngineStats {
    const hidden = typeof document !== "undefined" && document.hidden;
    const roots = [...this.roots.values()].map((r) => ({ id: r.id, area: +r.area.toFixed(3), hint: r.hint, rendering: this.isRendering(r.id), frames: r.frames, primed: r.primed }));
    const fps = this.fpsWindow.length > 1 ? Math.round(1000 / (this.fpsWindow.reduce((a, b) => a + b, 0) / this.fpsWindow.length)) : 0;
    const sc = this.scroll;
    let hz = 0;
    try {
      hz = this.medianMs ? nearestRefreshRate(this.medianMs) : 0;
    } catch {
      /* ignore */
    }
    return { roots, avgFrameMs: +this.avg.toFixed(2), fps, hidden, flinging: isFlinging(sc.dy, sc.dt, performance.now() - sc.t), hz, intervalMs: +this.intervalMs.toFixed(2), budgetMs: +this.budget.toFixed(2), pressure: this.pressure };
  }

  private observer(): IntersectionObserver {
    if (this.io) return this.io;
    this.io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          for (const r of this.roots.values()) {
            if (r.el !== e.target) continue;
            // visible fraction × share of the viewport → "how much of what the user sees is this canvas"
            const vw = window.innerWidth || 1;
            const vh = window.innerHeight || 1;
            const share = (e.intersectionRect.width * e.intersectionRect.height) / (vw * vh);
            r.area = e.isIntersecting ? Math.max(1e-4, share) : 0;
          }
        }
      },
      // a little margin so a scene resumes just before it scrolls into view
      { rootMargin: "120px 0px", threshold: [0, 0.05, 0.25, 0.5, 0.75, 1] }
    );
    return this.io;
  }

  private ensureLoop(): void {
    if (this.raf) return;
    this.last = 0;
    this.raf = requestAnimationFrame(this.loop);
    window.addEventListener("scroll", this.onScroll, { passive: true });
    // The loop stops its rAF whenever every root is off-screen (and wakes on
    // the next intersection/scroll/tab-focus/register). Wire the wake-ups once.
    if (!this.hiddenWired) {
      this.hiddenWired = true;
      document.addEventListener("visibilitychange", this.onVisibility);
      window.addEventListener("resize", this.onActivity);
      window.addEventListener("scroll", this.onActivity);
    }
  }

  /** Tab became visible again → resume and re-measure the cadence. */
  private onVisibility = (): void => {
    if (!document.hidden) {
      this.lastAdvance = 0;
      this.ensureLoop();
    }
  };
  /** Scroll/resize → an off-screen root may be about to come back; idle loops wake. */
  private onActivity = (): void => {
    this.ensureLoop();
  };

  private stopLoop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    window.removeEventListener("scroll", this.onScroll);
  }

  private loop = (t: number): void => {
    this.raf = 0;
    let any = false; // did at least one root draw this frame?
    if (this.last) {
      const dt = t - this.last;
      this.avg = smoothFrameMs(this.avg, dt);
      this.fpsWindow.push(Math.min(dt, 100));
      if (this.fpsWindow.length > 60) this.fpsWindow.shift();
    }
    // Measure the panel cadence (rAF interval) once, until the median settles;
    // a changing median (60 Hz → 120 Hz, or a throttled background tab) starts
    // the window over. Settled → `stamps = null` and never sampled again.
    if (this.stamps) {
      this.stamps.push(t);
      if (this.stamps.length >= 16) {
        const diffs: number[] = [];
        for (let i = 1; i < this.stamps.length; i++) {
          const d = this.stamps[i] - this.stamps[i - 1];
          if (d > 1 && d < 100) diffs.push(d);
        }
        if (diffs.length >= 8) {
          diffs.sort((a, b) => a - b);
          const m = diffs[Math.floor(diffs.length / 2)];
          if (this.medianMs === 0) this.medianMs = m;
          else if (Math.abs(m - this.medianMs) < 0.5) {
            this.medianMs = m;
            this.recomputeCadence();
            this.stamps = null; // settled — keep this cadence for the session
          } else {
            this.medianMs = m;
            this.stamps = [t]; // cadence changed — re-measure from here
          }
        }
      }
      if (this.stamps && this.stamps.length >= 60) this.stamps = null; // give up → native rate
    }
    this.last = t;

    // Touch frame cap: a high-refresh phone renders only on the vsync nearest
    // each interval slot (48–60 fps). Frames in between are *skipped* — the
    // advance is cheap-to-miss, the render is not.
    let due = true;
    if (this.intervalMs > 0) {
      const slot = this.lastAdvance + this.intervalMs;
      due = t >= slot;
      if (due) this.lastAdvance = t;
    }

    if (due) {
      this.frameIndex++;
      const infos: RootInfo[] = [...this.roots.values()].map((r) => ({ id: r.id, area: r.area, hint: r.hint, priority: r.priority, prime: r.prime }));
      const sc = this.scroll;
      // hard clamp while the device reports strain (demotes act instantly)
      const busy = this.pressureActive() || isFlinging(sc.dy, sc.dt, t - sc.t);
      this.lastDecisions = decide(infos, this.avg, this.frameIndex, busy, this.budget);
      for (const d of this.lastDecisions) {
        if (!d.render) continue;
        const r = this.roots.get(d.id);
        if (!r) continue;
        try {
          r.advance(t);
          any = true;
          r.frames++;
          if (r.area === 0) {
            r.primed++;
            r.prime = false;
            try {
              performance.mark(`engine:${r.id}:primed`);
            } catch {
              /* ignore */
            }
          }
        } catch (err) {
          // one broken scene must not take the others down
          if (process.env.NODE_ENV !== "production") console.error(`[engine] ${d.id}`, err);
        }
      }
    }

    // Self-sleep: keep the rAF only while a scene may need frames (a visible
    // run-hint root, a pending prime, or a draw this tick). Off-screen and
    // quiet → the loop stops; intersection changes / scroll / tab-focus /
    // registrations wake it again, so a returning scene misses no frame.
    const needed =
      this.roots.size === 0 ||
      any ||
      [...this.roots.values()].some((r) => r.hint === "run" && r.area > 0) ||
      [...this.roots.values()].some((r) => r.prime);
    if (needed) this.raf = requestAnimationFrame(this.loop);
    else {
      this.lastAdvance = 0;
      this.raf = 0;
    }
  };
}

let instance: Scheduler | null = null;

export function engine(): Scheduler {
  if (!instance) {
    instance = new Scheduler();
    if (typeof window !== "undefined") (window as unknown as { __engine?: Scheduler }).__engine = instance;
  }
  return instance;
}
