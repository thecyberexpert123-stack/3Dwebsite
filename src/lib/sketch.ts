/**
 * Sketch-to-petal pipeline — turns a freehand drawing into a clean,
 * normalized petal outline that the 3D studio can extrude into geometry.
 *
 * Pure, framework-free math (no THREE, no DOM) so it runs identically in
 * the browser, in Node and in CI.
 *
 * Coordinate convention: PETAL SPACE — y points UP, the petal tip sits at
 * y ≈ 1, the base rests on y = 0, and x is centred on 0. Drawing canvases
 * (y down) must flip before calling in.
 */

export type Pt = { x: number; y: number };

/** Number of points a processed petal outline carries. */
export const PETAL_POINTS = 40;

/** Max allowed half-width, as a fraction of petal height (keeps blobs petal-shaped). */
const MAX_HALF_WIDTH = 0.5;

/* ------------------------------------------------------------------ */
/* Primitive curve tools                                               */
/* ------------------------------------------------------------------ */

/** Resample a polyline to exactly `n` points, evenly spaced by arc length. */
export function resample(pts: Pt[], n: number): Pt[] {
  if (pts.length === 0) return [];
  if (pts.length === 1) return Array.from({ length: n }, () => ({ ...pts[0] }));
  const d: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    d.push(d[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  const total = d[d.length - 1];
  if (total <= 1e-9) return Array.from({ length: n }, () => ({ ...pts[0] }));
  const out: Pt[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const target = (k / n) * total;
    while (j < pts.length - 2 && d[j + 1] < target) j++;
    const seg = Math.max(d[j + 1] - d[j], 1e-9);
    const t = (target - d[j]) / seg;
    out.push({
      x: pts[j].x + (pts[j + 1].x - pts[j].x) * t,
      y: pts[j].y + (pts[j + 1].y - pts[j].y) * t,
    });
  }
  return out;
}

/** Laplacian smoothing on a CLOSED loop — each point drifts toward the
 *  midpoint of its neighbours. A few passes turn shaky lines into calm ones. */
export function laplacianSmooth(pts: Pt[], iterations: number, lambda = 0.5): Pt[] {
  let cur = pts.map((p) => ({ ...p }));
  const n = cur.length;
  for (let it = 0; it < iterations && n >= 3; it++) {
    const next: Pt[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = cur[(i - 1 + n) % n];
      const b = cur[(i + 1) % n];
      next[i] = {
        x: cur[i].x + lambda * ((a.x + b.x) / 2 - cur[i].x),
        y: cur[i].y + lambda * ((a.y + b.y) / 2 - cur[i].y),
      };
    }
    cur = next;
  }
  return cur;
}

/** Same idea for an OPEN path — endpoints stay pinned. */
export function smoothOpen(pts: Pt[], iterations: number, lambda = 0.5): Pt[] {
  let cur = pts.map((p) => ({ ...p }));
  const n = cur.length;
  for (let it = 0; it < iterations && n >= 3; it++) {
    const next = cur.map((p) => ({ ...p }));
    for (let i = 1; i < n - 1; i++) {
      next[i] = {
        x: cur[i].x + lambda * ((cur[i - 1].x + cur[i + 1].x) / 2 - cur[i].x),
        y: cur[i].y + lambda * ((cur[i - 1].y + cur[i + 1].y) / 2 - cur[i].y),
      };
    }
    cur = next;
  }
  return cur;
}

function centroid(pts: Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.length, y: y / pts.length };
}

/**
 * Re-express a loop as `n` points at even ANGLES around its centroid
 * (radius per angle = median of ray↔segment intersections). This closes
 * gaps, removes double-backs and guarantees a simple, star-shaped outline
 * that downstream steps (symmetry, extrusion) can trust.
 */
export function polarResample(pts: Pt[], n: number): Pt[] {
  const c = centroid(pts);
  let avgR = 0;
  for (const p of pts) avgR += Math.hypot(p.x - c.x, p.y - c.y);
  avgR /= Math.max(pts.length, 1);

  const out: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const hits: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      const ex = q.x - p.x;
      const ey = q.y - p.y;
      const denom = dx * ey - dy * ex;
      if (Math.abs(denom) < 1e-9) continue;
      const s = (dx * (p.y - c.y) - dy * (p.x - c.x)) / denom;
      if (s < 0 || s >= 1) continue;
      const t = (ex * (p.y - c.y) - ey * (p.x - c.x)) / denom;
      if (t > 1e-6) hits.push(t);
    }
    let r: number;
    if (hits.length === 0) {
      r = avgR * 0.5; // degenerate angle — keep the loop connected
    } else {
      hits.sort((u, v) => u - v);
      r = hits[Math.floor(hits.length / 2)]; // median: robust to stray strokes
    }
    out.push({ x: c.x + dx * r, y: c.y + dy * r });
  }
  return out;
}

/**
 * Mirror-average an angularly-ordered loop about the vertical axis through
 * its centroid. Points on the axis snap onto it, so petal tips and bases
 * end up perfectly centred.
 */
export function mirrorSymmetrize(pts: Pt[]): Pt[] {
  const n = pts.length;
  if (n < 4 || n % 2 !== 0) return pts.map((p) => ({ ...p }));
  const c = centroid(pts); // mirror axis runs through the loop's centre
  const out = pts.map((p) => ({ ...p }));
  for (let i = 0; i < n; i++) {
    const j = (n / 2 - i + n) % n;
    if (i === j) {
      out[i].x = c.x; // on the mirror axis
    } else if (i < j) {
      const xMid = (out[i].x + out[j].x) / 2;
      const y = (out[i].y + out[j].y) / 2;
      out[i] = { x: xMid, y };
      out[j] = { x: 2 * c.x - xMid, y };
    }
  }
  return out;
}

