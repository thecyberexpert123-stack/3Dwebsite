/**
 * Whimlet Maker — free-form design document.
 *
 * Pure, framework-free: the part vocabulary (crochet-shaped primitives),
 * the document format, sanitising, URL/file serialisation, starter
 * templates, a yarn/stitch estimate and a plain-language description.
 *
 * Units: 1 maker unit = 5 cm. A default ball (radius 0.5) is a 5 cm
 * amigurumi sphere — the size a beginner actually crochets.
 *
 * Why a *document of primitives + sculpt offsets* rather than free meshes:
 * every part is a deterministic primitive (fixed vertex count) so a design
 * is tiny, diff-able and safe to load; sculpting stores a quantised offset
 * per vertex on top (see lib/sculpt.ts). That is the "Blender-like" middle
 * ground that still produces something a crochet maker can read: N balls,
 * M tubes, colours, sizes, and a rough yarn estimate.
 */

import { decodeOffsets, type SculptData } from "./sculpt";

export const MAKER_FORMAT = "whimlet-maker" as const;
export const MAKER_VERSION = 1 as const;
export const UNIT_CM = 5;
export const MAX_PARTS = 40;
export const NAME_MAX = 40;
export const NOTE_MAX = 160;
export const MAKER_FILE_MAX_BYTES = 1024 * 1024;

export type PrimitiveKind = "ball" | "egg" | "tube" | "cone" | "ring" | "heart" | "petal" | "leaf" | "cube" | "disc";

export type MakerFinish = "cotton" | "velvet" | "fuzzy" | "satin" | "pearl";

export type MakerPart = {
  id: string;
  kind: PrimitiveKind;
  name: string;
  position: [number, number, number];
  /** Euler XYZ, radians */
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  finish: MakerFinish;
  visible: boolean;
  /** render a mirrored twin across the model's X axis (Blender's Mirror modifier) */
  mirror: boolean;
  /** per-vertex sculpt offsets, or null when untouched */
  sculpt: SculptData | null;
};

export type MakerDoc = {
  name: string;
  note: string;
  parts: MakerPart[];
};

export type MakerFile = {
  format: typeof MAKER_FORMAT;
  version: number;
  app: string;
  createdAt: string;
  summary: string;
  doc: MakerDoc;
};

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export const PRIMITIVES: { kind: PrimitiveKind; label: string; hint: string; key: string }[] = [
  { kind: "ball", label: "Ball", hint: "Heads, bodies, berries", key: "1" },
  { kind: "egg", label: "Egg", hint: "Bodies, bellies, tulip buds", key: "2" },
  { kind: "tube", label: "Tube", hint: "Arms, legs, stems, handles", key: "3" },
  { kind: "cone", label: "Cone", hint: "Carrots, hats, noses, ears", key: "4" },
  { kind: "ring", label: "Ring", hint: "Donuts, scrunchies, halos", key: "5" },
  { kind: "heart", label: "Heart", hint: "Charms, patches, cheeks", key: "6" },
  { kind: "petal", label: "Petal", hint: "Flowers, wings, ears", key: "7" },
  { kind: "leaf", label: "Leaf", hint: "Foliage, tails, feathers", key: "8" },
  { kind: "cube", label: "Cube", hint: "Boxes, dice, blocks", key: "9" },
  { kind: "disc", label: "Disc", hint: "Coasters, bases, eyes", key: "0" },
];

export const FINISHES: { id: MakerFinish; label: string; hint: string }[] = [
  { id: "cotton", label: "Cotton", hint: "Crisp stitches, matte" },
  { id: "velvet", label: "Velvet", hint: "Deep, soft sheen" },
  { id: "fuzzy", label: "Fuzzy", hint: "Halo of fibres" },
  { id: "satin", label: "Satin", hint: "Ribbon-smooth, glossy" },
  { id: "pearl", label: "Pearl", hint: "Beads and safety eyes" },
];

export type Swatch = { name: string; hex: string };

