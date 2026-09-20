"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  CENTER_SWATCHES,
  DEFAULT_DESIGN,
  DESIGN_PRESETS,
  PETAL_SWATCHES,
  RIBBON_SWATCHES,
  buildDesignMessage,
  decodeDesign,
  describeDesign,
  encodeDesign,
  randomDesign,
  sanitizeDesign,
  type DesignConfig,
} from "@/lib/design";
import { waLink } from "@/lib/whatsapp";
import { useInViewport, useWebGL } from "@/lib/hooks";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { HeartDoodle, SparkleDoodle, WhatsAppGlyph } from "./Decorations";
import { PetalSketch } from "./PetalSketch";

const DesignScene = dynamic(() => import("./three/DesignScene"), {
  ssr: false,
  loading: () => <SceneFallback />,
});

function SceneFallback() {
  return (
    <div className="relative h-full w-full">
      <Image
        src="/images/products/bouquet-blush.jpg"
        alt="A hand-crocheted blush and cream yarn flower bouquet"
        fill
        sizes="(min-width: 1024px) 42vw, 92vw"
        className="object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-bark/35 to-transparent p-4"
      >
        <span className="rounded-full bg-white/85 px-4 py-1.5 font-hand text-lg text-rose">
          warming up the hooks…
        </span>
      </div>
    </div>
  );
}

