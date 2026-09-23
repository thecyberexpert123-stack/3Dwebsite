/**
 * Whimlet Engine — capability & touch-parity decisions (pure, unit-tested).
 *
 * The site was written desktop-first: several choreographies and every
 * pointer-driven motion were gated on "has a mouse". A phone has no mouse but
 * it has a gyroscope, a finger and — on anything recent — a GPU that runs
 * the whole thing. This module decides, from evidence rather than the user
 * agent string, what a device can carry:
 *
 *  - `gpuScore()`     — reads the unmasked WebGL renderer string the way a
 *                       game's launcher reads the GPU name: a coarse but real
 *                       signal (a Mali-G52 and an Adreno 750 are not the same
 *                       phone). Unknown strings score neutral.
 *  - `decideParity()` — should a coarse-pointer device run the desktop
 *                       choreography (section peel, card fan, sticky stack,
 *                       3D desk)? Yes unless the tier is low or the visitor
 *                       asked for reduced motion. `?parity=on|off` overrides.
 *  - `orientationToPointer()` — turns device tilt into the same −1…1 pointer
 *                       the scenes already read, relative to a slowly
 *                       following rest pose so *any* way of holding the
 *                       phone is "centre" and only changes in tilt move the
 *                       scene.
 *
 * Everything here is corrected at runtime: drei's PerformanceMonitor steps
 * the DPR, and `quality.ts` demotes the tier for the session when a canvas
 * starves even at DPR 1.
 */

export type Tier = "low" | "mid" | "high";

/* ------------------------------------------------------------------ */
/* GPU classification                                                  */
/* ------------------------------------------------------------------ */

/**
 * Score a WebGL renderer string. Positive = capable mobile GPU, negative =
 * entry-level, `null` = not a recognised mobile GPU (desktop parts and
 * anything unknown score neutral; software renderers are handled by the
 * caller because they are a hard "low", not a score).
 *
 * The buckets are the public tiering everyone in mobile graphics uses —
 * Adreno 6xx/7xx/8xx flagships, ARM's Mali-G7x "big" cores and Immortalis,
 * Samsung Xclipse, Apple's GPUs — not benchmarks we ran. They are a prior;
 * PerformanceMonitor is the evidence.
 */
export function gpuScore(renderer: string): number | null {
  const r = renderer;
  if (!r) return null;

  // Apple (Safari reports "Apple GPU"; ANGLE Metal on macOS reports the chip)
  if (/Apple (GPU|M\d|A\d\d)/i.test(r)) return 2;

  // Qualcomm Adreno
  const adreno = /Adreno(?:\s*\(TM\))?\s*(\d{3})/i.exec(r);
  if (adreno) {
    const n = +adreno[1];
    if (n >= 730 || (n >= 640 && n < 700)) return 2; // 640/650/660/690, 730/740/750, 8xx
    if (n >= 610) return 0; // 610–630, 7xx below 730 (710–725)
    if (n >= 530) return 0; // 530/540 (2016–17 flagships) — mid
    return -2; // 5xx low, 4xx, 3xx
  }

  // ARM Immortalis / Mali
  if (/Immortalis/i.test(r)) return 2;
  const mali = /Mali-(G|T)(\d{2,3})/i.exec(r);
  if (mali) {
    const gen = mali[1].toUpperCase();
    const n = +mali[2];
    if (gen === "T") return -2; // Midgard — 2014–2017 mid/low phones
    if (n >= 710) return 2; // G710/G715/G720/G725 (big cores)
    if (n === 78 || n === 77) return 2; // Tensor G1/G2 class, Dimensity 1000
    if (n >= 68 || n === 76) return 0; // G68, G76 (2019 flagships)
    if (n === 610 || n === 615 || n === 620 || n === 57 || n === 52) return -1; // mid-range small cores
    return -2; // G31/G51/G71/G72 & co
  }

  // Samsung Xclipse (RDNA-based, S22+)
  if (/Xclipse/i.test(r)) return 2;

  // Imagination PowerVR — budget MediaTek / Unisoc
  if (/PowerVR|IMG\s*[A-Z]+\d/i.test(r)) return -2;

  return null;
}

/** Map the additive score onto a tier (same thresholds the old heuristic used). */
export function tierFromScore(score: number): Tier {
  return score >= 3 ? "high" : score >= 0 ? "mid" : "low";
}

export type DeviceEvidence = {
  cores: number;
  /** navigator.deviceMemory (GB) — Chromium only */
  mem?: number;
  /** result of gpuScore(); null = unrecognised */
  gpu: number | null;
  software: boolean;
  /** coarse pointer AND a small viewport (a phone we know nothing else about) */
  coarseSmall: boolean;
};