export const MAKER_SWATCHES: Swatch[] = [
  { name: "blush pink", hex: "#F2B9C9" },
  { name: "peach", hex: "#F7C9B0" },
  { name: "cream", hex: "#F6E9D8" },
  { name: "butter yellow", hex: "#F7E2A4" },
  { name: "coral", hex: "#EC8F86" },
  { name: "rose red", hex: "#D96A6A" },
  { name: "berry", hex: "#B85C8A" },
  { name: "lavender", hex: "#CBB6EA" },
  { name: "sky blue", hex: "#BFDCF7" },
  { name: "mint", hex: "#CDEBDF" },
  { name: "sage green", hex: "#A9BFA3" },
  { name: "leaf green", hex: "#7C977A" },
  { name: "cocoa brown", hex: "#8A6A5C" },
  { name: "caramel", hex: "#C9975B" },
  { name: "charcoal", hex: "#3F3A3D" },
  { name: "white", hex: "#FFF7F0" },
];

const KIND_SET = new Set<PrimitiveKind>(PRIMITIVES.map((p) => p.kind));
const FINISH_SET = new Set<MakerFinish>(FINISHES.map((f) => f.id));
const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Fixed segment counts per primitive → fixed vertex counts (sculpt data depends on them). */
export const PRIMITIVE_SEGMENTS: Record<PrimitiveKind, { a: number; b: number }> = {
  ball: { a: 32, b: 22 },
  egg: { a: 32, b: 22 },
  tube: { a: 24, b: 12 },
  cone: { a: 28, b: 10 },
  ring: { a: 20, b: 36 },
  heart: { a: 16, b: 3 },
  petal: { a: 16, b: 18 },
  leaf: { a: 14, b: 16 },
  cube: { a: 4, b: 4 },
  disc: { a: 32, b: 4 },
};

/* ------------------------------------------------------------------ */
/* Construction                                                        */
/* ------------------------------------------------------------------ */

let counter = 0;
export function newId(): string {
  counter = (counter + 1) % 1e6;
  return `${Date.now().toString(36).slice(-4)}${counter.toString(36)}`;
}

export function makePart(kind: PrimitiveKind, overrides: Partial<MakerPart> = {}): MakerPart {
  const label = PRIMITIVES.find((p) => p.kind === kind)?.label ?? "Part";
  return {
    id: newId(),
    kind,
    name: label,
    position: [0, 0.5, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    color: "#F2B9C9",
    finish: "cotton",
    visible: true,
    mirror: false,
    sculpt: null,
    ...overrides,
  };
}

export const EMPTY_DOC: MakerDoc = { name: "", note: "", parts: [] };

/* ------------------------------------------------------------------ */
/* Sanitising — never trust a link or a file                            */
/* ------------------------------------------------------------------ */

const clampNum = (v: unknown, lo: number, hi: number, dflt: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(hi, Math.max(lo, n));
};

const vec = (v: unknown, lo: number, hi: number, dflt: [number, number, number]): [number, number, number] =>
  Array.isArray(v) && v.length === 3 ? [clampNum(v[0], lo, hi, dflt[0]), clampNum(v[1], lo, hi, dflt[1]), clampNum(v[2], lo, hi, dflt[2])] : dflt;

const text = (v: unknown, max: number): string =>
  typeof v === "string"
    ? v
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";

export function sanitizePart(raw: unknown, index: number, warnings?: string[]): MakerPart | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const kind = KIND_SET.has(r.kind as PrimitiveKind) ? (r.kind as PrimitiveKind) : null;
  if (!kind) {
    warnings?.push(`Part ${index + 1}: unknown shape "${String(r.kind)}" dropped.`);
    return null;
  }
  const finish = FINISH_SET.has(r.finish as MakerFinish) ? (r.finish as MakerFinish) : "cotton";
  const color = typeof r.color === "string" && HEX.test(r.color) ? r.color.toUpperCase() : "#F2B9C9";
  const scale = vec(r.scale, 0.05, 8, [1, 1, 1]);
  let sculpt: SculptData | null = null;
  if (r.sculpt && typeof r.sculpt === "object") {
    const s = r.sculpt as Record<string, unknown>;
    const count = clampNum(s.count, 1, 20000, 0);
    const scaleS = clampNum(s.scale, 1e-6, 10, 0);
    if (count > 0 && scaleS > 0 && typeof s.data === "string" && s.data.length <= 200000 && /^[A-Za-z0-9+/=]*$/.test(s.data)) {
      sculpt = { count, scale: scaleS, data: s.data };
    } else if (s.data) warnings?.push(`Part ${index + 1}: sculpt detail was unreadable and was dropped.`);
  }
  const id = typeof r.id === "string" && /^[a-z0-9]{1,12}$/i.test(r.id) ? r.id : newId();
  return {
    id,
    kind,
    name: text(r.name, NAME_MAX) || (PRIMITIVES.find((p) => p.kind === kind)?.label ?? "Part"),
    position: vec(r.position, -20, 20, [0, 0.5, 0]),
    rotation: vec(r.rotation, -Math.PI * 4, Math.PI * 4, [0, 0, 0]),
    scale,
    color,
    finish,
    visible: r.visible !== false,
    mirror: r.mirror === true,
    sculpt,
  };
}

