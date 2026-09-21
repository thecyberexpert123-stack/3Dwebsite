/**
 * Whimlet 3D Design Studio — domain logic.
 *
 * Pure, framework-free: config types, option lists, presets, sanitizing,
 * URL serialization, the portable `.whimlet.json` design file, spec
 * estimates for the admin viewer, randomization and a plain-language
 * description used both for the live summary and the WhatsApp enquiry.
 *
 * Format version 2 (v0.12): every v1 field is kept with the same meaning;
 * the new fields all have defaults, so a v1 link/file still opens.
 */

import {
  isValidPetalData,
  quantizePetal,
  randomPetalOutline,
  tulipPetalOutline,
  wildPetalOutline,
} from "./sketch";

export const DESIGN_FORMAT = "whimlet-design" as const;
export const DESIGN_VERSION = 2 as const;

export type DesignType = "flower" | "bouquet";
export type PetalShape = "rounded" | "pointed" | "custom";
export type StemLength = "none" | "short" | "tall";
export type PetalPattern = "solid" | "ombre" | "dipped" | "striped";
export type CenterStyle = "dome" | "knots" | "button" | "pompom";
export type Openness = "bud" | "half" | "open";
export type PetalSize = "petite" | "regular" | "full";
export type LeafShape = "slim" | "broad" | "heart";
export type StemCurve = "straight" | "curvy";
export type Arrangement = "dome" | "loose" | "tight";
export type Filler = "none" | "gypsophila" | "eucalyptus" | "both";
export type WrapStyle = "cone" | "fold" | "sheer";
export type RibbonStyle = "bow" | "band" | "double";
export type TagStyle = "none" | "heart" | "round";
export type Charm = "none" | "ladybird" | "bee" | "pearls";
export type YarnType = "cotton" | "velvet" | "fuzzy";
export type SizeOption = "mini" | "regular" | "grand";
export type BaseStyle = "none" | "jar" | "vase" | "pot";
export type MixPaletteId = "pastel" | "sunset" | "berry" | "ocean" | "garden";
export type Occasion = "just-because" | "birthday" | "anniversary" | "graduation" | "wedding" | "thank-you";

export type DesignConfig = {
  /* ---- the piece ---- */
  type: DesignType;
  size: SizeOption;
  yarn: YarnType;
  sparkle: boolean; // a glitter thread carried along with the yarn
  /* ---- the bloom ---- */
  petalShape: PetalShape;
  petalCount: number; // 4..8
  petalLayers: number; // 1..3 rings
  petalSize: PetalSize;
  openness: Openness;
  petalColor: string; // hex
  petalPattern: PetalPattern;
  accentColor: string; // hex — second colour for ombré / dipped / stripes
  centerColor: string; // hex
  centerStyle: CenterStyle;
  /* ---- stem & leaves ---- */
  stem: StemLength;
  stemCurve: StemCurve;
  stemColor: string;
  leaves: number; // 0..2 (per flower)
  leafShape: LeafShape;
  leafColor: string;
  /* ---- bouquet ---- */
  bouquetCount: number; // 3 | 5 | 7 | 9
  arrangement: Arrangement;
  mixColors: boolean; // cycle a palette instead of one colour
  mixPalette: MixPaletteId;
  fillers: Filler;
  fairyLights: boolean;
  wrap: boolean;
  wrapStyle: WrapStyle;
  wrapColor: string;
  wrapInnerColor: string;
  ribbonStyle: RibbonStyle;
  ribbonColor: string;
  /* ---- little extras ---- */
  butterflies: number; // 0..2 perched crochet butterflies
  butterflyColor: string;
  charm: Charm;
  tag: TagStyle;
  tagText: string; // ≤ 18 chars
  base: BaseStyle; // single stemmed flower only
  baseColor: string;
  /* ---- for the maker ---- */
  occasion: Occasion;
  note: string; // ≤ 120 chars
  /**
   * Hand-drawn petal outline from the sketch pad — flat int array
   * (0..255 per coordinate, see lib/sketch.ts). Used when petalShape
   * is "custom"; kept around otherwise so users can switch back to it.
   */
  customPetal?: number[] | null;
};

export type Swatch = { name: string; hex: string };

export const PETAL_SWATCHES: Swatch[] = [
  { name: "blush pink", hex: "#F2B9C9" },
  { name: "peach", hex: "#F7C9B0" },
  { name: "cream", hex: "#F6E9D8" },
  { name: "golden yellow", hex: "#F2CD8D" },
  { name: "coral", hex: "#EC8F86" },
  { name: "rose red", hex: "#D96A6A" },
  { name: "berry", hex: "#B85C8A" },
  { name: "lavender", hex: "#CBB6EA" },
  { name: "sky blue", hex: "#BFDCF7" },
  { name: "mint", hex: "#CDEBDF" },
  { name: "sage green", hex: "#A9BFA3" },
  { name: "white", hex: "#FFF7F0" },
];

export const CENTER_SWATCHES: Swatch[] = [
  { name: "butter yellow", hex: "#F0D5A8" },
  { name: "cream", hex: "#F6E9D8" },
  { name: "blush pink", hex: "#F2B9C9" },
  { name: "cocoa brown", hex: "#8A6A5C" },
  { name: "pearl white", hex: "#FFFBF5" },
  { name: "black", hex: "#3A2E33" },
];

