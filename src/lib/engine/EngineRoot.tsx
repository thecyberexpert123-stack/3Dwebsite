"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { engine, type RootHint } from "./scheduler";
import { acquireTilt, noteRealPointer, tiltPointer } from "./tilt";

/**
 * Attaches an R3F canvas to the Whimlet Engine scheduler.
 *
 * Drop it inside any <Canvas>. It:
 *  1. switches R3F to `frameloop="never"` and drives `advance()` from the
 *     shared scheduler (visibility-gated, budget-aware — see scheduler.ts);
 *  2. warms the GPU pipeline off the visible path: `renderer.compile()`
 *     creates every program (in parallel on drivers with
 *     KHR_parallel_shader_compile), then the *link stalls* three normally
 *     pays on first draw (`getProgramParameter` + uniform reflection) are
 *     pulled into idle slices, one program at a time, and finally one
 *     off-screen "priming" frame uploads buffers/textures. Measured before:
 *     a 4–7 s synchronous first frame when the studio teaser scrolled in.
 *  3. turns off three's `debug.checkShaderErrors` in production — each
 *     `getShaderInfoLog` is a synchronous GPU round-trip that only
 *     produces console text;
 *  4. on touch devices, drives R3F's `pointer` from the phone's tilt
 *     (`tilt.ts`) right before each advance, so the parallax / breeze /
 *     nudge that every scene already reads from the pointer comes alive
 *     without a mouse. A finger on the canvas takes the pointer back.
 *
 * `hint="pause"` mirrors the old `frameloop="never"` scenes (a paused scene
 * stays mounted but never renders); `priority` breaks ties when two
 * canvases are visible at once. `?engine=off` restores the stock R3F loop.
 */
type IdleDeadline = { timeRemaining: () => number };
/** User Timing marks (visible in DevTools › Performance and to QA scripts) */
function mark(name: string): void {
  try {
    performance.mark(name);
  } catch {
    /* older browsers */
  }
}
type Handle = { kind: "idle" | "timer"; id: number } | null;
function schedule(fn: (d?: IdleDeadline) => void): Handle {
  const w = window as Window & { requestIdleCallback?: (cb: (d: IdleDeadline) => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) return { kind: "idle", id: w.requestIdleCallback((d) => fn(d), { timeout: 1500 }) };
  return { kind: "timer", id: window.setTimeout(() => fn(), 32) };
}
function cancel(h: Handle): void {
  if (!h) return;
  const w = window as Window & { cancelIdleCallback?: (id: number) => void };
  if (h.kind === "idle" && w.cancelIdleCallback) w.cancelIdleCallback(h.id);
  else clearTimeout(h.id);
}

/** QA / kill switch: `?engine=off` restores R3F's own per-canvas loop (no warm-up,
 *  no scheduling) so the engine can be A/B measured on the same build. */
export function engineEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return new URLSearchParams(window.location.search).get("engine") !== "off";
}

export function EngineRoot({ id, hint = "run", priority = 0, onReady }: { id: string; hint?: RootHint; priority?: number; onReady?: () => void }) {
  const enabled = engineEnabled();
  if (!enabled) return <Legacy hint={hint} />;
  return <Engine id={id} hint={hint} priority={priority} onReady={onReady} />;
}

function Legacy({ hint }: { hint: RootHint }) {
  const { setFrameloop, frameloop } = useThree();
  useEffect(() => {
    const want = hint === "run" ? "always" : "never";
    if (frameloop !== want) setFrameloop(want);
  }, [hint, frameloop, setFrameloop]);
  return null;
}

