"use client";

import {
  BASE_SWATCHES,
  BOUQUET_COUNTS,
  BUTTERFLY_COUNTS,
  BUTTERFLY_SWATCHES,
  CENTER_SWATCHES,
  LEAF_COUNTS,
  LEAF_SWATCHES,
  MIX_PALETTES,
  NOTE_MAX,
  OCCASIONS,
  PETAL_COUNTS,
  PETAL_LAYERS,
  PETAL_SWATCHES,
  RIBBON_SWATCHES,
  STEM_SWATCHES,
  TAG_TEXT_MAX,
  WRAP_SWATCHES,
  type DesignConfig,
  type MixPaletteId,
} from "@/lib/design";
import type { FocusId } from "../three/DesignScene";
import { ControlGroup, Field, Segmented, Swatches, TextInput, ToggleSwitch } from "./controls";

/**
 * The full option set, grouped the way a maker thinks about a piece:
 * the piece → the bloom → stem & leaves → the bouquet → extras → for you.
 * Each group knows which camera framing suits it (`focus`).
 */

export type PanelId = "piece" | "bloom" | "stem" | "bouquet" | "extras" | "you";

export const PANELS: { id: PanelId; label: string; focus: FocusId; bouquetOnly?: boolean }[] = [
  { id: "piece", label: "The piece", focus: "all" },
  { id: "bloom", label: "The bloom", focus: "bloom" },
  { id: "stem", label: "Stem & leaves", focus: "stem" },
  { id: "bouquet", label: "The bouquet", focus: "wrap", bouquetOnly: true },
  { id: "extras", label: "Little extras", focus: "extras" },
  { id: "you", label: "For you", focus: "all" },
];

type PanelProps = {
  c: DesignConfig;
  update: <K extends keyof DesignConfig>(key: K, value: DesignConfig[K]) => void;
  set: (next: DesignConfig | ((c: DesignConfig) => DesignConfig)) => void;
  onDraw: () => void;
};

export function PiecePanel({ c, update, set }: PanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <ControlGroup label="What are we making?">
        <Segmented
          ariaLabel="Piece type"
          options={[
            { value: "flower", label: "A Flower" },
            { value: "bouquet", label: "A Bouquet" },
          ]}
          value={c.type}
          onChange={(type) => set((x) => ({ ...x, type, stem: type === "bouquet" && x.stem === "none" ? "short" : x.stem }))}
        />
      </ControlGroup>
      <ControlGroup label="Size" hint="finished height, roughly">
        <Segmented
          ariaLabel="Size"
          options={[
            { value: "mini", label: "Mini" },
            { value: "regular", label: "Regular" },
            { value: "grand", label: "Grand" },
          ]}
          value={c.size}
          onChange={(v) => update("size", v)}
        />
      </ControlGroup>
      <ControlGroup label="Yarn" hint="how it feels in the hand">
        <Segmented
          ariaLabel="Yarn type"
          options={[
            { value: "cotton", label: "Cotton", title: "crisp stitches, matte" },
            { value: "velvet", label: "Velvet", title: "deep, soft sheen" },
            { value: "fuzzy", label: "Fuzzy", title: "a halo of soft fibres" },
          ]}
          value={c.yarn}
          onChange={(v) => update("yarn", v)}
        />
        <ToggleSwitch label="Carry a glitter thread" checked={c.sparkle} onChange={(v) => update("sparkle", v)} />
      </ControlGroup>
    </div>
  );
}

