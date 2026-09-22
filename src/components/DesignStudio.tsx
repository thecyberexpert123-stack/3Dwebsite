"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  BOUQUET_COUNTS,
  CENTER_SWATCHES,
  DESIGN_PRESETS,
  PETAL_COUNTS,
  PETAL_LAYERS,
  PETAL_SWATCHES,
  RIBBON_SWATCHES,
  buildDesignMessage,
  describeDesign,
  encodeDesign,
} from "@/lib/design";
import { waLink } from "@/lib/whatsapp";
import { useInViewport, useWebGL } from "@/lib/hooks";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { SparkleDoodle, WhatsAppGlyph } from "./Decorations";
import { PetalSketch } from "./PetalSketch";
import { ControlGroup, Segmented, Swatches, ToggleSwitch } from "./studio/controls";
import { useDesign } from "./studio/useDesign";
import { withBasePath } from "@/lib/paths";

const DesignScene = dynamic(() => import("./three/DesignScene"), {
  ssr: false,
  loading: () => <SceneFallback />,
});

function SceneFallback() {
  return (
    <div className="relative h-full w-full">
      <Image
        src={withBasePath("/images/products/bouquet-blush.jpg")}
        alt="A hand-crocheted blush and cream yarn flower bouquet"
        fill
        sizes="(min-width: 1024px) 42vw, 92vw"
        className="object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-bark/35 to-transparent p-4"
      >
        <span className="rounded-full bg-white/85 px-4 py-1.5 font-hand text-lg text-rose-ink">
          warming up the hooks…
        </span>
      </div>
    </div>
  );
}

