/**
 * Whimlet Engine — tilt-as-pointer.
 *
 * Every 3D scene already reads R3F's `state.pointer` (−1…1) for parallax,
 * the "nudge toward the visitor" on the gift box, the camera drift in the
 * studio and the Breeze that sways the flowers. On a phone nothing moves
 * that pointer except a finger on the canvas — so on desktop the scenes
 * breathe with the mouse and on a phone they stand still.
 *
 * This feeds the *phone's tilt* into the same pointer, around the existing
 * scenes: one `deviceorientation` listener for the page, integrated once per
 * frame, and written into each canvas's pointer by `EngineRoot` just before
 * it advances — unless a real finger touched that canvas in the last moment,
 * in which case the finger wins (touch-drag parallax already works).
 *
 * Only where it is wanted and allowed:
 *   - coarse-pointer devices in a secure context (the event needs HTTPS);
 *   - never under prefers-reduced-motion (the scenes also multiply the
 *     pointer by 0 there, but we do not even listen);
 *   - behind the browser's sensor permission where there is one (see
 *     `acquireTilt`): silently when already allowed, otherwise asked from the
 *     visitor's first tap on a 3D canvas, never from the welcome door.
 *
 * The rest pose follows the current tilt slowly (`followRest`), so however
 * the phone is held is "centre" and only *changes* in tilt move the scene —
 * a phone on a table is still, a phone in a hand breathes.
 */

import { followRest, orientationToPointer, tiltMayDrive, type TiltSample } from "./capability";

let users = 0;
let off: (() => void) | null = null;
let sample: TiltSample | null = null;
let rest: TiltSample | null = null;
let lastFrameMs = 0;
let lastRealMs = -1e9;
let current: { x: number; y: number } | null = null;
let raf = 0;
let lastCssMs = 0;
let cssX = 50;
let cssY = 50;

type DOE = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
const GRANT_KEY = "whimlet-tilt";

/** Is tilt even a candidate on this device (before any permission question)? */
export function tiltSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("DeviceOrientationEvent" in window)) return false;
  if (!window.isSecureContext) return false; // the event is HTTPS-only
  if (!window.matchMedia("(pointer: coarse)").matches) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return true;
}

/**
 * Permission model (researched 2026-09, see engine/README.md):
 *  - Older Chrome/Firefox on Android: the legacy event just fires — listen.
 *  - Chrome ≥ 151 and Safari: `DeviceOrientationEvent.requestPermission()`
 *    exists and listeners stay silent until it resolves "granted". Chrome's
 *    default site setting is still Allow, so the call usually resolves
 *    without any UI; Safari (iOS 13+) and Chrome set to "Ask" show a prompt,
 *    and require a user gesture.
 *  We never ambush: when the Permissions API says the sensors are already
 *  granted (or a previous page in this session was), we ask on load; otherwise
 *  we ask from the visitor's first tap on a 3D canvas — a deliberate touch of
 *  the thing that will respond — never from the welcome door. A refusal is
 *  remembered for the session and never re-asked.
 */
async function sensorsGranted(): Promise<boolean> {
  try {
    if (sessionStorage.getItem(GRANT_KEY) === "granted") return true;
  } catch {
    /* ignore */
  }
  if (!("permissions" in navigator)) return false;
  try {
    const names = ["accelerometer", "gyroscope"] as unknown as PermissionName[];
    const states = await Promise.all(names.map((name) => navigator.permissions.query({ name })));
    return states.every((s) => s.state === "granted");
  } catch {
    return false; // Safari: not queryable
  }
}

function remember(v: "granted" | "denied"): void {
  try {
    sessionStorage.setItem(GRANT_KEY, v);
  } catch {
    /* ignore */
  }
}

/** Resolve to true when the page may receive orientation events. */
function requestAccess(fromGesture: boolean): Promise<boolean> {
  const rp = (window.DeviceOrientationEvent as DOE).requestPermission;
  if (typeof rp !== "function") return Promise.resolve(true); // legacy: no gate
  return rp
    .call(window.DeviceOrientationEvent)
    .then((r) => {
      if (r === "granted") remember("granted");
      else if (fromGesture) remember("denied");
      return r === "granted";
    })
    .catch(() => false); // NotAllowedError (needs a gesture) → the gesture path retries
}