export function BloomPanel({ c, update, onDraw }: PanelProps) {
  const mixing = c.type === "bouquet" && c.mixColors;
  return (
    <div className="flex flex-col gap-5">
      <ControlGroup label="Petals">
        <Segmented
          ariaLabel="Petal shape"
          options={[
            { value: "rounded", label: "Rounded" },
            { value: "pointed", label: "Pointed" },
            { value: "custom", label: c.petalShape === "custom" ? "✏️ Mine" : "✏️ Draw" },
          ]}
          value={c.petalShape}
          onChange={(v) => (v === "custom" ? onDraw() : update("petalShape", v))}
        />
        {c.petalShape === "custom" && c.customPetal && (
          <p className="text-xs font-semibold text-rose-ink">
            ✏️ blooming from your hand-drawn petal —{" "}
            <button type="button" className="underline decoration-blush-deep decoration-2 underline-offset-2" onClick={onDraw}>
              refine the sketch
            </button>
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Petals per ring">
            <Segmented ariaLabel="Petal count" options={PETAL_COUNTS.map((n) => ({ value: n, label: String(n) }))} value={c.petalCount} onChange={(v) => update("petalCount", v)} />
          </Field>
          <Field label="Rings">
            <Segmented ariaLabel="Petal rings" options={PETAL_LAYERS.map((n) => ({ value: n, label: n === 1 ? "1 ring" : `${n} rings` }))} value={c.petalLayers} onChange={(v) => update("petalLayers", v)} />
          </Field>
          <Field label="Petal size">
            <Segmented
              ariaLabel="Petal size"
              options={[
                { value: "petite", label: "Petite" },
                { value: "regular", label: "Regular" },
                { value: "full", label: "Full" },
              ]}
              value={c.petalSize}
              onChange={(v) => update("petalSize", v)}
            />
          </Field>
          <Field label="How open">
            <Segmented
              ariaLabel="Openness"
              options={[
                { value: "bud", label: "Bud" },
                { value: "half", label: "Half" },
                { value: "open", label: "Open" },
              ]}
              value={c.openness}
              onChange={(v) => update("openness", v)}
            />
          </Field>
        </div>
      </ControlGroup>

      <ControlGroup label="Petal colour">
        <Swatches ariaLabel="Petal colour" options={PETAL_SWATCHES} value={c.petalColor} onChange={(v) => update("petalColor", v)} disabled={mixing} disabledNote="mixing a palette — turn it off in The bouquet to pick one colour" />
        <Field label="Pattern">
          <Segmented
            ariaLabel="Petal pattern"
            options={[
              { value: "solid", label: "Solid" },
              { value: "ombre", label: "Ombré tips" },
              { value: "dipped", label: "Dipped base" },
              { value: "striped", label: "Stripes" },
            ]}
            value={c.petalPattern}
            onChange={(v) => update("petalPattern", v)}
          />
        </Field>
        {c.petalPattern !== "solid" && <Swatches ariaLabel="Accent colour" options={PETAL_SWATCHES} value={c.accentColor} onChange={(v) => update("accentColor", v)} compact />}
      </ControlGroup>

      <ControlGroup label="Centre">
        <Segmented
          ariaLabel="Centre style"
          options={[
            { value: "dome", label: "Dome" },
            { value: "knots", label: "French knots" },
            { value: "button", label: "Button" },
            { value: "pompom", label: "Pompom" },
          ]}
          value={c.centerStyle}
          onChange={(v) => update("centerStyle", v)}
        />
        <Swatches ariaLabel="Centre colour" options={CENTER_SWATCHES} value={c.centerColor} onChange={(v) => update("centerColor", v)} compact />
      </ControlGroup>
    </div>
  );
}

export function StemPanel({ c, update }: PanelProps) {
  const single = c.type === "flower";
  return (
    <div className="flex flex-col gap-5">
      <ControlGroup label="Stem">
        <Segmented
          ariaLabel="Stem length"
          options={single ? [{ value: "none", label: "None" }, { value: "short", label: "Short" }, { value: "tall", label: "Tall" }] : [{ value: "short", label: "Short" }, { value: "tall", label: "Tall" }]}
          value={c.stem}
          onChange={(v) => update("stem", v)}
        />
        {c.stem !== "none" && (
          <>
            <Field label="Shape">
              <Segmented
                ariaLabel="Stem curve"
                options={[
                  { value: "straight", label: "Straight" },
                  { value: "curvy", label: "Curvy" },
                ]}
                value={c.stemCurve}
                onChange={(v) => update("stemCurve", v)}
              />
            </Field>
            <Swatches ariaLabel="Stem colour" options={STEM_SWATCHES} value={c.stemColor} onChange={(v) => update("stemColor", v)} compact />
          </>
        )}
      </ControlGroup>
      <ControlGroup label="Leaves" hint={c.type === "bouquet" ? "per flower" : undefined}>
        <Segmented ariaLabel="Leaf count" options={LEAF_COUNTS.map((n) => ({ value: n, label: n === 0 ? "No leaves" : n === 1 ? "1 leaf" : `${n} leaves` }))} value={c.leaves} onChange={(v) => update("leaves", v)} />
        {c.leaves > 0 && (
          <>
            <Field label="Shape">
              <Segmented
                ariaLabel="Leaf shape"
                options={[
                  { value: "slim", label: "Slim" },
                  { value: "broad", label: "Broad" },
                  { value: "heart", label: "Heart" },
                ]}
                value={c.leafShape}
                onChange={(v) => update("leafShape", v)}
              />
            </Field>
            <Swatches ariaLabel="Leaf colour" options={LEAF_SWATCHES} value={c.leafColor} onChange={(v) => update("leafColor", v)} compact />
          </>
        )}
      </ControlGroup>
      {single && c.stem !== "none" && (
        <ControlGroup label="Stand it in…">
          <Segmented
            ariaLabel="Base"
            options={[
              { value: "none", label: "Nothing" },
              { value: "jar", label: "Glass jar" },
              { value: "vase", label: "Bud vase" },
              { value: "pot", label: "Little pot" },
            ]}
            value={c.base}
            onChange={(v) => update("base", v)}
          />
          {(c.base === "vase" || c.base === "pot") && <Swatches ariaLabel="Base colour" options={BASE_SWATCHES} value={c.baseColor} onChange={(v) => update("baseColor", v)} compact />}
        </ControlGroup>
      )}
    </div>
  );
}

export function BouquetPanel({ c, update }: PanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <ControlGroup label="The bunch">
        <Segmented ariaLabel="Number of flowers" options={BOUQUET_COUNTS.map((n) => ({ value: n, label: `${n} flowers` }))} value={c.bouquetCount} onChange={(v) => update("bouquetCount", v)} />
        <Field label="Arrangement">
          <Segmented
            ariaLabel="Arrangement"
            options={[
              { value: "dome", label: "Dome" },
              { value: "loose", label: "Loose & wild" },
              { value: "tight", label: "Tight posy" },
            ]}
            value={c.arrangement}
            onChange={(v) => update("arrangement", v)}
          />
        </Field>
      </ControlGroup>
      <ControlGroup label="Colour mix">
        <ToggleSwitch label="Mix a palette across the flowers" checked={c.mixColors} onChange={(v) => update("mixColors", v)} />
        {c.mixColors && (
          <div role="group" aria-label="Mix palette" className="flex flex-wrap gap-2">
            {(Object.keys(MIX_PALETTES) as MixPaletteId[]).map((id) => {
              const p = MIX_PALETTES[id];
              const active = c.mixPalette === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update("mixPalette", id)}
                  className={`flex items-center gap-2 rounded-full border-2 py-1 pl-1.5 pr-3 text-xs font-bold transition-all ${active ? "border-cocoa bg-white text-cocoa shadow-soft" : "border-white/80 bg-white/60 text-cocoa-soft hover:border-rose/50"}`}
                >
                  <span className="flex -space-x-1.5">
                    {p.colors.slice(0, 5).map((hex) => (
                      <span key={hex} className="h-5 w-5 rounded-full border border-white" style={{ backgroundColor: hex }} />
                    ))}
                  </span>
                  {p.label}
                </button>
              );
            })}
          </div>
        )}
      </ControlGroup>
      <ControlGroup label="Fillers & light">
        <Segmented
          ariaLabel="Fillers"
          options={[
            { value: "none", label: "None" },
            { value: "gypsophila", label: "Gypsophila" },
            { value: "eucalyptus", label: "Eucalyptus" },
            { value: "both", label: "Both" },
          ]}
          value={c.fillers}
          onChange={(v) => update("fillers", v)}
        />
        <ToggleSwitch label="Thread fairy lights through" checked={c.fairyLights} onChange={(v) => update("fairyLights", v)} />
      </ControlGroup>
      <ControlGroup label="Wrap">
        <ToggleSwitch label="Wrap it in paper" checked={c.wrap} onChange={(v) => update("wrap", v)} />
        {c.wrap && (
          <>
            <Segmented
              ariaLabel="Wrap style"
              options={[
                { value: "cone", label: "Cone" },
                { value: "fold", label: "Folded collar" },
                { value: "sheer", label: "Sheer tulle" },
              ]}
              value={c.wrapStyle}
              onChange={(v) => update("wrapStyle", v)}
            />
            <Field label="Paper">
              <Swatches ariaLabel="Wrap colour" options={WRAP_SWATCHES} value={c.wrapColor} onChange={(v) => update("wrapColor", v)} compact />
            </Field>
            {c.wrapStyle !== "sheer" && (
              <Field label="Lining">
                <Swatches ariaLabel="Wrap lining colour" options={WRAP_SWATCHES} value={c.wrapInnerColor} onChange={(v) => update("wrapInnerColor", v)} compact />
              </Field>
            )}
            <Field label="Ribbon">
              <Segmented
                ariaLabel="Ribbon style"
                options={[
                  { value: "bow", label: "Bow" },
                  { value: "band", label: "Plain band" },
                  { value: "double", label: "Double bow" },
                ]}
                value={c.ribbonStyle}
                onChange={(v) => update("ribbonStyle", v)}
              />
              <Swatches ariaLabel="Ribbon colour" options={RIBBON_SWATCHES} value={c.ribbonColor} onChange={(v) => update("ribbonColor", v)} compact />
            </Field>
          </>
        )}
      </ControlGroup>
    </div>
  );
}

