/**
 * Whimlet 3D Design Studio — domain logic.
 *
 * Pure, framework-free: config types, option lists, presets, sanitizing,
 * URL serialization, randomization and a plain-language description used
 * both for the live summary and the WhatsApp enquiry message.
 */

import {
  isValidPetalData,
  quantizePetal,
  randomPetalOutline,
  tulipPetalOutline,
  wildPetalOutline,
} from "./sketch";

export type DesignType = "flower" | "bouquet";
export type PetalShape = "rounded" | "pointed" | "custom";
export type StemLength = "none" | "short" | "tall";

export type DesignConfig = {
  type: DesignType;
  petalShape: PetalShape;
  petalCount: number; // 4..8
  petalColor: string; // hex
  centerColor: string; // hex
  mixColors: boolean; // bouquet: cycle a pastel palette instead of one colour
  stem: StemLength;
  leaves: number; // 0..2
  bouquetCount: number; // 3 | 5 | 7
  wrap: boolean;
  ribbonColor: string; // hex
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
  { name: "cream", hex: "#F6E9D8" },
  { name: "golden yellow", hex: "#F2CD8D" },
  { name: "rose red", hex: "#D96A6A" },
  { name: "lavender", hex: "#CBB6EA" },
  { name: "sage green", hex: "#A9BFA3" },
  { name: "white", hex: "#FFF7F0" },
];

export const CENTER_SWATCHES: Swatch[] = [
  { name: "butter yellow", hex: "#F0D5A8" },
  { name: "cream", hex: "#F6E9D8" },
  { name: "blush pink", hex: "#F2B9C9" },
  { name: "cocoa brown", hex: "#8A6A5C" },
];

export const RIBBON_SWATCHES: Swatch[] = [
  { name: "rose pink", hex: "#D8849C" },
  { name: "sage green", hex: "#7C977A" },
  { name: "lavender", hex: "#CBB6EA" },
];

/** Colours cycled through when "mix pastel colours" is on. */
export const MIX_PALETTE = [
  "#F2B9C9",
  "#F6E9D8",
  "#CBB6EA",
  "#A9BFA3",
  "#FFF7F0",
  "#D8849C",
] as const;

export const DEFAULT_DESIGN: DesignConfig = {
  type: "flower",
  petalShape: "rounded",
  petalCount: 6,
  petalColor: "#F2B9C9",
  centerColor: "#F0D5A8",
  mixColors: false,
  stem: "tall",
  leaves: 2,
  bouquetCount: 5,
  wrap: true,
  ribbonColor: "#D8849C",
  customPetal: null,
};

export type DesignPreset = { id: string; label: string; config: DesignConfig };

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: "blush-rose",
    label: "Blush Rose",
    config: { ...DEFAULT_DESIGN },
  },
  {
    id: "sunny-day",
    label: "Sunny Day",
    config: {
      ...DEFAULT_DESIGN,
      petalShape: "pointed",
      petalCount: 8,
      petalColor: "#F2CD8D",
      centerColor: "#8A6A5C",
      stem: "tall",
      leaves: 2,
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
      centerColor: "#F6E9D8",
      mixColors: false,
      stem: "short",
      leaves: 1,
      bouquetCount: 5,
      wrap: true,
      ribbonColor: "#CBB6EA",
    },
  },
  {
    id: "sage-garden",
    label: "Sage Garden",
    config: {
      ...DEFAULT_DESIGN,
      type: "bouquet",
      petalShape: "rounded",
      petalCount: 6,
      petalColor: "#A9BFA3",
      centerColor: "#F0D5A8",
      mixColors: true,
      stem: "short",
      leaves: 2,
      bouquetCount: 7,
      wrap: true,
      ribbonColor: "#7C977A",
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
      petalColor: "#F6E9D8",
      centerColor: "#F0D5A8",
      stem: "tall",
      leaves: 1,
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
      stem: "short",
      leaves: 2,
      bouquetCount: 7,
      wrap: true,
      ribbonColor: "#7C977A",
    },
  },
];

/* ------------------------------------------------------------------ */
/* Sanitizing — never trust a URL param                                */
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