export function DesignStudio() {
  const [config, setConfig] = useState<DesignConfig>(DEFAULT_DESIGN);
  const [activePreset, setActivePreset] = useState<string | null>("blush-rose");
  const [mode, setMode] = useState<"customize" | "draw">("customize");
  const [copied, setCopied] = useState(false);
  const webgl = useWebGL();

  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const near = useInViewport(canvasWrapRef, "300px");
  const linkInputRef = useRef<HTMLInputElement>(null);

  // hydrate a shared design from ?design=… once on mount
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("design");
    if (!code) return;
    const parsed = decodeDesign(code);
    if (parsed) {
      setConfig(parsed);
      setActivePreset(
        DESIGN_PRESETS.find((p) => p.config === parsed)?.id ?? null
      );
    }
  }, []);

  const update = <K extends keyof DesignConfig>(key: K, value: DesignConfig[K]) => {
    setConfig((c) => sanitizeDesign({ ...c, [key]: value }));
    setActivePreset(null);
  };

  const changeType = (type: DesignConfig["type"]) => {
    setConfig((c) =>
      sanitizeDesign({ ...c, type, stem: type === "bouquet" && c.stem === "none" ? "short" : c.stem })
    );
    setActivePreset(null);
  };

  const applyPreset = (id: string) => {
    const preset = DESIGN_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setConfig(preset.config);
    setActivePreset(id);
  };

  // computed after mount so SSR and first client render agree (no hydration mismatch)
  const [designUrl, setDesignUrl] = useState("");
  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("design", encodeDesign(config));
    setDesignUrl(u.toString());
  }, [config]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(designUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // clipboard unavailable (permissions/older browsers) → select the input
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    }
  };

  const summary = describeDesign(config);

  return (
    <section id="studio" className="gingham-pink scallop-bottom relative overflow-hidden py-20 md:py-28" style={{ "--scallop": "var(--color-blush-soft)" } as React.CSSProperties}>
      <YarnCorner />
      <div className="wrap">
        <SectionHeading
          eyebrow="the 3D design studio"
          title="Design Your"
          accent="Own."
          lead="A little crochet sketch pad — pick petals and colours, or draw your very own petal, watch it bloom in 3D, then send your design straight to Whimlet."
        />

        {/* presets */}
        <Reveal delay={0.08} className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <span className="font-hand text-lg text-rose/80">start from:</span>
          {DESIGN_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              aria-pressed={activePreset === p.id}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                activePreset === p.id
                  ? "border-transparent bg-blush text-cocoa shadow-clay-sm"
                  : "border-white bg-white/80 text-cocoa-soft shadow-card hover:-translate-y-0.5 hover:text-rose"
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
              {webgl === false ? (
                <SceneFallback />
              ) : near ? (
                <DesignScene config={config} />
              ) : null}
              <p
                aria-hidden="true"
                className="sticker pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-rose"
                style={{ "--tilt": "-2deg" } as React.CSSProperties}
              >
                {webgl === false ? "3D preview unavailable — your choices still work below ✿" : "drag to spin ✿"}
              </p>
            </div>

            {/* ---------- controls / sketch pad ---------- */}
            <div className="flex flex-col gap-6">
              {mode === "draw" ? (
                <PetalSketch
                  color={config.petalColor}
                  centerColor={config.centerColor}
                  petalCount={config.petalCount}
                  initial={config.customPetal}
                  onApply={(data) => {
                    setConfig(sanitizeDesign({ ...config, petalShape: "custom", customPetal: data }));
                    setActivePreset(null);
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
                  value={config.type}
                  onChange={(v) => changeType(v)}
                />
              </ControlGroup>

              <ControlGroup label="Petals">
                <Segmented
                  ariaLabel="Petal shape"
                  options={[
                    { value: "rounded", label: "Rounded" },
                    { value: "pointed", label: "Pointed" },
                    { value: "custom", label: config.petalShape === "custom" ? "✏️ Mine" : "✏️ Draw" },
                  ]}
                  value={config.petalShape}
                  onChange={(v) => (v === "custom" ? setMode("draw") : update("petalShape", v))}
                />
                <Segmented
                  ariaLabel="Petal count"
                  options={[4, 5, 6, 7, 8].map((n) => ({ value: n, label: String(n) }))}
                  value={config.petalCount}
                  onChange={(v) => update("petalCount", v)}
                />
                {config.petalShape === "custom" && config.customPetal && (
                  <p className="text-xs font-semibold text-rose">
                    ✏️ blooming from your hand-drawn petal —{" "}
                    <button
                      type="button"
                      className="underline decoration-blush-deep decoration-2 underline-offset-2"
                      onClick={() => setMode("draw")}
                    >
                      refine the sketch
                    </button>
                  </p>
                )}
              </ControlGroup>

              <ControlGroup label="Colours">
                <Swatches
                  ariaLabel="Petal colour"
                  options={PETAL_SWATCHES}
                  value={config.petalColor}
                  onChange={(v) => update("petalColor", v)}
                  disabled={config.type === "bouquet" && config.mixColors}
                  disabledNote={config.type === "bouquet" ? "mixing pastels — turn off to pick one" : undefined}
                />
                <Swatches
                  ariaLabel="Centre colour"
                  options={CENTER_SWATCHES}
                  value={config.centerColor}
                  onChange={(v) => update("centerColor", v)}
                />
                {config.type === "bouquet" && (
                  <>
                    <ToggleSwitch
                      label="Mix pastel colours"
                      checked={config.mixColors}
                      onChange={(v) => update("mixColors", v)}
                    />
                    <Swatches
                      ariaLabel="Ribbon colour"
                      options={RIBBON_SWATCHES}
                      value={config.ribbonColor}
                      onChange={(v) => update("ribbonColor", v)}
                    />
                  </>
                )}
              </ControlGroup>

              <ControlGroup label="Stem & leaves">
                <Segmented
                  ariaLabel="Stem length"
                  options={
                    config.type === "bouquet"
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
                  value={config.stem}
                  onChange={(v) => update("stem", v)}
                />
                <Segmented
                  ariaLabel="Leaf count"
                  options={[
                    { value: 0, label: "No leaves" },
                    { value: 1, label: "1 leaf" },
                    { value: 2, label: "2 leaves" },
                  ]}
                  value={config.leaves}
                  onChange={(v) => update("leaves", v)}
                />
              </ControlGroup>

              {config.type === "bouquet" && (
                <ControlGroup label="The bouquet">
                  <Segmented
                    ariaLabel="Number of flowers"
                    options={[
                      { value: 3, label: "3 flowers" },
                      { value: 5, label: "5 flowers" },
                      { value: 7, label: "7 flowers" },
                    ]}
                    value={config.bouquetCount}
                    onChange={(v) => update("bouquetCount", v)}
                  />
                  <ToggleSwitch
                    label="Wrap it in cream paper"
                    checked={config.wrap}
                    onChange={(v) => update("wrap", v)}
                  />
                </ControlGroup>
              )}
              </>
              )}
            </div>
          </div>

          {/* ---------- summary + actions ---------- */}
          <div className="mt-6 border-t-2 border-dashed border-blush-deep/40 pt-5">
            <p aria-live="polite" className="text-pretty font-hand text-xl leading-snug text-cocoa md:text-2xl">
              <span className="text-rose">your design:</span> {summary}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => { setConfig(randomDesign()); setActivePreset(null); }} className="btn btn-outline btn-sm">
                <SparkleDoodle className="h-4 w-4" /> Surprise Me
              </button>
              <button
                type="button"
                onClick={() => { setConfig(DEFAULT_DESIGN); setActivePreset("blush-rose"); }}
                className="btn btn-sm rounded-full px-5 py-2.5 text-cocoa-soft transition-colors hover:text-rose"
              >
                ↺ Reset
              </button>
              <button type="button" onClick={copyLink} className="btn btn-outline btn-sm">
                {copied ? "Link copied! ♥" : "Copy design link"}
              </button>
              <a
                href={waLink(buildDesignMessage(config))}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp btn-md ml-auto"
              >
                <WhatsAppGlyph className="h-5 w-5" strokeWidth={1.8} />
                Send This Design to Whimlet
              </a>
            </div>

            <input
              ref={linkInputRef}
              type="text"
              readOnly
              value={designUrl}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Shareable link to your design"
              className="mt-3 w-full truncate rounded-full border border-blush-deep/25 bg-white/60 px-4 py-2 text-xs text-cocoa-soft focus:border-rose focus:outline-none"
            />
            <p className="mt-2 text-xs text-cocoa-soft">
              Share this link with someone you love — it opens the studio with your exact design.
              Want to add more details?{" "}
              <a href="#custom" className="font-semibold text-rose underline decoration-blush-deep decoration-2 underline-offset-4">
                use the custom order form →
              </a>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- UI primitives ---------------- */

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="font-hand text-xl text-rose">{label}</p>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5 rounded-full bg-blush-soft/40 p-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-all duration-300 ${
              active
                ? "bg-blush font-bold text-cocoa shadow-card"
                : "font-semibold text-cocoa-soft hover:text-rose"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Swatches({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  disabledNote,
}: {
  options: { name: string; hex: string }[];
  value: string;
  onChange: (hex: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  disabledNote?: string;
}) {
  const [customHex, setCustomHex] = useState("#E8B4C8");
  const isKnown = options.some((o) => o.hex.toUpperCase() === value.toUpperCase());

  return (
    <div className={`flex flex-col gap-1.5 ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      <div role="group" aria-label={ariaLabel} className="flex flex-wrap items-center gap-2">
        {options.map((o) => {
          const active = value.toUpperCase() === o.hex.toUpperCase();
          return (
            <button
              key={o.hex}
              type="button"
              onClick={() => onChange(o.hex)}
              aria-pressed={active}
              aria-label={o.name}
              disabled={disabled}
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                active ? "scale-110 border-cocoa shadow-soft" : "border-white/80 hover:scale-105"
              }`}
              style={{ backgroundColor: o.hex }}
            >
              {active && (
                <HeartDoodle
                  className={["#F6E9D8", "#FFF7F0", "#F0D5A8", "#F2CD8D", "#A9BFA3"].includes(o.hex) ? "h-4.5 w-4.5 text-cocoa" : "h-4.5 w-4.5 text-white"}
                />
              )}
            </button>
          );
        })}

        {/* custom picker */}
        <label
          className={`relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-300 ${
            !isKnown ? "scale-110 border-cocoa shadow-soft" : "border-white/80 hover:scale-105"
          }`}
          style={{
            background: `conic-gradient(${customHex} 0 25%, #F2B9C9 0 50%, #A9BFA3 0 75%, #CBB6EA 0)`,
          }}
          title="Pick your own colour"
        >
          <input
            type="color"
            value={customHex}
            onChange={(e) => {
              setCustomHex(e.target.value);
              onChange(e.target.value.toUpperCase());
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${ariaLabel} — custom colour`}
            disabled={disabled}
          />
        </label>
      </div>
      {disabled && disabledNote && <p className="text-xs text-cocoa-soft">{disabledNote}</p>}
    </div>
  );
}

function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-fit items-center gap-3 rounded-full border-2 px-3.5 py-2 text-sm font-semibold transition-all duration-300 ${
        checked ? "border-rose bg-blush-soft text-cocoa" : "border-blush-deep/30 bg-white/60 text-cocoa-soft hover:border-rose/50"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors duration-300 ${checked ? "bg-rose" : "bg-blush-deep/30"}`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${checked ? "translate-x-4" : ""}`}
        />
      </span>
      {label}
    </button>
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