export const RIBBON_SWATCHES: Swatch[] = [
  { name: "rose pink", hex: "#D8849C" },
  { name: "sage green", hex: "#7C977A" },
  { name: "lavender", hex: "#CBB6EA" },
  { name: "ivory", hex: "#FFF6EA" },
  { name: "sky blue", hex: "#A9CDEB" },
  { name: "chocolate", hex: "#6E4B3F" },
];

export const WRAP_SWATCHES: Swatch[] = [
  { name: "cream paper", hex: "#F6EBDA" },
  { name: "kraft", hex: "#C9A27A" },
  { name: "blush", hex: "#F7D3DC" },
  { name: "lavender", hex: "#DCCFF0" },
  { name: "sage", hex: "#C7D9C2" },
  { name: "white", hex: "#FFFCF8" },
  { name: "cocoa", hex: "#6E4B3F" },
];

export const STEM_SWATCHES: Swatch[] = [
  { name: "sage green", hex: "#7C977A" },
  { name: "deep green", hex: "#4F7A5A" },
  { name: "olive", hex: "#8E9A5B" },
  { name: "cocoa brown", hex: "#8A6A5C" },
];

export const LEAF_SWATCHES: Swatch[] = [
  { name: "sage green", hex: "#A9BFA3" },
  { name: "deep green", hex: "#5E8A68" },
  { name: "mint", hex: "#CDEBDF" },
  { name: "olive", hex: "#A6AE6D" },
];

export const BUTTERFLY_SWATCHES: Swatch[] = [
  { name: "lavender", hex: "#CBB6EA" },
  { name: "sky blue", hex: "#BFDCF7" },
  { name: "blush pink", hex: "#F2B9C9" },
  { name: "butter yellow", hex: "#F7E2A4" },
];

export const BASE_SWATCHES: Swatch[] = [
  { name: "blush", hex: "#F2C4CE" },
  { name: "cream", hex: "#F6E9D8" },
  { name: "terracotta", hex: "#C9836A" },
  { name: "sage", hex: "#B7D8C4" },
  { name: "lavender", hex: "#DCCCF5" },
];

/** Colours cycled through when "mix colours" is on, per palette. */
export const MIX_PALETTES: Record<MixPaletteId, { label: string; colors: readonly string[] }> = {
  pastel: { label: "Pastel", colors: ["#F2B9C9", "#F6E9D8", "#CBB6EA", "#A9BFA3", "#FFF7F0", "#D8849C"] },
  sunset: { label: "Sunset", colors: ["#F2CD8D", "#F7C9B0", "#EC8F86", "#F6E9D8", "#F2B9C9", "#D96A6A"] },
  berry: { label: "Berry", colors: ["#D96A6A", "#B85C8A", "#CBB6EA", "#F2B9C9", "#8A4E6A", "#F6E9D8"] },
  ocean: { label: "Ocean", colors: ["#BFDCF7", "#CDEBDF", "#CBB6EA", "#FFF7F0", "#9CC9D9", "#F2B9C9"] },
  garden: { label: "Garden", colors: ["#A9BFA3", "#F6E9D8", "#F2CD8D", "#FFF7F0", "#D8849C", "#CDEBDF"] },
};

/** Backwards-compatible alias (v1 callers). */
export const MIX_PALETTE = MIX_PALETTES.pastel.colors;

export const OCCASIONS: { id: Occasion; label: string }[] = [
  { id: "just-because", label: "Just because" },
  { id: "birthday", label: "Birthday" },
  { id: "anniversary", label: "Anniversary" },
  { id: "graduation", label: "Graduation" },
  { id: "wedding", label: "Wedding" },
  { id: "thank-you", label: "Thank you" },
];

export const TAG_TEXT_MAX = 18;
export const NOTE_MAX = 120;

export const DEFAULT_DESIGN: DesignConfig = {
  type: "flower",
  size: "regular",
  yarn: "cotton",
  sparkle: false,
  petalShape: "rounded",
  petalCount: 6,
  petalLayers: 2,
  petalSize: "regular",
  openness: "open",
  petalColor: "#F2B9C9",
  petalPattern: "solid",
  accentColor: "#FFF7F0",
  centerColor: "#F0D5A8",
  centerStyle: "dome",
  stem: "tall",
  stemCurve: "straight",
  stemColor: "#7C977A",
  leaves: 2,
  leafShape: "slim",
  leafColor: "#A9BFA3",
  bouquetCount: 5,
  arrangement: "dome",
  mixColors: false,
  mixPalette: "pastel",
  fillers: "none",
  fairyLights: false,
  wrap: true,
  wrapStyle: "cone",
  wrapColor: "#F6EBDA",
  wrapInnerColor: "#F7D3DC",
  ribbonStyle: "bow",
  ribbonColor: "#D8849C",
  butterflies: 0,
  butterflyColor: "#CBB6EA",
  charm: "none",
  tag: "none",
  tagText: "",
  base: "none",
  baseColor: "#F2C4CE",
  occasion: "just-because",
  note: "",
  customPetal: null,
};

export type DesignPreset = { id: string; label: string; config: DesignConfig };