/** Fit an outline into petal space: height 1, base on y=0, tip at y=1,
 *  x centred, width clamped so it stays petal-shaped. */
export function normalizeOutline(pts: Pt[]): Pt[] {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const h = Math.max(maxY - minY, 1e-6);
  const cx = (minX + maxX) / 2;
  let scale = 1 / h;
  const halfW = (maxX - minX) / 2 / h;
  if (halfW > MAX_HALF_WIDTH) scale = scale * (MAX_HALF_WIDTH / halfW);
  return pts.map((p) => ({
    x: (p.x - cx) * scale,
    y: (p.y - minY) * scale,
  }));
}

/* ------------------------------------------------------------------ */
/* The full pipeline                                                   */
/* ------------------------------------------------------------------ */

/**
 * Raw sketch → clean petal outline (PETAL_POINTS points, petal space).
 * Steps: even resampling → open smoothing → polar closing → loop
 * smoothing → optional mirror symmetry → normalization.
 * Throws on degenerate input (too short / no area).
 */
export function processSketch(raw: Pt[], symmetric = true): Pt[] {
  if (raw.length < 8) {
    throw new Error("keep going — draw the whole petal outline in one smooth stroke");
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of raw) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  if (Math.hypot(maxX - minX, maxY - minY) < 0.05) {
    throw new Error("a little bigger, please — give the petal some room");
  }

  let pts = resample(raw, 64);
  pts = smoothOpen(pts, 2, 0.5);
  let loop = polarResample(pts, PETAL_POINTS);
  loop = laplacianSmooth(loop, 2, 0.42);
  if (symmetric) {
    loop = mirrorSymmetrize(loop);
    // mirror-averaging can nudge neighbours past each other — re-express
    // the loop at even angles to heal any crossing (symmetry survives:
    // a symmetric loop samples mirrored radii from mirrored angles)
    loop = polarResample(loop, PETAL_POINTS);
    loop = laplacianSmooth(loop, 1, 0.3);
  }
  return normalizeOutline(loop);
}

/* ------------------------------------------------------------------ */
/* Storage: quantized outlines that survive a URL round-trip           */
/* ------------------------------------------------------------------ */

/** Outline → flat int array (0..255 per coordinate). x∈[-0.5,0.5]→0..255, y∈[0,1]→0..255. */
export function quantizePetal(pts: Pt[]): number[] {
  const out: number[] = [];
  for (const p of pts) {
    const x = Math.min(1, Math.max(0, p.x / (2 * MAX_HALF_WIDTH) + 0.5));
    const y = Math.min(1, Math.max(0, p.y));
    out.push(Math.round(x * 255), Math.round(y * 255));
  }
  return out;
}

/** Quantized array → outline in petal space. */
export function dequantizePetal(data: number[]): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i + 1 < data.length; i += 2) {
    pts.push({
      x: (data[i] / 255 - 0.5) * (2 * MAX_HALF_WIDTH),
      y: data[i + 1] / 255,
    });
  }
  return pts;
}

/** Strict validation for untrusted data (URL params). */
export function isValidPetalData(v: unknown): v is number[] {
  if (!Array.isArray(v) || v.length < 16 || v.length > 256 || v.length % 2 !== 0) return false;
  return v.every((n) => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 255);
}

/* ------------------------------------------------------------------ */
/* Built-in outlines (presets + the randomizer)                        */
/* ------------------------------------------------------------------ */

/** A hand-tuned wild petal with softly ruffled edges. */
export function wildPetalOutline(): Pt[] {
  const raw: Pt[] = [];
  const N = 72;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const y = Math.pow((Math.cos(t) + 1) / 2, 0.95);
    const x =
      Math.sin(t) * (0.34 + 0.06 * Math.cos(4 * t)) +
      Math.sin(t) * 0.05 * Math.cos(6 * t + 0.8);
    raw.push({ x, y: y + 0.02 * Math.cos(3 * t) * Math.sin(t) });
  }
  return normalizeOutline(raw);
}

/** A broad, blunt tulip petal that cups at the top. */
export function tulipPetalOutline(): Pt[] {
  const raw: Pt[] = [];
  const N = 72;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const y = Math.pow((Math.cos(t) + 1) / 2, 0.8);
    const x = Math.sin(t) * (0.44 * (0.62 + 0.38 * Math.sin(Math.min(y, 1) * Math.PI)));
    raw.push({ x, y });
  }
  return normalizeOutline(raw);
}

/** A fresh organic petal for "Surprise me" — a classic taper with
 *  low-frequency wobble so it always looks hand-cut, never machined. */
export function randomPetalOutline(): Pt[] {
  const w = 0.3 + Math.random() * 0.16;
  const tipSharp = 0.9 + Math.random() * 0.45;
  const wob2 = 0.02 + Math.random() * 0.07;
  const wob3 = Math.random() * 0.05;
  const p2 = Math.random() * Math.PI * 2;
  const p3 = Math.random() * Math.PI * 2;
  const raw: Pt[] = [];
  const N = 72;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const y = Math.pow((Math.cos(t) + 1) / 2, tipSharp);
    const x =
      Math.sin(t) * w * (0.62 + 0.38 * (1 - y)) +
      Math.cos(2 * t + p2) * wob2 * Math.sin(t) +
      Math.cos(3 * t + p3) * wob3 * Math.sin(t);
    raw.push({ x, y: y + Math.sin(2 * t + p2) * wob2 * 0.4 * Math.sin(t) });
  }
  return normalizeOutline(raw);
}