/**
 * Integrate once per frame: rest pose follows the sample, the pointer is the
 * deflection from rest. Also mirrors the deflection into three CSS custom
 * properties on <html> — `--tilt-sx` / `--tilt-sy` (a light position in %)
 * and `--tilt-o` (how far from rest, 0…1) — so the window-light sheen on the
 * cards and the specular on the glass buttons sweep with the phone the way
 * they follow the mouse on desktop (globals.css, `html.tilt`). Written at
 * most ~30×/s and only when the light actually moved: a phone on a table
 * costs nothing.
 */
function integrate(nowMs: number): void {
  if (!sample || !rest || nowMs === lastFrameMs) return;
  const dt = lastFrameMs ? Math.min(0.1, (nowMs - lastFrameMs) / 1000) : 1 / 60;
  lastFrameMs = nowMs;
  rest = followRest(rest, sample, dt);
  const angle = typeof screen !== "undefined" && screen.orientation ? screen.orientation.angle : 0;
  current = orientationToPointer(sample, rest, angle);
  if (nowMs - lastCssMs < 33) return;
  const sx = 50 + current.x * 45;
  const sy = 50 - current.y * 45;
  if (Math.abs(sx - cssX) < 0.8 && Math.abs(sy - cssY) < 0.8) return;
  lastCssMs = nowMs;
  cssX = sx;
  cssY = sy;
  const st = document.documentElement.style;
  st.setProperty("--tilt-sx", `${sx.toFixed(1)}%`);
  st.setProperty("--tilt-sy", `${sy.toFixed(1)}%`);
  st.setProperty("--tilt-o", Math.min(1, Math.hypot(current.x, current.y) * 1.4).toFixed(2));
}

/** Start listening (ref-counted). Returns the release function. */
export function acquireTilt(): () => void {
  if (!tiltSupported()) return () => {};
  users++;
  (window as unknown as { __tilt?: typeof tiltStats }).__tilt = tiltStats; // QA: window.__tilt()
  if (!off) {
    let alive = true;
    let listening = false;
    let onGesture: ((e: PointerEvent) => void) | null = null;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      sample = { beta: e.beta, gamma: e.gamma };
      if (!rest) rest = sample;
    };
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      integrate(t);
    };
    const start = () => {
      if (!alive || listening) return;
      listening = true;
      window.addEventListener("deviceorientation", onOrient, { passive: true });
      document.documentElement.classList.add("tilt");
      raf = requestAnimationFrame(loop);
    };
    const armGesture = () => {
      onGesture = (e: PointerEvent) => {
        if (e.pointerType === "mouse") return;
        // a deliberate touch on a 3D canvas — not the welcome door
        const t = e.target as Element | null;
        if (!t?.closest?.("canvas") || t.closest(".candy")) return;
        document.removeEventListener("pointerdown", onGesture!, true);
        onGesture = null;
        void requestAccess(true).then((ok) => ok && start());
      };
      document.addEventListener("pointerdown", onGesture, true);
    };
    let denied = false;
    try {
      denied = sessionStorage.getItem(GRANT_KEY) === "denied";
    } catch {
      /* ignore */
    }
    if (!denied) {
      void sensorsGranted().then(async (granted) => {
        if (!alive) return;
        if (granted && (await requestAccess(false))) start();
        else if (alive) armGesture();
      });
    }
    off = () => {
      alive = false;
      if (onGesture) document.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener("deviceorientation", onOrient);
      cancelAnimationFrame(raf);
      raf = 0;
      const html = document.documentElement;
      html.classList.remove("tilt");
      html.style.removeProperty("--tilt-sx");
      html.style.removeProperty("--tilt-sy");
      html.style.removeProperty("--tilt-o");
      sample = rest = current = null;
      lastFrameMs = 0;
    };
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--users === 0 && off) {
      off();
      off = null;
    }
  };
}

/** A real pointer touched a canvas: hold the tilt back for a moment. */
export function noteRealPointer(nowMs: number): void {
  lastRealMs = nowMs;
}

/**
 * The tilt pointer for this frame, or null when the tilt should not drive
 * (no sample yet, a finger is busy, or the feature is off).
 */
export function tiltPointer(nowMs: number): { x: number; y: number } | null {
  integrate(nowMs);
  if (!current) return null;
  if (!tiltMayDrive(nowMs, lastRealMs)) return null;
  return current;
}

/** QA: is the tilt source live (listener attached and a sample received)? */
export function tiltStats(): { active: boolean; users: number; pointer: { x: number; y: number } | null } {
  return { active: !!off && !!sample, users, pointer: current };
}
