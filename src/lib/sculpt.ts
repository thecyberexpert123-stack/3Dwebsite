/**
 * Whimlet Maker — sculpt brushes, pure math.
 *
 * Framework-free so it runs in Node for tests and in the browser against a
 * three.js BufferGeometry's position array. Everything is in the object's
 * LOCAL space; the caller converts the pointer hit and radius.
 *
 * Adapted from Blender's sculpt model (docs.blender.org, Sculpt Mode):
 *  - a brush has a radius, a strength and a *falloff curve* from centre to
 *    edge (Blender's "Smooth / Sharp / Linear / Constant" presets);
 *  - Draw pushes along the *area normal* (the surface normal under the
 *    cursor) — stable on bumpy meshes; Inflate pushes along each vertex's
 *    own normal; Grab captures the vertices under the cursor at stroke
 *    start and drags them with the pointer; Smooth relaxes each vertex
 *    towards its neighbours' average; Flatten projects towards the plane
 *    under the cursor; Pinch pulls vertices in towards the centre;
 *  - Ctrl inverts Draw/Inflate/Pinch, Shift temporarily smooths;
 *  - X symmetry mirrors every stroke across the local YZ plane.
 *
 * No dynamic topology: the mesh keeps its vertex count, so a design is a
 * fixed-size offset array on top of a deterministic primitive — exactly
 * what makes it small enough to save in a file.
 */

export type BrushKind = "draw" | "inflate" | "grab" | "smooth" | "flatten" | "pinch";
export type Falloff = "smooth" | "sharp" | "linear" | "constant";

export const BRUSHES: { id: BrushKind; label: string; key: string; hint: string }[] = [
  { id: "draw", label: "Draw", key: "D", hint: "Build up (Ctrl: carve in)" },
  { id: "inflate", label: "Inflate", key: "I", hint: "Puff out (Ctrl: shrink)" },
  { id: "grab", label: "Grab", key: "G", hint: "Drag a patch with the pointer" },
  { id: "smooth", label: "Smooth", key: "S", hint: "Relax bumps (also: hold Shift)" },
  { id: "flatten", label: "Flatten", key: "T", hint: "Press towards a flat plane" },
  { id: "pinch", label: "Pinch", key: "P", hint: "Pull in towards the centre (Ctrl: spread)" },
];

export const FALLOFFS: { id: Falloff; label: string }[] = [
  { id: "smooth", label: "Smooth" },
  { id: "sharp", label: "Sharp" },
  { id: "linear", label: "Linear" },
  { id: "constant", label: "Constant" },
];

export type BrushParams = {
  kind: BrushKind;
  /** local-space radius */
  radius: number;
  /** 0..1 */
  strength: number;
  falloff: Falloff;
  invert: boolean;
  symmetryX: boolean;
};

/** Weight for a vertex at normalised distance t (0 = centre, 1 = edge). */
export function falloffWeight(t: number, kind: Falloff): number {
  if (t >= 1) return 0;
  if (t <= 0) return 1;
  switch (kind) {
    case "sharp":
      return (1 - t) ** 3;
    case "linear":
      return 1 - t;
    case "constant":
      return 1;
    default: {
      // Blender "Smooth": flat top, soft shoulder
      const u = 1 - t * t;
      return u * u;
    }
  }
}

/** Vertex → neighbouring vertex indices, from a triangle index buffer. */
export function buildAdjacency(index: ArrayLike<number>, vertexCount: number): Int32Array[] {
  const sets: Set<number>[] = Array.from({ length: vertexCount }, () => new Set<number>());
  for (let i = 0; i + 2 < index.length; i += 3) {
    const a = index[i];
    const b = index[i + 1];
    const c = index[i + 2];
    sets[a].add(b).add(c);
    sets[b].add(a).add(c);
    sets[c].add(a).add(b);
  }
  return sets.map((s) => Int32Array.from(s));
}

type Vec3 = [number, number, number];