export function sanitizeDoc(raw: unknown, warnings?: string[]): MakerDoc {
  if (!raw || typeof raw !== "object") return { ...EMPTY_DOC, parts: [] };
  const r = raw as Record<string, unknown>;
  const partsRaw = Array.isArray(r.parts) ? r.parts : [];
  if (partsRaw.length > MAX_PARTS) warnings?.push(`Only the first ${MAX_PARTS} parts were kept.`);
  const parts: MakerPart[] = [];
  const seen = new Set<string>();
  partsRaw.slice(0, MAX_PARTS).forEach((p, i) => {
    const part = sanitizePart(p, i, warnings);
    if (!part) return;
    if (seen.has(part.id)) part.id = newId();
    seen.add(part.id);
    parts.push(part);
  });
  return { name: text(r.name, NAME_MAX), note: text(r.note, NOTE_MAX), parts };
}

/* ------------------------------------------------------------------ */
/* Serialisation                                                       */
/* ------------------------------------------------------------------ */

function b64url(s: string): string {
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): string {
  return s.replace(/-/g, "+").replace(/_/g, "/");
}
function utf8ToB64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(bin);
}
function b64ToUtf8(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

const round = (n: number, p = 3) => Math.round(n * 10 ** p) / 10 ** p;

/** Compact wire form: short keys, rounded numbers, defaults omitted. */
function compactPart(p: MakerPart, withSculpt: boolean): Record<string, unknown> {
  const o: Record<string, unknown> = { i: p.id, k: p.kind, p: p.position.map((v) => round(v)) };
  if (p.name !== (PRIMITIVES.find((x) => x.kind === p.kind)?.label ?? "")) o.n = p.name;
  if (p.rotation.some((v) => v !== 0)) o.r = p.rotation.map((v) => round(v));
  if (p.scale.some((v) => v !== 1)) o.s = p.scale.map((v) => round(v));
  if (p.color !== "#F2B9C9") o.c = p.color;
  if (p.finish !== "cotton") o.f = p.finish;
  if (!p.visible) o.h = 1;
  if (p.mirror) o.m = 1;
  if (withSculpt && p.sculpt) o.d = p.sculpt;
  return o;
}

function expandPart(o: Record<string, unknown>): Record<string, unknown> {
  return { id: o.i, kind: o.k, name: o.n, position: o.p, rotation: o.r, scale: o.s, color: o.c, finish: o.f, visible: o.h ? false : true, mirror: !!o.m, sculpt: o.d };
}

export const SHARE_LINK_MAX = 6000;

/**
 * Encode for a `?m=` share link. Sculpt detail is included only while the
 * code stays under SHARE_LINK_MAX characters; beyond that it is dropped and
 * `sculptDropped` tells the UI to say so (the file always has everything).
 */
export function encodeDoc(doc: MakerDoc): { code: string; sculptDropped: boolean } {
  const build = (withSculpt: boolean) =>
    b64url(utf8ToB64(JSON.stringify({ v: MAKER_VERSION, n: doc.name || undefined, t: doc.note || undefined, P: doc.parts.map((p) => compactPart(p, withSculpt)) })));
  const full = build(true);
  if (full.length <= SHARE_LINK_MAX) return { code: full, sculptDropped: false };
  const hasSculpt = doc.parts.some((p) => p.sculpt);
  return { code: build(false), sculptDropped: hasSculpt };
}

export function decodeDoc(code: string): MakerDoc | null {
  try {
    if (!code || code.length > 200000) return null;
    const json = b64ToUtf8(fromB64url(code));
    const raw = JSON.parse(json) as Record<string, unknown>;
    const P = Array.isArray(raw.P) ? raw.P : [];
    return sanitizeDoc({ name: raw.n, note: raw.t, parts: P.map((o) => expandPart(o as Record<string, unknown>)) });
  } catch {
    return null;
  }
}

export function makerFileName(doc: MakerDoc): string {
  const base = (doc.name || describeShortDoc(doc)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "design";
  return `${base}.whimlet-maker.json`;
}

export function toMakerFile(doc: MakerDoc, now: Date = new Date()): MakerFile {
  return { format: MAKER_FORMAT, version: MAKER_VERSION, app: "Whimlet Maker", createdAt: now.toISOString(), summary: describeDoc(doc), doc };
}

export type ParsedMakerFile = { ok: true; file: MakerFile; warnings: string[] } | { ok: false; error: string };

export function parseMakerFile(textIn: string): ParsedMakerFile {
  if (textIn.length > MAKER_FILE_MAX_BYTES) return { ok: false, error: "That file is too large to be a Whimlet Maker design." };
  const trimmed = textIn.trim();
  if (!trimmed) return { ok: false, error: "The file is empty." };
  const warnings: string[] = [];
  if (!trimmed.startsWith("{")) {
    let code = trimmed;
    try {
      const url = new URL(trimmed);
      code = url.searchParams.get("m") ?? "";
    } catch {
      /* bare code */
    }
    const doc = code ? decodeDoc(code) : null;
    if (!doc) return { ok: false, error: "That isn't a Whimlet Maker file, link or code." };
    return { ok: true, file: toMakerFile(doc), warnings: ["Opened from a share link — sculpt detail may be missing."] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "The file isn't valid JSON." };
  }
  if (!parsed || typeof parsed !== "object") return { ok: false, error: "The file has no content." };
  const r = parsed as Record<string, unknown>;
  if (r.format !== MAKER_FORMAT) return { ok: false, error: `Not a Whimlet Maker file (format "${String(r.format)}").` };
  const version = typeof r.version === "number" ? r.version : 0;
  if (version > MAKER_VERSION) warnings.push(`Made with a newer Maker (v${version}); unknown details were ignored.`);
  const doc = sanitizeDoc(r.doc, warnings);
  if (!doc.parts.length) warnings.push("The design has no parts.");
  const createdAt = typeof r.createdAt === "string" && !Number.isNaN(Date.parse(r.createdAt)) ? r.createdAt : new Date(0).toISOString();
  return { ok: true, file: { format: MAKER_FORMAT, version: MAKER_VERSION, app: typeof r.app === "string" ? r.app.slice(0, 40) : "Whimlet Maker", createdAt, summary: describeDoc(doc), doc }, warnings };
}

/* ------------------------------------------------------------------ */
/* Estimates                                                            */
/* ------------------------------------------------------------------ */

/** Unit-scale surface area of each primitive (local units², scale 1). Measured once from the generated meshes. */
export const PRIMITIVE_AREA: Record<PrimitiveKind, number> = {
  ball: 3.14, // sphere r 0.5
  egg: 3.4,
  tube: 3.6, // capsule r 0.25 h 1
  cone: 1.9,
  ring: 3.16, // torus R 0.4 r 0.14
  heart: 2.2,
  petal: 1.1,
  leaf: 0.9,
  cube: 6.0,
  disc: 1.8,
};

export type MakerSpec = {
  parts: number;
  visibleParts: number;
  byKind: { kind: PrimitiveKind; label: string; count: number }[];
  /** bounding size in cm (w × h × d) */
  sizeCm: [number, number, number];
  areaCm2: number;
  stitches: number;
  yarnGrams: number;
  palette: { hex: string; name: string; count: number }[];
};

export function colourNameOf(hex: string): string {
  return MAKER_SWATCHES.find((s) => s.hex.toUpperCase() === hex.toUpperCase())?.name ?? `custom (${hex.toUpperCase()})`;
}

/** Rough numbers a maker can sanity-check: DK single crochet ≈ 3 st/cm², ≈ 0.05 g/cm². */
export function estimateDoc(doc: MakerDoc, areaOverride?: (p: MakerPart) => number | null): MakerSpec {
  const vis = doc.parts.filter((p) => p.visible);
  const byKindMap = new Map<PrimitiveKind, number>();
  const palette = new Map<string, number>();
  let area = 0;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of vis) {
    byKindMap.set(p.kind, (byKindMap.get(p.kind) ?? 0) + (p.mirror ? 2 : 1));
    palette.set(p.color, (palette.get(p.color) ?? 0) + 1);
    const [sx, sy, sz] = p.scale;
    // area scales roughly with the mean pairwise product of the scale factors
    const scaleArea = (sx * sy + sy * sz + sz * sx) / 3;
    const a = areaOverride?.(p) ?? PRIMITIVE_AREA[p.kind] * scaleArea;
    area += a * (p.mirror ? 2 : 1);
    // crude bounds: primitive extent ~1 unit × scale
    const ext = [0.5 * sx, 0.5 * sy, 0.5 * sz];
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], p.position[i] - ext[i]);
      max[i] = Math.max(max[i], p.position[i] + ext[i]);
      if (p.mirror && i === 0) {
        min[0] = Math.min(min[0], -p.position[0] - ext[0]);
        max[0] = Math.max(max[0], -p.position[0] + ext[0]);
      }
    }
  }
  const sizeCm: [number, number, number] = vis.length ? [(max[0] - min[0]) * UNIT_CM, (max[1] - min[1]) * UNIT_CM, (max[2] - min[2]) * UNIT_CM] : [0, 0, 0];
  const areaCm2 = area * UNIT_CM * UNIT_CM;
  return {
    parts: doc.parts.length,
    visibleParts: vis.length,
    byKind: [...byKindMap.entries()].map(([kind, count]) => ({ kind, label: PRIMITIVES.find((p) => p.kind === kind)!.label, count })).sort((a, b) => b.count - a.count),
    sizeCm,
    areaCm2,
    stitches: Math.round(areaCm2 * 3),
    yarnGrams: Math.max(1, Math.round(areaCm2 * 0.05)),
    palette: [...palette.entries()].map(([hex, count]) => ({ hex, name: colourNameOf(hex), count })).sort((a, b) => b.count - a.count),
  };
}