function Engine({ id, hint, priority, onReady }: { id: string; hint: RootHint; priority: number; onReady?: () => void }) {
  const { gl, scene, camera, clock, advance, setFrameloop, frameloop, pointer } = useThree();
  const [warm, setWarm] = useState(false);

  // 4. tilt → pointer (touch devices only; no-op elsewhere)
  useEffect(() => {
    const release = acquireTilt();
    const el = gl.domElement;
    const onReal = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") noteRealPointer(performance.now());
    };
    el.addEventListener("pointerdown", onReal, { passive: true });
    el.addEventListener("pointermove", onReal, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onReal);
      el.removeEventListener("pointermove", onReal);
      release();
    };
  }, [gl]);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  // 3. production: no synchronous shader-log round-trips
  useLayoutEffect(() => {
    if (process.env.NODE_ENV === "production") gl.debug.checkShaderErrors = false;
  }, [gl]);

  // 2. warm-up: compile + link every program off the visible path.
  //    `compileAsync` creates the programs (parallel on drivers with
  //    KHR_parallel_shader_compile); three then defers the *link stall*
  //    (getProgramParameter / uniform + attribute lookups) to each program's
  //    first draw — which is exactly the multi-second first frame we measured.
  //    We pull that forward ourselves: one program per idle slice, so the
  //    stalls land in idle time as many small tasks instead of one giant one.
  useEffect(() => {
    let alive = true;
    let idle: Handle = null;
    const r = gl as THREE.WebGLRenderer;
    const done = () => {
      if (!alive) return;
      mark(`engine:${id}:warm`);
      setWarm(true);
      readyRef.current?.();
    };
    const linkInIdle = () => {
      type Prog = { getUniforms: () => unknown; usedTimes: number; __linked?: boolean };
      const pending = (r.info.programs ?? []) as unknown as Prog[];
      const step = (deadline?: { timeRemaining: () => number }) => {
        if (!alive) return;
        let n = 0;
        for (const p of pending) {
          if (p.__linked) continue;
          try {
            p.getUniforms(); // forces link status + uniform/attribute reflection
          } catch {
            /* a broken program surfaces on its own first draw as before */
          }
          p.__linked = true;
          n++;
          // stop when the slice is spent (always do at least one per slice)
          if (deadline && deadline.timeRemaining() < 4) break;
          if (!deadline && n >= 2) break;
        }
        if (pending.some((p) => !p.__linked)) idle = schedule(step);
        else done();
      };
      idle = schedule(step);
    };
    mark(`engine:${id}:compile`);
    // Not `compileAsync`: its readiness poll dereferences `currentProgram` on
    // every material it saw, and throws (and never settles) if a material was
    // swapped or disposed meanwhile — which React re-renders do all the time.
    // Same algorithm, guarded.
    let materials: Set<THREE.Material>;
    try {
      materials = r.compile(scene, camera) as Set<THREE.Material>;
    } catch {
      done();
      return () => {
        alive = false;
      };
    }
    const props = r.properties as { get: (m: THREE.Material) => { currentProgram?: { isReady: () => boolean } } };
    const poll = () => {
      if (!alive) return;
      for (const m of materials) {
        const prog = props.get(m)?.currentProgram;
        if (!prog || prog.isReady()) materials.delete(m);
      }
      if (materials.size) idle = { kind: "timer", id: window.setTimeout(poll, 16) };
      else linkInIdle();
    };
    poll();
    return () => {
      alive = false;
      cancel(idle);
    };
    // the scene graph can grow later (lazy children) — those compile on their own first frame,
    // which is fine: they are small and the big cost is the initial batch
  }, [gl, scene, camera, id]);

  // 1. hand the loop to the scheduler
  useEffect(() => {
    if (frameloop !== "never") setFrameloop("never");
    const el = gl.domElement.parentElement ?? gl.domElement;
    let last = 0;
    const step = (tMs: number) => {
      // R3F copies this timestamp into `clock.elapsedTime`, which every
      // useFrame reads as *seconds* — so hand it seconds, not rAF millis.
      const t = tMs / 1000;
      // The first frame, and any resume after a pause (scrolled away, hidden
      // tab), would otherwise deliver one giant delta; pretend the previous
      // frame was 1/60 s ago so grow-ins, lerps and intros play instead of
      // snapping to their end state.
      if (!last || t - last > 0.25) clock.elapsedTime = t - 1 / 60;
      last = t;
      const tilt = tiltPointer(tMs);
      if (tilt) pointer.set(tilt.x, tilt.y);
      advance(t, true);
    };
    const off = engine().register(id, el, step, priority);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, id, advance, setFrameloop, pointer]);

  useEffect(() => {
    // Never hold a *visible* scene back for warm-up: if the user is already
    // looking at it, three links what it needs on the first draw exactly as
    // before (a hitch beats a blank). Warm-up only helps scenes that were
    // mounted ahead of time — which is what the pre-mount ring in
    // useInViewport is for.
    engine().setHint(id, hint);
  }, [id, hint]);

  useEffect(() => {
    // programs linked → pay the remaining first-use costs with one off-screen frame
    if (warm) engine().prime(id);
  }, [id, warm]);

  useEffect(() => {
    engine().setPriority(id, priority);
  }, [id, priority]);

  return null;
}