/** Collect (index, weight) pairs for vertices inside the brush sphere. */
function gather(pos: ArrayLike<number>, count: number, centre: Vec3, params: BrushParams): { idx: number[]; w: number[] } {
  const r2 = params.radius * params.radius;
  const idx: number[] = [];
  const w: number[] = [];
  for (let i = 0; i < count; i++) {
    const dx = pos[i * 3] - centre[0];
    const dy = pos[i * 3 + 1] - centre[1];
    const dz = pos[i * 3 + 2] - centre[2];
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= r2) continue;
    idx.push(i);
    w.push(falloffWeight(Math.sqrt(d2) / params.radius, params.falloff) * params.strength);
  }
  return { idx, w };
}

/** Area-weighted average of the vertex normals inside the brush → area normal. */
function areaNormal(nrm: ArrayLike<number>, idx: number[], w: number[], fallback: Vec3): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let k = 0; k < idx.length; k++) {
    const i = idx[k] * 3;
    x += nrm[i] * w[k];
    y += nrm[i + 1] * w[k];
    z += nrm[i + 2] * w[k];
  }
  const len = Math.hypot(x, y, z);
  return len > 1e-9 ? [x / len, y / len, z / len] : fallback;
}

export type SculptSample = {
  /** local-space hit point */
  point: Vec3;
  /** local-space surface normal at the hit */
  normal: Vec3;
};

/**
 * Apply one dab of a non-grab brush. Mutates `pos` in place and returns
 * how many vertices moved. `count` = vertex count (pos.length / 3).
 */
export function applyDab(
  pos: Float32Array | number[],
  nrm: ArrayLike<number>,
  adjacency: Int32Array[] | null,
  count: number,
  params: BrushParams,
  sample: SculptSample
): number {
  let moved = dabAt(pos, nrm, adjacency, count, params, sample.point, sample.normal);
  if (params.symmetryX && Math.abs(sample.point[0]) > 1e-6) {
    const mp: Vec3 = [-sample.point[0], sample.point[1], sample.point[2]];
    const mn: Vec3 = [-sample.normal[0], sample.normal[1], sample.normal[2]];
    moved += dabAt(pos, nrm, adjacency, count, params, mp, mn);
  }
  return moved;
}