/* ------------------------------------------------------------------ */
/* Description                                                          */
/* ------------------------------------------------------------------ */

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function describeShortDoc(doc: MakerDoc): string {
  if (!doc.parts.length) return "empty design";
  const spec = estimateDoc(doc);
  const top = spec.byKind[0];
  return doc.name || `${plural(spec.visibleParts, "part")} · mostly ${top.label.toLowerCase()}s`;
}

export function describeDoc(doc: MakerDoc): string {
  if (!doc.parts.length) return "an empty design — add a shape to begin";
  const spec = estimateDoc(doc);
  const kinds = spec.byKind.map((k) => plural(k.count, k.label.toLowerCase())).join(", ");
  const colours = spec.palette
    .slice(0, 4)
    .map((c) => c.name)
    .join(", ");
  const sculpted = doc.parts.filter((p) => p.sculpt).length;
  const finishes = [...new Set(doc.parts.filter((p) => p.visible).map((p) => p.finish))];
  const bits = [
    `${doc.name ? `“${doc.name}” — ` : ""}a free-form piece of ${plural(spec.visibleParts, "part")} (${kinds})`,
    `about ${Math.round(spec.sizeCm[0])} × ${Math.round(spec.sizeCm[1])} × ${Math.round(spec.sizeCm[2])} cm`,
    `in ${colours}`,
    finishes.length === 1 ? `${finishes[0]} yarn` : `${finishes.length} yarn finishes (${finishes.join(", ")})`,
  ];
  if (sculpted) bits.push(`${plural(sculpted, "part")} hand-sculpted`);
  bits.push(`roughly ${spec.yarnGrams} g of yarn`);
  return bits.join(", ");
}

