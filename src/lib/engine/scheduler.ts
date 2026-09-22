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

/** frame budget in ms — beyond this, secondary roots go half-rate */
export const FRAME_BUDGET_MS = 18;

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
export function decide(roots: RootInfo[], avgFrameMs: number, frameIndex: number, busy = false): Decision[] {
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
    const tight = (avgFrameMs > FRAME_BUDGET_MS || busy) && sorted.length > 1;
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

/* ------------------------------------------------------------------ */
/* Runtime                                                              */
/* ------------------------------------------------------------------ */

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
    this.ensureLoop();
    return () => {
      this.io?.unobserve(el);
      this.roots.delete(id);
      if (!this.roots.size) this.stopLoop();
    };
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

  stats(): EngineStats {
    const hidden = typeof document !== "undefined" && document.hidden;
    const roots = [...this.roots.values()].map((r) => ({ id: r.id, area: +r.area.toFixed(3), hint: r.hint, rendering: this.isRendering(r.id), frames: r.frames, primed: r.primed }));
    const fps = this.fpsWindow.length > 1 ? Math.round(1000 / (this.fpsWindow.reduce((a, b) => a + b, 0) / this.fpsWindow.length)) : 0;
    const sc = this.scroll;
    return { roots, avgFrameMs: +this.avg.toFixed(2), fps, hidden, flinging: isFlinging(sc.dy, sc.dt, performance.now() - sc.t) };
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
  }

  private stopLoop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    window.removeEventListener("scroll", this.onScroll);
  }

  private loop = (t: number): void => {
    this.raf = requestAnimationFrame(this.loop);
    if (this.last) {
      const dt = t - this.last;
      this.avg = smoothFrameMs(this.avg, dt);
      this.fpsWindow.push(Math.min(dt, 100));
      if (this.fpsWindow.length > 60) this.fpsWindow.shift();
    }
    this.last = t;
    this.frameIndex++;
    const infos: RootInfo[] = [...this.roots.values()].map((r) => ({ id: r.id, area: r.area, hint: r.hint, priority: r.priority, prime: r.prime }));
    const sc = this.scroll;
    const busy = isFlinging(sc.dy, sc.dt, t - sc.t);
    this.lastDecisions = decide(infos, this.avg, this.frameIndex, busy);
    for (const d of this.lastDecisions) {
      if (!d.render) continue;
      const r = this.roots.get(d.id);
      if (!r) continue;
      try {
        r.advance(t);
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