function dabAt(
  pos: Float32Array | number[],
  nrm: ArrayLike<number>,
  adjacency: Int32Array[] | null,
  count: number,
  params: BrushParams,
  centre: Vec3,
  hitNormal: Vec3
): number {
  const { idx, w } = gather(pos, count, centre, params);
  if (!idx.length) return 0;
  const sign = params.invert ? -1 : 1;
  // one dab moves at most ~12 % of the radius so a stroke builds up gradually
  const amount = params.radius * 0.12;

  switch (params.kind) {
    case "draw": {
      const n = areaNormal(nrm, idx, w, hitNormal);
      for (let k = 0; k < idx.length; k++) {
        const i = idx[k] * 3;
        const s = w[k] * amount * sign;
        pos[i] += n[0] * s;
        pos[i + 1] += n[1] * s;
        pos[i + 2] += n[2] * s;
      }
      break;
    }
    case "inflate": {
      for (let k = 0; k < idx.length; k++) {
        const i = idx[k] * 3;
        const s = w[k] * amount * sign;
        pos[i] += nrm[i] * s;
        pos[i + 1] += nrm[i + 1] * s;
        pos[i + 2] += nrm[i + 2] * s;
      }
      break;
    }
    case "smooth": {
      if (!adjacency) return 0;
      // read from a copy so the pass is order-independent
      const src = Array.from({ length: idx.length }, (_, k) => {
        const i = idx[k];
        const nb = adjacency[i];
        if (!nb || nb.length === 0) return null;
        let x = 0;
        let y = 0;
        let z = 0;
        for (let j = 0; j < nb.length; j++) {
          const m = nb[j] * 3;
          x += pos[m];
          y += pos[m + 1];
          z += pos[m + 2];
        }
        return [x / nb.length, y / nb.length, z / nb.length] as Vec3;
      });
      for (let k = 0; k < idx.length; k++) {
        const avg = src[k];
        if (!avg) continue;
        const i = idx[k] * 3;
        const s = Math.min(1, w[k] * 0.6);
        pos[i] += (avg[0] - pos[i]) * s;
        pos[i + 1] += (avg[1] - pos[i + 1]) * s;
        pos[i + 2] += (avg[2] - pos[i + 2]) * s;
      }
      break;
    }
    case "flatten": {
      const n = areaNormal(nrm, idx, w, hitNormal);
      // plane through the weighted centroid of the patch
      let cx = 0;
      let cy = 0;
      let cz = 0;
      let tw = 0;
      for (let k = 0; k < idx.length; k++) {
        const i = idx[k] * 3;
        cx += pos[i] * w[k];
        cy += pos[i + 1] * w[k];
        cz += pos[i + 2] * w[k];
        tw += w[k];
      }
      if (tw <= 0) return 0;
      cx /= tw;
      cy /= tw;
      cz /= tw;
      for (let k = 0; k < idx.length; k++) {
        const i = idx[k] * 3;
        const d = (pos[i] - cx) * n[0] + (pos[i + 1] - cy) * n[1] + (pos[i + 2] - cz) * n[2];
        const s = Math.min(1, w[k] * 0.5);
        pos[i] -= n[0] * d * s;
        pos[i + 1] -= n[1] * d * s;
        pos[i + 2] -= n[2] * d * s;
      }
      break;
    }
    case "pinch": {
      for (let k = 0; k < idx.length; k++) {
        const i = idx[k] * 3;
        const s = w[k] * 0.25 * sign;
        pos[i] += (centre[0] - pos[i]) * s;
        pos[i + 1] += (centre[1] - pos[i + 1]) * s;
        pos[i + 2] += (centre[2] - pos[i + 2]) * s;
      }
      break;
    }
    default:
      return 0;
  }
  return idx.length;
}

/* ------------------------------------------------------------------ */
/* Grab: capture once, drag many                                       */
/* ------------------------------------------------------------------ */

export type GrabState = {
  idx: number[];
  w: number[];
  start: Float32Array; // xyz per captured vertex
  /** mirrored set when symmetry is on */
  mirror: { idx: number[]; w: number[]; start: Float32Array } | null;
};

export function beginGrab(pos: Float32Array | number[], count: number, params: BrushParams, point: Vec3): GrabState {
  const capture = (centre: Vec3) => {
    const { idx, w } = gather(pos, count, centre, params);
    const start = new Float32Array(idx.length * 3);
    for (let k = 0; k < idx.length; k++) {
      const i = idx[k] * 3;
      start[k * 3] = pos[i];
      start[k * 3 + 1] = pos[i + 1];
      start[k * 3 + 2] = pos[i + 2];
    }
    return { idx, w, start };
  };
  const main = capture(point);
  const mirror = params.symmetryX && Math.abs(point[0]) > 1e-6 ? capture([-point[0], point[1], point[2]]) : null;
  return { ...main, mirror };
}

/** Move the captured patch by `delta` (local space) from its start positions. */
export function applyGrab(pos: Float32Array | number[], grab: GrabState, delta: Vec3): void {
  const move = (set: { idx: number[]; w: number[]; start: Float32Array }, d: Vec3) => {
    for (let k = 0; k < set.idx.length; k++) {
      const i = set.idx[k] * 3;
      const s = set.w[k];
      pos[i] = set.start[k * 3] + d[0] * s;
      pos[i + 1] = set.start[k * 3 + 1] + d[1] * s;
      pos[i + 2] = set.start[k * 3 + 2] + d[2] * s;
    }
  };
  move(grab, delta);
  if (grab.mirror) move(grab.mirror, [-delta[0], delta[1], delta[2]]);
}

/* ------------------------------------------------------------------ */
/* Offsets ⇄ compact storage                                           */
/* ------------------------------------------------------------------ */