/**
 * Combine the evidence into a score.
 *
 * When the GPU is recognised it *is* the decision (×2), corrected by memory:
 * core count says nothing on mobile (a ₹9,000 Helio has eight of them). When
 * it is not, the pre-engine heuristic applies (cores + memory − "unknown
 * phone"). Software rendering is a hard low.
 */
export function scoreDevice(e: DeviceEvidence): number {
  if (e.software) return -10;
  const mem = e.mem === undefined ? 0 : e.mem >= 8 ? 2 : e.mem >= 4 ? 1 : -1;
  if (e.gpu !== null) return e.gpu * 2 + (e.mem === undefined ? 0 : e.mem >= 8 ? 1 : e.mem >= 4 ? 0 : -1);
  let score = e.cores >= 8 ? 2 : e.cores >= 4 ? 1 : 0;
  score += mem;
  if (e.coarseSmall) score -= 1;
  return score;
}

export function lowerTier(t: Tier): Tier {
  return t === "high" ? "mid" : "low";
}

/* ------------------------------------------------------------------ */
/* Frame-rate targets                                                  */
/* ------------------------------------------------------------------ */

/**
 * Bounds for drei's PerformanceMonitor: `[decline below, incline above]` in
 * fps, given the measured refresh rate.
 *
 * drei's default is `hz > 100 ? [60, 100] : [40, 60]` — on a 90/120 Hz phone
 * (most Androids since 2021) a scene holding a steady 55 fps is then
 * "declining", the DPR is stepped to 1, the monitor gives up and the engine
 * demotes a flagship for no reason. Our content targets 60; on a high-refresh
 * screen 48 is the floor and the DPR climbs back only above 80.
 */
export function monitorBounds(hz: number): [number, number] {
  return hz > 100 ? [48, 80] : hz > 70 ? [44, 66] : [40, 60];
}

/* ------------------------------------------------------------------ */
/* Refresh-aware frame budget & frame cap (the scheduler's side)       */
/* ------------------------------------------------------------------ */

/** Hard ceiling/foor for the frame-time budget the scheduler hands to
 *  `decide()`: never clamps below what a 165+ Hz compositor needs, never
 *  relaxes beyond the 60 Hz target of the content. */
export const FRAME_BUDGET_CEILING_MS = 18;
export const FRAME_BUDGET_FLOOR_MS = 8;

/**
 * The per-frame budget (ms above which secondary scenes drop to half rate),
 * from the measured refresh rate. On a 60 Hz display 18 ms is right; on a
 * 120/144 Hz display the compositor runs on 8.3/6.9 ms frames, so 18 ms
 * would never trip and a decorative scene would keep stealing frames from
 * the primary — the budget must shrink with the refresh.
 */
export function effectiveFrameBudget(hz: number): number {
  const h = Math.min(240, Math.max(30, hz));
  return Math.min(FRAME_BUDGET_CEILING_MS, Math.max(FRAME_BUDGET_FLOOR_MS, (1000 / h) * 1.2));
}

/** Round a measured rAF median onto the nearest real panel rate. */
export function nearestRefreshRate(medianMs: number): number {
  const hz = 1000 / Math.max(1, medianMs);
  const known = [60, 90, 120, 144, 165, 240];
  let best = 60;
  for (const k of known) if (Math.abs(k - hz) < Math.abs(best - hz)) best = k;
  return best;
}

/**
 * Frame-cap interval (ms) for a touch device with a given panel rate,
 * or 0 = uncapped (render at the panel's own rate).
 *
 * Only clean divisors of the refresh are used, so a cap is *uniformly paced*
 * (every 2nd/3rd vsync — never a stuttering 2.4-vsync pattern):
 *   120 Hz → 60 fps,  144 Hz → 48 fps,  165 Hz → 55 fps,  240 Hz → 60 fps.
 * 90 Hz has no divisor in the 48–60 band, so it stays native (45 fps would
 * read as judder for content authored at 60). 60 Hz is already native.
 */
export function renderIntervalMs(hz: number): number {
  if (hz <= 62) return 0;
  for (let k = 1; k <= 4; k++) {
    const f = hz / k;
    if (Math.abs(f - Math.round(f)) < 0.05) {
      const rate = Math.round(f);
      if (rate >= 48 && rate <= 60) return 1000 / rate;
    }
  }
  return 0;
}