export function ExtrasPanel({ c, update }: PanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <ControlGroup label="Butterflies" hint="perched on the petals">
        <Segmented ariaLabel="Butterflies" options={BUTTERFLY_COUNTS.map((n) => ({ value: n, label: n === 0 ? "None" : String(n) }))} value={c.butterflies} onChange={(v) => update("butterflies", v)} />
        {c.butterflies > 0 && <Swatches ariaLabel="Butterfly colour" options={BUTTERFLY_SWATCHES} value={c.butterflyColor} onChange={(v) => update("butterflyColor", v)} compact />}
      </ControlGroup>
      <ControlGroup label="A little charm">
        <Segmented
          ariaLabel="Charm"
          options={[
            { value: "none", label: "None" },
            { value: "ladybird", label: "Ladybird" },
            { value: "bee", label: "Bee" },
            { value: "pearls", label: "Pearl pins" },
          ]}
          value={c.charm}
          onChange={(v) => update("charm", v)}
        />
      </ControlGroup>
      <ControlGroup label="Gift tag" hint={c.type === "flower" && !c.wrap ? "ties to the stem" : undefined}>
        <Segmented
          ariaLabel="Tag"
          options={[
            { value: "none", label: "No tag" },
            { value: "heart", label: "Heart tag" },
            { value: "round", label: "Round tag" },
          ]}
          value={c.tag}
          onChange={(v) => update("tag", v)}
        />
        {c.tag !== "none" && <TextInput label="Tag reads" value={c.tagText} max={TAG_TEXT_MAX} placeholder="for you ♥" onChange={(v) => update("tagText", v)} />}
      </ControlGroup>
    </div>
  );
}