export const DESIGN_PRESETS: DesignPreset[] = [
  { id: "blush-rose", label: "Blush Rose", config: { ...DEFAULT_DESIGN } },
  {
    id: "sunny-day",
    label: "Sunny Day",
    config: {
      ...DEFAULT_DESIGN,
      petalShape: "pointed",
      petalCount: 8,
      petalLayers: 2,
      petalColor: "#F2CD8D",
      centerColor: "#8A6A5C",
      centerStyle: "knots",
      stem: "tall",
      leaves: 2,
      charm: "bee",
    },
  },
  {
    id: "lavender-cloud",
    label: "Lavender Cloud",
    config: {
      ...DEFAULT_DESIGN,
      type: "bouquet",
      petalShape: "rounded",
      petalCount: 5,
      petalColor: "#CBB6EA",
      petalPattern: "ombre",
      accentColor: "#FFF7F0",
      centerColor: "#F6E9D8",
      stem: "short",
      leaves: 1,
      bouquetCount: 5,
      fillers: "gypsophila",
      wrap: true,
      wrapColor: "#FFFCF8",
      wrapInnerColor: "#DCCFF0",
      ribbonColor: "#CBB6EA",
      butterflies: 1,
    },
  },
  {
    id: "sage-garden",
    label: "Sage Garden",
    config: {
      ...DEFAULT_DESIGN,
      type: "bouquet",
      petalCount: 6,
      petalColor: "#A9BFA3",
      centerColor: "#F0D5A8",
      mixColors: true,
      mixPalette: "garden",
      stem: "short",
      leaves: 2,
      leafShape: "broad",
      bouquetCount: 7,
      fillers: "eucalyptus",
      wrap: true,
      wrapStyle: "fold",
      wrapColor: "#C9A27A",
      wrapInnerColor: "#F6EBDA",
      ribbonColor: "#7C977A",
      ribbonStyle: "band",
      tag: "round",
      tagText: "for you",
    },
  },
  {
    id: "tulip-sketch",
    label: "Tulip Sketch",
    config: {
      ...DEFAULT_DESIGN,
      petalShape: "custom",
      customPetal: quantizePetal(tulipPetalOutline()),
      petalCount: 6,
      petalLayers: 1,
      openness: "half",
      petalColor: "#F6E9D8",
      petalPattern: "dipped",
      accentColor: "#F2B9C9",
      centerColor: "#F0D5A8",
      stem: "tall",
      stemCurve: "curvy",
      leaves: 1,
      base: "jar",
    },
  },
  {
    id: "wildflower-mix",
    label: "Wildflower Mix",
    config: {
      ...DEFAULT_DESIGN,
      type: "bouquet",
      petalShape: "custom",
      customPetal: quantizePetal(wildPetalOutline()),
      petalCount: 5,
      petalColor: "#D96A6A",
      centerColor: "#F0D5A8",
      mixColors: true,
      mixPalette: "sunset",
      arrangement: "loose",
      stem: "short",
      leaves: 2,
      bouquetCount: 7,
      fillers: "both",
      wrap: true,
      wrapColor: "#F6EBDA",
      ribbonColor: "#7C977A",
    },
  },
  {
    id: "starlit-night",
    label: "Starlit Night",
    config: {
      ...DEFAULT_DESIGN,
      type: "bouquet",
      yarn: "velvet",
      sparkle: true,
      petalCount: 6,
      petalLayers: 3,
      petalColor: "#B85C8A",
      petalPattern: "ombre",
      accentColor: "#CBB6EA",
      centerColor: "#FFFBF5",
      centerStyle: "button",
      stem: "tall",
      bouquetCount: 9,
      arrangement: "dome",
      fairyLights: true,
      wrap: true,
      wrapStyle: "sheer",
      wrapColor: "#FFFCF8",
      wrapInnerColor: "#DCCFF0",
      ribbonStyle: "double",
      ribbonColor: "#FFF6EA",
      occasion: "anniversary",
    },
  },
  {
    id: "strawberry-picnic",
    label: "Strawberry Picnic",
    config: {
      ...DEFAULT_DESIGN,
      petalCount: 5,
      petalLayers: 2,
      petalSize: "full",
      petalColor: "#EC8F86",
      petalPattern: "striped",
      accentColor: "#FFF7F0",
      centerColor: "#3A2E33",
      centerStyle: "pompom",
      yarn: "fuzzy",
      stem: "short",
      stemCurve: "curvy",
      leaves: 2,
      leafShape: "heart",
      charm: "ladybird",
      base: "pot",
      baseColor: "#C9836A",
      occasion: "birthday",
    },
  },
];

/* ------------------------------------------------------------------ */
/* Sanitizing — never trust a URL param or a file                      */
/* ------------------------------------------------------------------ */

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function safeHex(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX_RE.test(value) ? value.toUpperCase() : fallback;
}

function safeEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function safeNumber(value: unknown, allowed: readonly number[], fallback: number): number {
  return typeof value === "number" && allowed.includes(value)
    ? value
    : Number.isInteger(Number(value)) && allowed.includes(Number(value))
      ? Number(value)
      : fallback;
}

function safeBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Free text from a customer: printable characters only, trimmed, capped. */
function safeText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  // strip control characters (incl. newlines) — the text ends up in a canvas
  // texture and a WhatsApp message, never in HTML — and cap the length
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code === 9 || code === 10 || code === 13) out += " "; // tabs/newlines → a space
    else if (code < 32 || code === 127) continue;
    else out += ch;
  }
  return out.replace(/\s+/g, " ").trim().slice(0, max);
}

const TYPES: readonly DesignType[] = ["flower", "bouquet"];
const SIZES: readonly SizeOption[] = ["mini", "regular", "grand"];
const YARNS: readonly YarnType[] = ["cotton", "velvet", "fuzzy"];
const SHAPES: readonly PetalShape[] = ["rounded", "pointed", "custom"];
const PETAL_SIZES: readonly PetalSize[] = ["petite", "regular", "full"];
const OPENNESS: readonly Openness[] = ["bud", "half", "open"];
const PATTERNS: readonly PetalPattern[] = ["solid", "ombre", "dipped", "striped"];
const CENTERS: readonly CenterStyle[] = ["dome", "knots", "button", "pompom"];
const STEMS: readonly StemLength[] = ["none", "short", "tall"];
const CURVES: readonly StemCurve[] = ["straight", "curvy"];
const LEAF_SHAPES: readonly LeafShape[] = ["slim", "broad", "heart"];
const ARRANGEMENTS: readonly Arrangement[] = ["dome", "loose", "tight"];
const FILLERS: readonly Filler[] = ["none", "gypsophila", "eucalyptus", "both"];
const WRAPS: readonly WrapStyle[] = ["cone", "fold", "sheer"];
const RIBBONS: readonly RibbonStyle[] = ["bow", "band", "double"];
const TAGS: readonly TagStyle[] = ["none", "heart", "round"];
const CHARMS: readonly Charm[] = ["none", "ladybird", "bee", "pearls"];
const BASES: readonly BaseStyle[] = ["none", "jar", "vase", "pot"];
const PALETTE_IDS = Object.keys(MIX_PALETTES) as MixPaletteId[];
const OCCASION_IDS = OCCASIONS.map((o) => o.id);

export const PETAL_COUNTS = [4, 5, 6, 7, 8] as const;
export const PETAL_LAYERS = [1, 2, 3] as const;
export const LEAF_COUNTS = [0, 1, 2] as const;
export const BOUQUET_COUNTS = [3, 5, 7, 9] as const;
export const BUTTERFLY_COUNTS = [0, 1, 2] as const;

/** Clamps/normalizes any unknown object into a valid DesignConfig. */
export function sanitizeDesign(raw: unknown): DesignConfig {
  const d = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const D = DEFAULT_DESIGN;
  const type = safeEnum(d.type, TYPES, D.type);
  const stemRaw = safeEnum(d.stem, STEMS, D.stem);
  // a bouquet needs visible stems — "none" only makes sense for a single bloom
  const stem: StemLength = type === "bouquet" && stemRaw === "none" ? "short" : stemRaw;
  const customValid = isValidPetalData(d.customPetal);
  const petalShapeRaw = safeEnum(d.petalShape, SHAPES, D.petalShape);
  // "custom" without a usable outline would render nothing — fall back
  const petalShape: PetalShape = petalShapeRaw === "custom" && !customValid ? "rounded" : petalShapeRaw;
  const baseRaw = safeEnum(d.base, BASES, D.base);
  // a vase needs a stem to stand in; bouquets bring their own wrap
  const base: BaseStyle = type === "bouquet" || stem === "none" ? "none" : baseRaw;
  const tag = safeEnum(d.tag, TAGS, D.tag);
  return {
    type,
    size: safeEnum(d.size, SIZES, D.size),
    yarn: safeEnum(d.yarn, YARNS, D.yarn),
    sparkle: safeBool(d.sparkle, D.sparkle),
    petalShape,
    petalCount: safeNumber(d.petalCount, PETAL_COUNTS, D.petalCount),
    petalLayers: safeNumber(d.petalLayers, PETAL_LAYERS, D.petalLayers),
    petalSize: safeEnum(d.petalSize, PETAL_SIZES, D.petalSize),
    openness: safeEnum(d.openness, OPENNESS, D.openness),
    petalColor: safeHex(d.petalColor, D.petalColor),
    petalPattern: safeEnum(d.petalPattern, PATTERNS, D.petalPattern),
    accentColor: safeHex(d.accentColor, D.accentColor),
    centerColor: safeHex(d.centerColor, D.centerColor),
    centerStyle: safeEnum(d.centerStyle, CENTERS, D.centerStyle),
    stem,
    stemCurve: safeEnum(d.stemCurve, CURVES, D.stemCurve),
    stemColor: safeHex(d.stemColor, D.stemColor),
    leaves: safeNumber(d.leaves, LEAF_COUNTS, D.leaves),
    leafShape: safeEnum(d.leafShape, LEAF_SHAPES, D.leafShape),
    leafColor: safeHex(d.leafColor, D.leafColor),
    bouquetCount: safeNumber(d.bouquetCount, BOUQUET_COUNTS, D.bouquetCount),
    arrangement: safeEnum(d.arrangement, ARRANGEMENTS, D.arrangement),
    mixColors: safeBool(d.mixColors, D.mixColors),
    mixPalette: safeEnum(d.mixPalette, PALETTE_IDS, D.mixPalette),
    fillers: safeEnum(d.fillers, FILLERS, D.fillers),
    fairyLights: safeBool(d.fairyLights, D.fairyLights),
    wrap: safeBool(d.wrap, D.wrap),
    wrapStyle: safeEnum(d.wrapStyle, WRAPS, D.wrapStyle),
    wrapColor: safeHex(d.wrapColor, D.wrapColor),
    wrapInnerColor: safeHex(d.wrapInnerColor, D.wrapInnerColor),
    ribbonStyle: safeEnum(d.ribbonStyle, RIBBONS, D.ribbonStyle),
    ribbonColor: safeHex(d.ribbonColor, D.ribbonColor),
    butterflies: safeNumber(d.butterflies, BUTTERFLY_COUNTS, D.butterflies),
    butterflyColor: safeHex(d.butterflyColor, D.butterflyColor),
    charm: safeEnum(d.charm, CHARMS, D.charm),
    tag,
    tagText: tag === "none" ? "" : safeText(d.tagText, TAG_TEXT_MAX),
    base,
    baseColor: safeHex(d.baseColor, D.baseColor),
    occasion: safeEnum(d.occasion, OCCASION_IDS, D.occasion),
    note: safeText(d.note, NOTE_MAX),
    customPetal: customValid ? (d.customPetal as number[]) : null,
  };
}