/**
 * Glass budget for touch devices. The liquid-glass recipe layers a
 * backdrop blur + an SVG displacement (`#glass-bend`) under ~90 buttons and
 * panels; on desktop GPUs that is free, on an entry-level phone the blur
 * chain re-rasterises every frame something moves behind it.
 *  - "full": everything (desktop, high-tier phones)
 *  - "frosted": blur but no displacement (mid-tier phones)
 *  - "lite": lighter blur, no displacement, no tilt sheen (low tier)
 */
export type GlassLevel = "full" | "frosted" | "lite";
export function glassLevel(coarse: boolean, tier: Tier): GlassLevel {
  if (!coarse) return "full";
  return tier === "high" ? "full" : tier === "mid" ? "frosted" : "lite";
}

/* ------------------------------------------------------------------ */
/* Touch parity                                                        */
/* ------------------------------------------------------------------ */

export type ParityInput = {
  /** device's primary pointer is coarse (touch) */
  coarse: boolean;
  tier: Tier;
  reducedMotion: boolean;
  /** `?parity=on|off` */
  forced?: "on" | "off" | null;
};

/**
 * Should a touch device run the desktop choreography?
 * Fine-pointer devices always answer false here — they take the desktop path
 * through the existing media queries, this is only about touch.
 */
export function decideParity(i: ParityInput): boolean {
  if (i.forced === "off") return false;
  if (!i.coarse) return false;
  if (i.forced === "on") return true;
  if (i.reducedMotion) return false;
  return i.tier !== "low";
}

/* ------------------------------------------------------------------ */
/* Tilt → pointer                                                      */
/* ------------------------------------------------------------------ */

export type TiltSample = { beta: number; gamma: number };

/** degrees of tilt (either axis) that map to a full pointer deflection */
export const TILT_RANGE_DEG = 14;

/**
 * Express a device orientation as a pointer in normalized device
 * coordinates (x right, y up, −1…1), relative to a rest pose.
 *
 * `angle` is `screen.orientation.angle`: in landscape the physical axes swap
 * roles so "tilt the top edge away" still means the same thing on screen.
 * Values beyond ±1 are clamped; a phone lying face-up or held upright both
 * work because only the difference from `rest` matters.
 */
export function orientationToPointer(s: TiltSample, rest: TiltSample, angle = 0): { x: number; y: number } {
  const db = s.beta - rest.beta;
  const dg = s.gamma - rest.gamma;
  let x: number;
  let y: number;
  switch (((angle % 360) + 360) % 360) {
    case 90: // landscape, home button right
      x = db;
      y = dg;
      break;
    case 270: // landscape, home button left
      x = -db;
      y = -dg;
      break;
    case 180:
      x = -dg;
      y = db;
      break;
    default: // portrait
      x = dg;
      y = -db;
  }
  const k = 1 / TILT_RANGE_DEG;
  return { x: clamp(x * k), y: clamp(y * k) };
}

/**
 * Move the rest pose toward the current sample with a time constant of
 * `tau` seconds: a held tilt fades back to centre, a change in tilt moves
 * the scene. Frame-rate independent (exponential decay in `dt`).
 */
export function followRest(rest: TiltSample, s: TiltSample, dt: number, tau = 3.2): TiltSample {
  const a = 1 - Math.exp(-Math.max(0, dt) / tau);
  return { beta: rest.beta + (s.beta - rest.beta) * a, gamma: rest.gamma + (s.gamma - rest.gamma) * a };
}

/** Is a real pointer (finger/mouse on the canvas) recent enough to own the pointer? */
export const REAL_POINTER_HOLD_MS = 800;

export function tiltMayDrive(nowMs: number, lastRealPointerMs: number): boolean {
  return nowMs - lastRealPointerMs > REAL_POINTER_HOLD_MS;
}

/* ------------------------------------------------------------------ */
/* Tilt idle — a phone lying still costs nothing                       */
/* ------------------------------------------------------------------ */

/** |pointer| below this is "settled" (rest pose has converged). */
export const TILT_SETTLE_MAG = 0.02;
/** no new orientation samples for this long, and settled → the tracking loop may rest. */
export const TILT_REST_AFTER_MS = 1500;

/**
 * Should the tilt tracking loop stop its requestAnimationFrame and wait for
 * the next `deviceorientation` event? True only when the sample stream has
 * gone quiet AND the deflection has settled — a phone on a table draws
 * nothing, a phone in a hand keeps breathing.
 */
export function tiltShouldRest(nowMs: number, lastSampleMs: number, magnitude: number, restAfterMs: number = TILT_REST_AFTER_MS): boolean {
  return nowMs - lastSampleMs > restAfterMs && magnitude < TILT_SETTLE_MAG;
}

function clamp(v: number): number {
  return v < -1 ? -1 : v > 1 ? 1 : v;
}