export function YouPanel({ c, update }: PanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <ControlGroup label="What's the occasion?">
        <Segmented ariaLabel="Occasion" options={OCCASIONS.map((o) => ({ value: o.id, label: o.label }))} value={c.occasion} onChange={(v) => update("occasion", v)} />
      </ControlGroup>
      <ControlGroup label="A note for the maker" hint="optional">
        <TextInput label="Note" value={c.note} max={NOTE_MAX} multiline placeholder="e.g. it's for my grandmother — she loves peonies" onChange={(v) => update("note", v)} />
      </ControlGroup>
    </div>
  );
}

export function Panel({ id, ...props }: PanelProps & { id: PanelId }) {
  switch (id) {
    case "piece":
      return <PiecePanel {...props} />;
    case "bloom":
      return <BloomPanel {...props} />;
    case "stem":
      return <StemPanel {...props} />;
    case "bouquet":
      return <BouquetPanel {...props} />;
    case "extras":
      return <ExtrasPanel {...props} />;
    default:
      return <YouPanel {...props} />;
  }
}

/** How many choices a design exposes right now (for the "N options" badge). */
export function countOptions(c: DesignConfig): number {
  let n = 3 + 1; // type, size, yarn, sparkle
  n += 6 + 2; // shape, count, rings, size, openness, colour, pattern, centre style + colour
  if (c.petalPattern !== "solid") n += 1;
  n += 1 + (c.stem !== "none" ? 2 : 0) + 1 + (c.leaves > 0 ? 2 : 0);
  if (c.type === "flower" && c.stem !== "none") n += 1 + (c.base === "vase" || c.base === "pot" ? 1 : 0);
  if (c.type === "bouquet") {
    n += 2 + 1 + (c.mixColors ? 1 : 0) + 2 + 1;
    if (c.wrap) n += 1 + 1 + (c.wrapStyle !== "sheer" ? 1 : 0) + 2;
  }
  n += 1 + (c.butterflies ? 1 : 0) + 1 + 1 + (c.tag !== "none" ? 1 : 0);
  n += 2; // occasion, note
  return n;
}