export type SculptData = { count: number; scale: number; data: string };

/**
 * Quantise offsets to int16 (error ≤ scale / 32767) and base64 them —
 * *sparsely*: only vertices that actually moved are stored, as
 * (uint16 index, int16 x, int16 y, int16 z) records. A brush touches a
 * few percent of a primitive, so a typical sculpt is a few hundred bytes
 * and fits in a share link; a fully reworked part still tops out at
 * 8 bytes × count.
 */
export function encodeOffsets(offsets: ArrayLike<number>, count: number): SculptData | null {
  let max = 0;
  const touched: number[] = [];
  for (let i = 0; i < count; i++) {
    const x = offsets[i * 3];
    const y = offsets[i * 3 + 1];
    const z = offsets[i * 3 + 2];
    const m = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
    if (m < 1e-6) continue;
    touched.push(i);
    if (m > max) max = m;
  }
  if (!touched.length) return null; // untouched
  const buf = new ArrayBuffer(touched.length * 8);
  const view = new DataView(buf);
  const k = 32767 / max;
  touched.forEach((i, n) => {
    view.setUint16(n * 8, i, true);
    view.setInt16(n * 8 + 2, Math.round(offsets[i * 3] * k), true);
    view.setInt16(n * 8 + 4, Math.round(offsets[i * 3 + 1] * k), true);
    view.setInt16(n * 8 + 6, Math.round(offsets[i * 3 + 2] * k), true);
  });
  return { count, scale: max, data: bytesToB64(new Uint8Array(buf)) };
}

export function decodeOffsets(d: SculptData, expectedCount: number): Float32Array | null {
  if (!d || d.count !== expectedCount || !(d.scale > 0) || typeof d.data !== "string") return null;
  let bytes: Uint8Array;
  try {
    bytes = b64ToBytes(d.data);
  } catch {
    return null;
  }
  if (bytes.length === 0 || bytes.length % 8 !== 0 || bytes.length / 8 > expectedCount) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  const out = new Float32Array(expectedCount * 3);
  const k = d.scale / 32767;
  for (let n = 0; n < bytes.length; n += 8) {
    const i = view.getUint16(n, true);
    if (i >= expectedCount) return null;
    out[i * 3] = view.getInt16(n + 2, true) * k;
    out[i * 3 + 1] = view.getInt16(n + 4, true) * k;
    out[i * 3 + 2] = view.getInt16(n + 6, true) * k;
  }
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/* ------------------------------------------------------------------ */
/* Surface area — for the stitch / yarn estimate                        */
/* ------------------------------------------------------------------ */

/** Triangle-mesh surface area after a non-uniform scale (local units²). */
export function surfaceArea(pos: ArrayLike<number>, index: ArrayLike<number> | null, count: number, scale: Vec3): number {
  const tri = (a: number, b: number, c: number) => {
    const ax = pos[a * 3] * scale[0];
    const ay = pos[a * 3 + 1] * scale[1];
    const az = pos[a * 3 + 2] * scale[2];
    const ux = pos[b * 3] * scale[0] - ax;
    const uy = pos[b * 3 + 1] * scale[1] - ay;
    const uz = pos[b * 3 + 2] * scale[2] - az;
    const vx = pos[c * 3] * scale[0] - ax;
    const vy = pos[c * 3 + 1] * scale[1] - ay;
    const vz = pos[c * 3 + 2] * scale[2] - az;
    const cx = uy * vz - uz * vy;
    const cy = uz * vx - ux * vz;
    const cz = ux * vy - uy * vx;
    return 0.5 * Math.hypot(cx, cy, cz);
  };
  let area = 0;
  if (index) {
    for (let i = 0; i + 2 < index.length; i += 3) area += tri(index[i], index[i + 1], index[i + 2]);
  } else {
    for (let i = 0; i + 2 < count; i += 3) area += tri(i, i + 1, i + 2);
  }
  return area;
}