/** Clamps/normalizes any unknown object into a valid DesignConfig. */
export function sanitizeDesign(raw: unknown): DesignConfig {
  const d = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const type = safeEnum<DesignType>(d.type, ["flower", "bouquet"], DEFAULT_DESIGN.type);
  const stemRaw = safeEnum<StemLength>(d.stem, ["none", "short", "tall"], DEFAULT_DESIGN.stem);
  // a bouquet needs visible stems — "none" only makes sense for a single bloom
  const stem: StemLength = type === "bouquet" && stemRaw === "none" ? "short" : stemRaw;
  const customValid = isValidPetalData(d.customPetal);
  const petalShapeRaw = safeEnum<PetalShape>(
    d.petalShape,
    ["rounded", "pointed", "custom"],
    DEFAULT_DESIGN.petalShape
  );
  // "custom" without a usable outline would render nothing — fall back
  const petalShape: PetalShape = petalShapeRaw === "custom" && !customValid ? "rounded" : petalShapeRaw;
  return {
    type,
    petalShape,
    petalCount: safeNumber(d.petalCount, [4, 5, 6, 7, 8], DEFAULT_DESIGN.petalCount),
    petalColor: safeHex(d.petalColor, DEFAULT_DESIGN.petalColor),
    centerColor: safeHex(d.centerColor, DEFAULT_DESIGN.centerColor),
    mixColors: safeBool(d.mixColors, DEFAULT_DESIGN.mixColors),
    stem,
    leaves: safeNumber(d.leaves, [0, 1, 2], DEFAULT_DESIGN.leaves) as 0 | 1 | 2,
    bouquetCount: safeNumber(d.bouquetCount, [3, 5, 7], DEFAULT_DESIGN.bouquetCount),
    wrap: safeBool(d.wrap, DEFAULT_DESIGN.wrap),
    ribbonColor: safeHex(d.ribbonColor, DEFAULT_DESIGN.ribbonColor),
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

export function encodeDesign(config: DesignConfig): string {
  const json = JSON.stringify(config);
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
/* Randomizer + description                                            */
/* ------------------------------------------------------------------ */

export function randomDesign(): DesignConfig {
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
  // every so often, "Surprise me" cuts a fresh hand-drawn-style petal
  const custom = Math.random() < 0.15;
  return sanitizeDesign({
    type: pick(["flower", "bouquet"] as const),
    petalShape: custom ? "custom" : pick(["rounded", "pointed"] as const),
    customPetal: custom ? quantizePetal(randomPetalOutline()) : null,
    petalCount: pick([4, 5, 6, 7, 8]),
    petalColor: pick(PETAL_SWATCHES).hex,
    centerColor: pick(CENTER_SWATCHES).hex,
    mixColors: Math.random() < 0.5,
    stem: pick(["none", "short", "tall"] as const),
    leaves: pick([0, 1, 2] as const),
    bouquetCount: pick([3, 5, 7] as const),
    wrap: Math.random() < 0.75,
    ribbonColor: pick(RIBBON_SWATCHES).hex,
  });
}

function colourName(hex: string): string {
  const all = [...PETAL_SWATCHES, ...CENTER_SWATCHES, ...RIBBON_SWATCHES];
  const hit = all.find((s) => s.hex.toUpperCase() === hex.toUpperCase());
  return hit ? hit.name : `a custom colour (${hex})`;
}

/** Plain-language description of the design — shown live and sent to WhatsApp. */
export function describeDesign(c: DesignConfig): string {
  const leafWord = c.leaves === 1 ? "leaf" : "leaves";
  const petalColour =
    c.type === "bouquet" && c.mixColors ? "a mix of pastel colours" : colourName(c.petalColor);
  const petals =
    c.petalShape === "custom" && c.customPetal
      ? `${c.petalCount} hand-drawn petals`
      : `${c.petalCount} ${c.petalShape} petals`;
  const centre = colourName(c.centerColor);

  if (c.type === "bouquet") {
    const bits = [
      `a bouquet of ${c.bouquetCount} flowers`,
      `${petals} each in ${petalColour}`,
      `${centre} centres`,
      `${c.stem} stems with ${c.leaves} ${leafWord} each`,
    ];
    bits.push(
      c.wrap
        ? `wrapped in cream paper with a ${colourName(c.ribbonColor)} ribbon`
        : "unwrapped, stems showing"
    );
    return bits.join(", ");
  }

  const bits = [
    `a single flower with ${petals} in ${petalColour}`,
    `a ${centre} centre`,
  ];
  if (c.stem === "none") {
    bits.push(`${c.leaves} ${leafWord} tucked underneath, no stem`);
  } else {
    bits.push(`a ${c.stem} stem with ${c.leaves} ${leafWord}`);
  }
  return bits.join(", ");
}

export function buildDesignMessage(c: DesignConfig): string {
  const lines = [
    "Hi Whimlet! I designed my own piece in your 3D studio.",
    "",
    `It's ${describeDesign(c)}.`,
  ];
  if (c.petalShape === "custom" && c.customPetal) {
    lines.push("", "The petal shape is my own sketch — I drew it in your sketch pad!");
  }
  lines.push("", "Could you please make this for me?");
  return lines.join("\n");
}