/* ------------------------------------------------------------------ */
/* URL serialization (shareable design links, ?design=…)               */
/* ------------------------------------------------------------------ */

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const arr = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i);
  return arr;
}

/** Only the fields that differ from the defaults travel in the URL, so a
 *  link stays short and a future default change doesn't break old links. */
export function encodeDesign(config: DesignConfig): string {
  const diff: Record<string, unknown> = {};
  for (const k of Object.keys(config) as (keyof DesignConfig)[]) {
    const v = config[k];
    const dv = DEFAULT_DESIGN[k];
    if (JSON.stringify(v) !== JSON.stringify(dv)) diff[k] = v;
  }
  const json = JSON.stringify(diff);
  return bytesToB64(new TextEncoder().encode(json))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeDesign(code: string): DesignConfig | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const json = new TextDecoder().decode(b64ToBytes(b64));
    return sanitizeDesign(JSON.parse(json));
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* The portable design file (.whimlet.json)                            */
/* ------------------------------------------------------------------ */

export type DesignFile = {
  format: typeof DESIGN_FORMAT;
  version: number;
  app: string;
  name: string;
  createdAt: string; // ISO
  summary: string;
  config: DesignConfig;
};

export function designFileName(config: DesignConfig, name?: string): string {
  const base = (name && name.trim()) || describeShort(config);
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${slug || "design"}.whimlet.json`;
}

export function toDesignFile(config: DesignConfig, name?: string, now: Date = new Date()): DesignFile {
  const clean = sanitizeDesign(config);
  return {
    format: DESIGN_FORMAT,
    version: DESIGN_VERSION,
    app: "Whimlet 3D Design Studio",
    name: (name && name.trim().slice(0, 60)) || describeShort(clean),
    createdAt: now.toISOString(),
    summary: describeDesign(clean),
    config: clean,
  };
}

export type ParsedDesignFile = { ok: true; file: DesignFile; warnings: string[] } | { ok: false; error: string };

/**
 * Opens anything a customer might hand the maker: a `.whimlet.json` file,
 * a bare config object, a full studio link, or just the `?design=` code.
 */
/** A real design file is ~1–3 KB (sketch included); anything bigger is not one. */
export const DESIGN_FILE_MAX_BYTES = 64 * 1024;

export function parseDesignFile(text: string): ParsedDesignFile {
  if (text.length > DESIGN_FILE_MAX_BYTES) return { ok: false, error: "That file is too large to be a Whimlet design." };
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "The file is empty." };
  const warnings: string[] = [];

  // a share link or a bare code
  if (!trimmed.startsWith("{")) {
    let code = trimmed;
    try {
      const url = new URL(trimmed);
      code = url.searchParams.get("design") ?? "";
    } catch {
      /* not a URL — treat as the code itself */
    }
    const cfg = code ? decodeDesign(code) : null;
    if (!cfg) return { ok: false, error: "That isn't a Whimlet design file, link or code." };
    return { ok: true, file: toDesignFile(cfg, "shared link"), warnings: ["Opened from a share link — no name or date."] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "The file isn't valid JSON." };
  }
  const obj = (typeof parsed === "object" && parsed !== null ? parsed : {}) as Record<string, unknown>;

  let rawConfig: unknown;
  let name = "";
  let createdAt = "";
  if (obj.format === DESIGN_FORMAT) {
    if (typeof obj.version === "number" && obj.version > DESIGN_VERSION) {
      warnings.push(`Made with a newer studio (format v${obj.version}); unknown options were ignored.`);
    }
    rawConfig = obj.config;
    name = typeof obj.name === "string" ? obj.name.slice(0, 60) : "";
    createdAt = typeof obj.createdAt === "string" && !Number.isNaN(Date.parse(obj.createdAt)) ? obj.createdAt : "";
  } else if ("petalColor" in obj || "type" in obj) {
    rawConfig = obj; // a bare config (v1 export / hand-written)
    warnings.push("Opened a bare design config — no name or date.");
  } else {
    return { ok: false, error: "That JSON isn't a Whimlet design." };
  }

  const config = sanitizeDesign(rawConfig);
  const file: DesignFile = {
    ...toDesignFile(config, name || undefined),
    createdAt: createdAt || new Date(0).toISOString(),
  };
  if (!createdAt) warnings.push("No creation date in the file.");
  return { ok: true, file, warnings };
}

/* ------------------------------------------------------------------ */
/* Spec sheet — what the maker needs to know                           */
/* ------------------------------------------------------------------ */

export type PaletteEntry = { role: string; name: string; hex: string };

export type DesignSpec = {
  flowers: number;
  petalsPerFlower: number;
  petalsTotal: number;
  leavesTotal: number;
  /** approximate finished size, cm (regular cotton yarn, 3 mm hook) */
  heightCm: number;
  widthCm: number;
  /** rough yarn need, grams, by colour role */
  yarnGrams: { role: string; hex: string; grams: number }[];
  palette: PaletteEntry[];
  parts: string[];
};

/** Colours actually used by a design, with the part they belong to. */
export function paletteOf(c: DesignConfig): PaletteEntry[] {
  const out: PaletteEntry[] = [];
  const add = (role: string, hex: string) => out.push({ role, name: colourName(hex), hex: hex.toUpperCase() });
  if (c.type === "bouquet" && c.mixColors) {
    MIX_PALETTES[c.mixPalette].colors.slice(0, c.bouquetCount).forEach((hex, i) => add(`petals · flower ${i + 1}`, hex));
  } else {
    add("petals", c.petalColor);
  }
  if (c.petalPattern !== "solid") add(`petal ${c.petalPattern === "striped" ? "stripes" : c.petalPattern === "dipped" ? "dip" : "tips"}`, c.accentColor);
  add("centre", c.centerColor);
  if (c.stem !== "none") add("stems", c.stemColor);
  if (c.leaves > 0) add("leaves", c.leafColor);
  if (c.type === "bouquet" && c.wrap) {
    add("wrap (outer)", c.wrapColor);
    if (c.wrapStyle !== "sheer") add("wrap (inner)", c.wrapInnerColor);
    add("ribbon", c.ribbonColor);
  }
  if (c.butterflies > 0) add("butterflies", c.butterflyColor);
  if (c.base !== "none" && c.base !== "jar") add(c.base, c.baseColor);
  // de-duplicate identical role+hex pairs
  const seen = new Set<string>();
  return out.filter((p) => {
    const k = p.role + p.hex;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const SIZE_SCALE: Record<SizeOption, number> = { mini: 0.7, regular: 1, grand: 1.35 };

export function estimateSpec(c: DesignConfig): DesignSpec {
  const flowers = c.type === "bouquet" ? c.bouquetCount : 1;
  const ringCounts = Array.from({ length: c.petalLayers }, (_, i) => Math.max(3, c.petalCount - i));
  const petalsPerFlower = ringCounts.reduce((a, b) => a + b, 0);
  const petalsTotal = petalsPerFlower * flowers;
  const leavesTotal = c.leaves * flowers;
  const s = SIZE_SCALE[c.size];
  const headCm = (c.petalSize === "petite" ? 6 : c.petalSize === "full" ? 9 : 7.5) * s;
  let heightCm: number;
  let widthCm: number;
  if (c.type === "bouquet") {
    heightCm = (c.stem === "tall" ? 34 : 28) * s;
    widthCm = (c.arrangement === "tight" ? 16 : c.arrangement === "loose" ? 24 : 20) * s + (c.bouquetCount - 5) * 1.2 * s;
  } else {
    heightCm = (c.stem === "tall" ? 32 : c.stem === "short" ? 20 : headCm * 0.6) * s;
    widthCm = headCm;
    if (c.base !== "none") heightCm += 4 * s;
  }
  const petalG = (c.petalSize === "petite" ? 0.9 : c.petalSize === "full" ? 1.6 : 1.2) * s * s;
  const yarnGrams: DesignSpec["yarnGrams"] = [];
  const bump = (role: string, hex: string, g: number) => {
    const hit = yarnGrams.find((y) => y.hex === hex.toUpperCase());
    if (hit) hit.grams += g;
    else yarnGrams.push({ role, hex: hex.toUpperCase(), grams: g });
  };
  if (c.type === "bouquet" && c.mixColors) {
    const cols = MIX_PALETTES[c.mixPalette].colors;
    for (let i = 0; i < flowers; i++) bump("petals", cols[i % cols.length], petalsPerFlower * petalG);
  } else bump("petals", c.petalColor, petalsTotal * petalG);
  if (c.petalPattern !== "solid") bump("accent", c.accentColor, petalsTotal * petalG * 0.3);
  bump("centres", c.centerColor, flowers * (c.centerStyle === "pompom" ? 2.5 : 1.2) * s);
  if (c.stem !== "none") bump("stems", c.stemColor, flowers * (c.stem === "tall" ? 5 : 3) * s);
  if (leavesTotal) bump("leaves", c.leafColor, leavesTotal * (c.leafShape === "broad" ? 1.6 : 1.1) * s);
  yarnGrams.forEach((y) => (y.grams = Math.round(y.grams * 10) / 10));

  const parts: string[] = [];
  parts.push(`${flowers} × ${c.petalShape === "custom" ? "hand-drawn" : c.petalShape} ${c.yarn} flower${flowers > 1 ? "s" : ""} (${c.petalLayers} ring${c.petalLayers > 1 ? "s" : ""}, ${c.openness})`);
  parts.push(`centre: ${c.centerStyle}`);
  if (c.stem !== "none") parts.push(`${c.stem} ${c.stemCurve} stem${flowers > 1 ? "s" : ""}`);
  if (leavesTotal) parts.push(`${leavesTotal} ${c.leafShape} ${leavesTotal === 1 ? "leaf" : "leaves"}`);
  if (c.type === "bouquet") {
    if (c.fillers !== "none") parts.push(`fillers: ${c.fillers === "both" ? "gypsophila + eucalyptus" : c.fillers}`);
    if (c.fairyLights) parts.push("fairy-light string");
    if (c.wrap) parts.push(`${c.wrapStyle} wrap, ${c.ribbonStyle} ribbon`);
  }
  if (c.butterflies) parts.push(`${c.butterflies} perched butterfl${c.butterflies === 1 ? "y" : "ies"}`);
  if (c.charm !== "none") parts.push(`charm: ${c.charm}`);
  if (c.tag !== "none") parts.push(`${c.tag} tag${c.tagText ? ` “${c.tagText}”` : ""}`);
  if (c.base !== "none") parts.push(`in a ${c.base}`);
  if (c.sparkle) parts.push("glitter thread");

  return {
    flowers,
    petalsPerFlower,
    petalsTotal,
    leavesTotal,
    heightCm: Math.round(heightCm),
    widthCm: Math.round(widthCm),
    yarnGrams,
    palette: paletteOf(c),
    parts,
  };
}

/* ------------------------------------------------------------------ */
/* Randomizer + description                                            */
/* ------------------------------------------------------------------ */

export function randomDesign(): DesignConfig {
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p: number) => Math.random() < p;
  // every so often, "Surprise me" cuts a fresh hand-drawn-style petal
  const custom = chance(0.15);
  const type = pick(TYPES);
  return sanitizeDesign({
    type,
    size: pick(SIZES),
    yarn: pick(YARNS),
    sparkle: chance(0.2),
    petalShape: custom ? "custom" : pick(["rounded", "pointed"] as const),
    customPetal: custom ? quantizePetal(randomPetalOutline()) : null,
    petalCount: pick(PETAL_COUNTS),
    petalLayers: pick(PETAL_LAYERS),
    petalSize: pick(PETAL_SIZES),
    openness: pick(OPENNESS),
    petalColor: pick(PETAL_SWATCHES).hex,
    petalPattern: chance(0.5) ? "solid" : pick(PATTERNS),
    accentColor: pick(PETAL_SWATCHES).hex,
    centerColor: pick(CENTER_SWATCHES).hex,
    centerStyle: pick(CENTERS),
    stem: pick(STEMS),
    stemCurve: pick(CURVES),
    stemColor: pick(STEM_SWATCHES).hex,
    leaves: pick(LEAF_COUNTS),
    leafShape: pick(LEAF_SHAPES),
    leafColor: pick(LEAF_SWATCHES).hex,
    bouquetCount: pick(BOUQUET_COUNTS),
    arrangement: pick(ARRANGEMENTS),
    mixColors: chance(0.5),
    mixPalette: pick(PALETTE_IDS),
    fillers: pick(FILLERS),
    fairyLights: chance(0.25),
    wrap: chance(0.75),
    wrapStyle: pick(WRAPS),
    wrapColor: pick(WRAP_SWATCHES).hex,
    wrapInnerColor: pick(WRAP_SWATCHES).hex,
    ribbonStyle: pick(RIBBONS),
    ribbonColor: pick(RIBBON_SWATCHES).hex,
    butterflies: chance(0.6) ? 0 : pick(BUTTERFLY_COUNTS),
    butterflyColor: pick(BUTTERFLY_SWATCHES).hex,
    charm: chance(0.6) ? "none" : pick(CHARMS),
    tag: chance(0.7) ? "none" : pick(TAGS),
    tagText: pick(["for you", "love you", "hi mum", "congrats!", "xoxo", ""]),
    base: chance(0.6) ? "none" : pick(BASES),
    baseColor: pick(BASE_SWATCHES).hex,
    occasion: pick(OCCASION_IDS),
    note: "",
  });
}

const ALL_SWATCHES = [
  ...PETAL_SWATCHES,
  ...CENTER_SWATCHES,
  ...RIBBON_SWATCHES,
  ...WRAP_SWATCHES,
  ...STEM_SWATCHES,
  ...LEAF_SWATCHES,
  ...BUTTERFLY_SWATCHES,
  ...BASE_SWATCHES,
];

export function colourName(hex: string): string {
  const hit = ALL_SWATCHES.find((s) => s.hex.toUpperCase() === hex.toUpperCase());
  return hit ? hit.name : `a custom colour (${hex.toUpperCase()})`;
}

/** Two or three words — file names, tab titles. */
export function describeShort(c: DesignConfig): string {
  const colour = c.type === "bouquet" && c.mixColors ? MIX_PALETTES[c.mixPalette].label.toLowerCase() : colourName(c.petalColor).replace(/^a custom colour.*$/, "custom");
  return c.type === "bouquet" ? `${colour} bouquet of ${c.bouquetCount}` : `${colour} ${c.petalShape === "custom" ? "sketched" : c.petalShape} flower`;
}

/** Plain-language description of the design — shown live and sent to WhatsApp. */
export function describeDesign(c: DesignConfig): string {
  const leafWord = c.leaves === 1 ? "leaf" : "leaves";
  const petalColour =
    c.type === "bouquet" && c.mixColors
      ? `a mix of ${MIX_PALETTES[c.mixPalette].label.toLowerCase()} colours`
      : colourName(c.petalColor);
  const pattern =
    c.petalPattern === "ombre"
      ? ` fading to ${colourName(c.accentColor)} at the tips`
      : c.petalPattern === "dipped"
        ? ` dipped in ${colourName(c.accentColor)} at the base`
        : c.petalPattern === "striped"
          ? ` striped with ${colourName(c.accentColor)}`
          : "";
  const rings = c.petalLayers === 1 ? "a single ring of" : c.petalLayers === 3 ? "three ruffled rings of" : "";
  const petals =
    c.petalShape === "custom" && c.customPetal
      ? `${rings || String(c.petalCount)} hand-drawn petals`
      : `${rings || String(c.petalCount)} ${c.petalSize === "regular" ? "" : c.petalSize + " "}${c.petalShape} petals`;
  const open = c.openness === "bud" ? " (still a bud)" : c.openness === "half" ? " (half open)" : "";
  const centre = `${c.centerStyle === "dome" ? "" : c.centerStyle + " "}${colourName(c.centerColor)} centre`;
  const yarn = c.yarn === "cotton" ? "" : `${c.yarn} `;
  const extras: string[] = [];
  if (c.sparkle) extras.push("a glitter thread throughout");
  if (c.butterflies) extras.push(`${c.butterflies} ${colourName(c.butterflyColor)} butterfl${c.butterflies === 1 ? "y" : "ies"} perched on top`);
  if (c.charm !== "none") extras.push(c.charm === "pearls" ? "pearl pins on the petals" : `a little ${c.charm}`);
  if (c.tag !== "none") extras.push(`a ${c.tag} tag${c.tagText ? ` reading “${c.tagText}”` : ""}`);

  let out: string;
  if (c.type === "bouquet") {
    const bits = [
      `a ${c.size === "regular" ? "" : c.size + " "}${yarn}bouquet of ${c.bouquetCount} flowers (${c.arrangement})`,
      `${petals}${pattern}${open} in ${petalColour}`,
      `${centre}s`,
      `${c.stem} ${c.stemCurve === "curvy" ? "curving " : ""}${colourName(c.stemColor)} stems with ${c.leaves} ${c.leafShape} ${leafWord} each`,
    ];
    if (c.fillers !== "none") bits.push(c.fillers === "both" ? "gypsophila and eucalyptus fillers" : `${c.fillers} fillers`);
    if (c.fairyLights) bits.push("a string of fairy lights");
    bits.push(
      c.wrap
        ? `wrapped in ${colourName(c.wrapColor)} ${c.wrapStyle === "sheer" ? "sheer" : c.wrapStyle === "fold" ? "folded" : ""} paper${c.wrapStyle !== "sheer" ? ` lined ${colourName(c.wrapInnerColor)}` : ""} with a ${colourName(c.ribbonColor)} ${c.ribbonStyle === "band" ? "band" : c.ribbonStyle === "double" ? "double bow" : "bow"}`
        : "unwrapped, stems showing"
    );
    out = bits.concat(extras).join(", ");
  } else {
    const bits = [
      `a ${c.size === "regular" ? "" : c.size + " "}single ${yarn}flower with ${petals}${pattern}${open} in ${petalColour}`,
      `a ${centre}`,
    ];
    if (c.stem === "none") {
      bits.push(`${c.leaves} ${c.leafShape} ${leafWord} tucked underneath, no stem`);
    } else {
      bits.push(`a ${c.stem} ${c.stemCurve === "curvy" ? "curving " : ""}${colourName(c.stemColor)} stem with ${c.leaves} ${c.leafShape} ${leafWord}`);
      if (c.base !== "none") bits.push(c.base === "jar" ? "standing in a little glass jar" : `in a ${colourName(c.baseColor)} ${c.base}`);
    }
    out = bits.concat(extras).join(", ");
  }
  return out.replace(/\s+/g, " ");
}

export function buildDesignMessage(c: DesignConfig, link?: string): string {
  const lines = [
    "Hi Whimlet! I designed my own piece in your 3D studio.",
    "",
    `It's ${describeDesign(c)}.`,
  ];
  if (c.petalShape === "custom" && c.customPetal) {
    lines.push("", "The petal shape is my own sketch — I drew it in your sketch pad!");
  }
  const occ = OCCASIONS.find((o) => o.id === c.occasion);
  if (occ && c.occasion !== "just-because") lines.push("", `It's for: ${occ.label}.`);
  if (c.note) lines.push("", `A note from me: ${c.note}`);
  if (link) lines.push("", `Open my exact design here: ${link}`);
  lines.push("", "Could you please make this for me?");
  return lines.join("\n");
}