export function DesignStudio() {
  const d = useDesign();
  const c = d.config;
  const [mode, setMode] = useState<"customize" | "draw">("customize");
  const [copied, setCopied] = useState(false);
  const webgl = useWebGL();

  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const near = useInViewport(canvasWrapRef, "300px");
  const linkInputRef = useRef<HTMLInputElement>(null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(d.designUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // clipboard unavailable (permissions/older browsers) → select the input
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    }
  };

  const summary = describeDesign(c);
  const studioHref = `/studio?design=${encodeDesign(c)}`;
  const mixing = c.type === "bouquet" && c.mixColors;

  return (
    <section id="studio" className="gingham-pink scallop-bottom relative overflow-hidden py-20 md:py-28" style={{ "--scallop": "var(--color-blush-soft)" } as React.CSSProperties}>
      <YarnCorner />
      <div className="wrap">
        <SectionHeading
          eyebrow="the 3D design studio"
          title="Design Your"
          accent="Own."
          lead="A little crochet sketch pad — pick petals and colours, or draw your very own petal, watch it bloom in 3D, then send your design straight to Whimlet. Want every option? Open the full studio."
        />

        {/* presets */}
        <Reveal delay={0.08} className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <span className="font-hand text-lg text-rose-ink">start from:</span>
          {DESIGN_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => d.applyPreset(p.id)}
              aria-pressed={d.activePreset === p.id}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                d.activePreset === p.id
                  ? "border-transparent bg-blush text-cocoa shadow-clay-sm"
                  : "border-white bg-white/80 text-cocoa-soft shadow-card hover:-translate-y-0.5 hover:text-rose-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </Reveal>

        <Reveal delay={0.12} className="card mt-6 overflow-hidden p-4 shadow-lift md:p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-8">
            {/* ---------- the living preview ---------- */}
            <div
              ref={canvasWrapRef}
              className="candy relative aspect-square w-full self-center overflow-hidden rounded-[2rem] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.8)]"
            >
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <span className="absolute left-[10%] top-[16%] h-[58%] w-[80%] rounded-[46%_54%_52%_48%/58%_44%_56%_42%] bg-blush-soft/80 blur-2xl" />
                <span className="absolute right-[4%] top-[6%] h-24 w-24 rounded-full bg-lavender/70 blur-2xl" />
                <span className="absolute bottom-[6%] left-[4%] h-20 w-20 rounded-full bg-mint/80 blur-2xl" />
              </div>
              {webgl === false ? <SceneFallback /> : near ? <DesignScene config={c} /> : null}
              <p
                aria-hidden="true"
                className="sticker pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-rose-ink"
                style={{ "--tilt": "-2deg" } as React.CSSProperties}
              >
                {webgl === false ? "3D preview unavailable — your choices still work below ✿" : "drag to spin ✿"}
              </p>
              <Link href={studioHref} className="btn btn-glass btn-sm absolute right-3 top-3">
                <SparkleDoodle className="h-4 w-4 text-rose-ink" /> Open full studio
              </Link>
            </div>

            {/* ---------- controls / sketch pad ---------- */}
            <div className="flex flex-col gap-6">
              {mode === "draw" ? (
                <PetalSketch
                  color={c.petalColor}
                  centerColor={c.centerColor}
                  petalCount={c.petalCount}
                  initial={c.customPetal}
                  onApply={(data) => {
                    d.set((x) => ({ ...x, petalShape: "custom", customPetal: data }));
                    setMode("customize");
                  }}
                  onCancel={() => setMode("customize")}
                />
              ) : (
                <>
                  <ControlGroup label="What are we making?">
                    <Segmented
                      ariaLabel="Piece type"
                      options={[
                        { value: "flower", label: "A Flower" },
                        { value: "bouquet", label: "A Bouquet" },
                      ]}
                      value={c.type}
                      onChange={(type) => d.set((x) => ({ ...x, type, stem: type === "bouquet" && x.stem === "none" ? "short" : x.stem }))}
                    />
                  </ControlGroup>

                  <ControlGroup label="Petals">
                    <Segmented
                      ariaLabel="Petal shape"
                      options={[
                        { value: "rounded", label: "Rounded" },
                        { value: "pointed", label: "Pointed" },
                        { value: "custom", label: c.petalShape === "custom" ? "✏️ Mine" : "✏️ Draw" },
                      ]}
                      value={c.petalShape}
                      onChange={(v) => (v === "custom" ? setMode("draw") : d.update("petalShape", v))}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Segmented ariaLabel="Petal count" options={PETAL_COUNTS.map((n) => ({ value: n, label: String(n) }))} value={c.petalCount} onChange={(v) => d.update("petalCount", v)} />
                      <Segmented ariaLabel="Petal rings" options={PETAL_LAYERS.map((n) => ({ value: n, label: n === 1 ? "1 ring" : `${n} rings` }))} value={c.petalLayers} onChange={(v) => d.update("petalLayers", v)} />
                    </div>
                    {c.petalShape === "custom" && c.customPetal && (
                      <p className="text-xs font-semibold text-rose-ink">
                        ✏️ blooming from your hand-drawn petal —{" "}
                        <button type="button" className="underline decoration-blush-deep decoration-2 underline-offset-2" onClick={() => setMode("draw")}>
                          refine the sketch
                        </button>
                      </p>
                    )}
                  </ControlGroup>

                  <ControlGroup label="Colours">
                    <Swatches
                      ariaLabel="Petal colour"
                      options={PETAL_SWATCHES}
                      value={c.petalColor}
                      onChange={(v) => d.update("petalColor", v)}
                      disabled={mixing}
                      disabledNote="mixing a palette — turn off to pick one"
                    />
                    <Segmented
                      ariaLabel="Petal pattern"
                      options={[
                        { value: "solid", label: "Solid" },
                        { value: "ombre", label: "Ombré" },
                        { value: "dipped", label: "Dipped" },
                        { value: "striped", label: "Stripes" },
                      ]}
                      value={c.petalPattern}
                      onChange={(v) => d.update("petalPattern", v)}
                    />
                    {c.petalPattern !== "solid" && <Swatches ariaLabel="Accent colour" options={PETAL_SWATCHES} value={c.accentColor} onChange={(v) => d.update("accentColor", v)} compact />}
                    <Swatches ariaLabel="Centre colour" options={CENTER_SWATCHES} value={c.centerColor} onChange={(v) => d.update("centerColor", v)} compact />
                    {c.type === "bouquet" && (
                      <>
                        <ToggleSwitch label="Mix a palette" checked={c.mixColors} onChange={(v) => d.update("mixColors", v)} />
                        <Swatches ariaLabel="Ribbon colour" options={RIBBON_SWATCHES} value={c.ribbonColor} onChange={(v) => d.update("ribbonColor", v)} compact />
                      </>
                    )}
                  </ControlGroup>

                  <ControlGroup label="Stem & leaves">
                    <Segmented
                      ariaLabel="Stem length"
                      options={
                        c.type === "bouquet"
                          ? [
                              { value: "short", label: "Short" },
                              { value: "tall", label: "Tall" },
                            ]
                          : [
                              { value: "none", label: "None" },
                              { value: "short", label: "Short" },
                              { value: "tall", label: "Tall" },
                            ]
                      }
                      value={c.stem}
                      onChange={(v) => d.update("stem", v)}
                    />
                    <Segmented
                      ariaLabel="Leaf count"
                      options={[
                        { value: 0, label: "No leaves" },
                        { value: 1, label: "1 leaf" },
                        { value: 2, label: "2 leaves" },
                      ]}
                      value={c.leaves}
                      onChange={(v) => d.update("leaves", v)}
                    />
                  </ControlGroup>

                  {c.type === "bouquet" && (
                    <ControlGroup label="The bouquet">
                      <Segmented ariaLabel="Number of flowers" options={BOUQUET_COUNTS.map((n) => ({ value: n, label: `${n} flowers` }))} value={c.bouquetCount} onChange={(v) => d.update("bouquetCount", v)} />
                      <div className="flex flex-wrap gap-2">
                        <ToggleSwitch label="Wrap it in paper" checked={c.wrap} onChange={(v) => d.update("wrap", v)} />
                        <ToggleSwitch label="Fairy lights" checked={c.fairyLights} onChange={(v) => d.update("fairyLights", v)} />
                      </div>
                    </ControlGroup>
                  )}

                  <p className="rounded-2xl bg-white/60 px-4 py-3 text-sm text-cocoa-soft">
                    That&apos;s the quick version. The{" "}
                    <Link href={studioHref} className="font-semibold text-rose-ink underline decoration-blush-deep decoration-2 underline-offset-4">
                      full studio
                    </Link>{" "}
                    adds yarn types, petal size and openness, centre styles, leaf shapes, fillers, wrap styles, tags, butterflies, charms, a vase or pot, and a design file you can save — your choices here carry over.
                    Not a flower at all? The{" "}
                    <Link href="/maker" className="font-semibold text-rose-ink underline decoration-blush-deep decoration-2 underline-offset-4">
                      Maker
                    </Link>{" "}
                    is a free-form table: soft shapes you can move, mirror and sculpt into anything.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ---------- summary + actions ---------- */}
          <div className="mt-6 border-t-2 border-dashed border-blush-deep/40 pt-5">
            <p aria-live="polite" className="text-pretty font-hand text-xl leading-snug text-cocoa md:text-2xl">
              <span className="text-rose-ink">your design:</span> {summary}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={d.surprise} className="btn btn-outline btn-sm">
                <SparkleDoodle className="h-4 w-4" /> Surprise Me
              </button>
              <button type="button" onClick={d.reset} className="btn btn-sm rounded-full px-5 py-2.5 text-cocoa-soft transition-colors hover:text-rose-ink">
                ↺ Reset
              </button>
              <button type="button" onClick={copyLink} className="btn btn-outline btn-sm">
                {copied ? "Link copied! ♥" : "Copy design link"}
              </button>
              <Link href={studioHref} className="btn btn-primary btn-sm">
                Open full studio →
              </Link>
              <a href={waLink(buildDesignMessage(c, d.designUrl))} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-md ml-auto">
                <WhatsAppGlyph className="h-5 w-5" strokeWidth={1.8} />
                Send This Design to Whimlet
              </a>
            </div>
            <input
              ref={linkInputRef}
              type="text"
              readOnly
              value={d.designUrl}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Shareable link to your design"
              className="mt-3 w-full truncate rounded-full border border-blush-deep/25 bg-white/60 px-4 py-2 text-xs text-cocoa-soft focus:border-rose focus:outline-none"
            />
            <p className="mt-2 text-xs text-cocoa-soft">
              Share this link with someone you love — it opens the studio with your exact design. Want to add more details?{" "}
              <a href="#custom" className="font-semibold text-rose-ink underline decoration-blush-deep decoration-2 underline-offset-4">
                use the custom order form →
              </a>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function YarnCorner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="pointer-events-none absolute -right-6 top-14 h-32 w-32 rotate-12 text-blush/50"
    >
      <g fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="7.6" />
        <path d="M4.4 12c2.8-2.8 6.9-5 7.6-5s4.8 2.2 7.6 5" />
        <path d="M6.2 8.6c1.9 2.7 5.8 4.9 5.8 4.9s3.9-2.2 5.8-4.9" />
        <path d="M6.2 15.4c1.9-2.7 5.8-4.9 5.8-4.9s3.9 2.2 5.8 4.9" />
      </g>
    </svg>
  );
}