export function buildMakerMessage(doc: MakerDoc, link?: string): string {
  const lines = ["Hi Whimlet! I made something in the Maker and I'd love a quote:", "", describeDoc(doc)];
  if (doc.note) lines.push("", `Note: ${doc.note}`);
  if (link) lines.push("", `Open it here: ${link}`);
  lines.push("", "(I can also send the .whimlet-maker.json file and a snapshot.)");
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* Starter templates                                                    */
/* ------------------------------------------------------------------ */

const part = (kind: PrimitiveKind, id: string, p: Partial<MakerPart>): MakerPart => makePart(kind, { id, ...p });

export type MakerTemplate = { id: string; label: string; hint: string; doc: MakerDoc };

export const MAKER_TEMPLATES: MakerTemplate[] = [
  {
    id: "blank",
    label: "Blank",
    hint: "An empty table",
    doc: { name: "", note: "", parts: [] },
  },
  {
    id: "bear",
    label: "Little Bear",
    hint: "The classic amigurumi build",
    doc: {
      name: "Little Bear",
      note: "",
      parts: [
        part("ball", "bear1", { name: "Body", position: [0, 0.55, 0], scale: [1.1, 1.0, 1.0], color: "#C9975B" }),
        part("ball", "bear2", { name: "Head", position: [0, 1.45, 0.05], scale: [1.0, 0.92, 0.95], color: "#C9975B" }),
        part("ball", "bear3", { name: "Muzzle", position: [0, 1.3, 0.48], scale: [0.42, 0.32, 0.3], color: "#F6E9D8" }),
        part("ball", "bear4", { name: "Nose", position: [0, 1.36, 0.63], scale: [0.14, 0.1, 0.1], color: "#3F3A3D", finish: "pearl" }),
        part("ball", "bear5", { name: "Eye", position: [0.18, 1.52, 0.42], scale: [0.09, 0.09, 0.09], color: "#3F3A3D", finish: "pearl", mirror: true }),
        part("ball", "bear6", { name: "Ear", position: [0.36, 1.88, 0], scale: [0.32, 0.32, 0.22], color: "#C9975B", mirror: true }),
        part("tube", "bear7", { name: "Arm", position: [0.58, 0.72, 0.1], rotation: [0, 0, -0.9], scale: [0.5, 0.55, 0.5], color: "#C9975B", mirror: true }),
        part("tube", "bear8", { name: "Leg", position: [0.28, 0.12, 0.25], rotation: [1.35, 0, 0], scale: [0.55, 0.5, 0.55], color: "#C9975B", mirror: true }),
        part("heart", "bear9", { name: "Heart patch", position: [0, 0.68, 0.5], scale: [0.28, 0.28, 0.18], color: "#D96A6A" }),
      ],
    },
  },
  {
    id: "bunny",
    label: "Bunny",
    hint: "Long ears, round tail",
    doc: {
      name: "Bunny",
      note: "",
      parts: [
        part("egg", "bun1", { name: "Body", position: [0, 0.6, 0], scale: [1.0, 1.1, 1.0], color: "#FFF7F0" }),
        part("ball", "bun2", { name: "Head", position: [0, 1.5, 0.1], scale: [0.9, 0.85, 0.85], color: "#FFF7F0" }),
        part("petal", "bun3", { name: "Ear", position: [0.22, 1.95, 0], rotation: [0.15, 0, -0.18], scale: [0.7, 1.05, 0.7], color: "#FFF7F0", mirror: true }),
        part("petal", "bun4", { name: "Inner ear", position: [0.22, 1.98, 0.04], rotation: [0.15, 0, -0.18], scale: [0.4, 0.8, 0.5], color: "#F2B9C9", mirror: true }),
        part("ball", "bun5", { name: "Eye", position: [0.16, 1.56, 0.36], scale: [0.08, 0.08, 0.08], color: "#3F3A3D", finish: "pearl", mirror: true }),
        part("ball", "bun6", { name: "Nose", position: [0, 1.44, 0.44], scale: [0.09, 0.07, 0.07], color: "#F2B9C9" }),
        part("ball", "bun7", { name: "Tail", position: [0, 0.55, -0.5], scale: [0.3, 0.3, 0.3], color: "#FFF7F0", finish: "fuzzy" }),
        part("tube", "bun8", { name: "Foot", position: [0.25, 0.12, 0.3], rotation: [1.5, 0, 0], scale: [0.45, 0.45, 0.4], color: "#FFF7F0", mirror: true }),
        part("tube", "bun9", { name: "Arm", position: [0.5, 0.8, 0.15], rotation: [0.4, 0, -1.0], scale: [0.4, 0.45, 0.4], color: "#FFF7F0", mirror: true }),
      ],
    },
  },
  {
    id: "cactus",
    label: "Cactus Pot",
    hint: "A tiny desk friend",
    doc: {
      name: "Cactus Pot",
      note: "",
      parts: [
        part("cone", "cac1", { name: "Pot", position: [0, 0.32, 0], rotation: [Math.PI, 0, 0], scale: [1.15, 0.7, 1.15], color: "#F7C9B0" }),
        part("disc", "cac2", { name: "Soil", position: [0, 0.62, 0], scale: [0.95, 0.4, 0.95], color: "#8A6A5C" }),
        part("egg", "cac3", { name: "Cactus", position: [0, 1.25, 0], scale: [0.75, 1.2, 0.75], color: "#7C977A" }),
        part("tube", "cac4", { name: "Arm", position: [0.42, 1.25, 0], rotation: [0, 0, -0.9], scale: [0.35, 0.5, 0.35], color: "#7C977A", mirror: true }),
        part("ball", "cac5", { name: "Flower", position: [0, 1.95, 0], scale: [0.28, 0.22, 0.28], color: "#F2B9C9", finish: "velvet" }),
        part("ball", "cac6", { name: "Flower centre", position: [0, 2.06, 0], scale: [0.1, 0.08, 0.1], color: "#F7E2A4" }),
      ],
    },
  },
  {
    id: "strawberry",
    label: "Strawberry",
    hint: "Keychain-sized",
    doc: {
      name: "Strawberry",
      note: "",
      parts: [
        part("egg", "str1", { name: "Berry", position: [0, 0.6, 0], rotation: [Math.PI, 0, 0], scale: [0.95, 1.15, 0.95], color: "#D96A6A" }),
        part("leaf", "str2", { name: "Leaf", position: [0.12, 1.15, 0.06], rotation: [0.9, 0, -0.7], scale: [0.5, 0.45, 0.5], color: "#7C977A", mirror: true }),
        part("leaf", "str3", { name: "Back leaf", position: [0, 1.15, -0.14], rotation: [-0.9, 0, 0], scale: [0.5, 0.45, 0.5], color: "#7C977A" }),
        part("tube", "str4", { name: "Stem", position: [0, 1.32, 0], scale: [0.16, 0.25, 0.16], color: "#A9BFA3" }),
        part("ball", "str5", { name: "Seed", position: [0.22, 0.75, 0.42], scale: [0.06, 0.08, 0.05], color: "#F7E2A4", mirror: true }),
        part("ball", "str6", { name: "Seed 2", position: [0.08, 0.45, 0.47], scale: [0.06, 0.08, 0.05], color: "#F7E2A4", mirror: true }),
        part("ball", "str7", { name: "Seed 3", position: [0.32, 0.4, 0.3], scale: [0.06, 0.08, 0.05], color: "#F7E2A4", mirror: true }),
        part("ring", "str8", { name: "Keyring", position: [0, 1.62, 0], rotation: [0, 0, 0], scale: [0.4, 0.4, 0.4], color: "#F6E9D8", finish: "pearl" }),
      ],
    },
  },
  {
    id: "donut",
    label: "Donut",
    hint: "Ring + icing + sprinkles",
    doc: {
      name: "Donut",
      note: "",
      parts: [
        part("ring", "don1", { name: "Dough", position: [0, 0.3, 0], rotation: [Math.PI / 2, 0, 0], scale: [1.4, 1.4, 1.4], color: "#F0D5A8" }),
        part("ring", "don2", { name: "Icing", position: [0, 0.42, 0], rotation: [Math.PI / 2, 0, 0], scale: [1.42, 1.42, 1.0], color: "#F2B9C9", finish: "satin" }),
        part("tube", "don3", { name: "Sprinkle", position: [0.4, 0.62, 0.25], rotation: [0, 0.6, 1.5], scale: [0.09, 0.14, 0.09], color: "#BFDCF7", mirror: true }),
        part("tube", "don4", { name: "Sprinkle 2", position: [0.15, 0.62, -0.45], rotation: [0, 1.4, 1.5], scale: [0.09, 0.14, 0.09], color: "#F7E2A4", mirror: true }),
        part("tube", "don5", { name: "Sprinkle 3", position: [0.5, 0.6, -0.1], rotation: [0, 0.2, 1.5], scale: [0.09, 0.14, 0.09], color: "#CDEBDF", mirror: true }),
      ],
    },
  },
];

/* ------------------------------------------------------------------ */
/* Geometry helpers that do not need three                               */
/* ------------------------------------------------------------------ */

/** Decode a part's sculpt offsets for a mesh with `count` vertices (null = untouched or mismatch). */
export function sculptOffsetsFor(part: MakerPart, count: number): Float32Array | null {
  return part.sculpt ? decodeOffsets(part.sculpt, count) : null;
}
