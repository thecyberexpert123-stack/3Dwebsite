"use client";

import { FlowerDoodle } from "../Decorations";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  DEFAULT_DESIGN,
  DESIGN_PRESETS,
  MIX_PALETTES,
  OCCASIONS,
  colourName,
  decodeDesign,
  designFileName,
  encodeDesign,
  estimateSpec,
  parseDesignFile,
  toDesignFile,
  type DesignConfig,
  type DesignFile,
} from "@/lib/design";
import { dequantizePetal } from "@/lib/sketch";
import { useWebGL } from "@/lib/hooks";
import { BACKDROPS, DEFAULT_VIEW, PART_LABELS, type BackdropId, type FocusId, type PartId, type StudioView } from "../three/DesignScene";
import { ColourChip, Segmented, ToggleSwitch } from "./controls";

const DesignScene = dynamic(() => import("../three/DesignScene"), { ssr: false, loading: () => <div className="absolute inset-0 bg-[#FFE6EE]" /> });

/**
 * The maker's viewer (/admin). Opens a customer's `.whimlet.json` (drop it,
 * pick it, paste it, or arrive via ?design=…) and shows the piece the way a
 * modelling tool would: orbit / zoom, focus framings, exploded view, x-ray
 * wireframe, per-part visibility, a grid with real-world scale, plus the
 * spec sheet: palette with hex codes, counts, size and yarn estimates.
 */
export function AdminViewer() {
  const webgl = useWebGL();
  const [file, setFile] = useState<DesignFile | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<StudioView>({ ...DEFAULT_VIEW, orbit: true, autoRotate: false, grid: true, backdrop: "paper" });
  const [tab, setTab] = useState<"spec" | "view" | "json">("spec");
  const [paste, setPaste] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const captureRef = useRef<(() => string | null) | null>(null);

  const load = useCallback((text: string, source?: string) => {
    const r = parseDesignFile(text);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    setFile(r.file);
    setWarnings(source ? [...r.warnings, `Opened ${source}`] : r.warnings);
    setView((v) => ({ ...v, explode: 0, hidden: [], focus: "all" }));
  }, []);

  // arrive from a share link (?design=…)
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("design");
    if (code && decodeDesign(code)) load(code, "the share link");
  }, [load]);

  const openFile = (f: File | undefined) => {
    if (!f) return;
    f.text().then((t) => load(t, f.name));
  };

  const c = file?.config ?? null;
  const spec = useMemo(() => (c ? estimateSpec(c) : null), [c]);

  const exportPng = () => {
    const url = captureRef.current?.();
    if (!url || !c) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = designFileName(c, file?.name).replace(/\.whimlet\.json$/, ".png");
    a.click();
  };
  const reSave = () => {
    if (!c) return;
    const blob = new Blob([JSON.stringify(toDesignFile(c, file?.name), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = designFileName(c, file?.name);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const studioLink = c ? `/studio?design=${encodeDesign(c)}` : "/studio";

  const togglePart = (p: PartId) => setView((v) => ({ ...v, hidden: v.hidden.includes(p) ? v.hidden.filter((x) => x !== p) : [...v.hidden, p] }));

  return (
    <div
      className="studio-page relative min-h-[100dvh] overflow-hidden bg-[#FBF1EA] text-cocoa"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        openFile(e.dataTransfer.files?.[0]);
      }}
    >
      {/* ---------- stage ---------- */}
      <div className="absolute inset-0 lg:right-[24rem]">
        {c && webgl !== false && <DesignScene config={c} view={view} opaque className="!absolute inset-0 cursor-grab active:cursor-grabbing" captureRef={captureRef} />}
        {c && webgl === false && (
          <div className="flex h-full items-center justify-center p-8">
            <p className="max-w-sm rounded-3xl bg-white/80 p-6 text-center font-hand text-2xl text-rose-ink">No WebGL here — the spec sheet on the right still has everything.</p>
          </div>
        )}
        {!c && (
          <div className="flex h-full items-center justify-center p-6">
            <div className={`glass-sheet w-full max-w-xl p-8 text-center transition-all ${dragging ? "scale-[1.02] ring-4 ring-rose/40" : ""}`}>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.26em] text-rose-ink">Whimlet · maker&apos;s viewer</p>
              <h1 className="mt-3 font-script text-5xl text-cocoa">Open a design</h1>
              <p className="mt-3 text-pretty text-sm text-cocoa-soft">
                Drop a customer&apos;s <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs">.whimlet.json</code> anywhere on this page, pick it below, or paste the file / share link.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button type="button" onClick={() => fileInput.current?.click()} className="btn btn-primary btn-md">
                  ⤒ Choose file
                </button>
                <details className="group">
                  <summary className="btn btn-outline btn-md list-none cursor-pointer">Paste instead</summary>
                  <div className="mt-3 flex flex-col gap-2">
                    <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} placeholder='{"format":"whimlet-design", …}  or  https://…/studio?design=…' className="w-full rounded-2xl border border-blush-deep/30 bg-white/80 p-3 font-mono text-xs text-cocoa focus:border-rose focus:outline-none" />
                    <button type="button" onClick={() => load(paste, "pasted text")} className="btn btn-glass btn-sm self-end">
                      Open pasted
                    </button>
                  </div>
                </details>
              </div>
              <div className="mt-6 border-t border-dashed border-blush-deep/40 pt-4">
                <p className="text-xs text-cocoa-soft">or open a sample:</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {DESIGN_PRESETS.map((p) => (
                    <button key={p.id} type="button" onClick={() => load(JSON.stringify(toDesignFile(p.config, p.label)), `sample “${p.label}”`)} className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-cocoa-soft hover:text-rose-ink">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {error && (
                <p role="alert" className="mt-4 rounded-2xl bg-rose/10 px-4 py-2 text-sm font-semibold text-rose-ink">
                  {error}
                </p>
              )}
            </div>
          </div>
        )}
        <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { openFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
      </div>

      {/* ---------- top-left: identity + viewer tools ---------- */}
      <header className="pointer-events-none absolute left-3 top-3 z-20 flex flex-col gap-2 md:left-5 md:top-5">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <Link href="/" className="btn btn-glass btn-sm">
            ← Whimlet
          </Link>
          <span className="glass-pill gap-2">
            <span className="font-hand text-lg leading-none text-rose-ink">Maker&apos;s viewer</span>
            {file && <span className="max-w-[12rem] truncate rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold text-cocoa-soft">{file.name}</span>}
          </span>
        </div>
        {c && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Focus" className="glass-pill gap-1">
              {(["all", "bloom", "stem", "wrap", "extras"] as FocusId[]).map((f) => (
                <button key={f} type="button" aria-pressed={view.focus === f && !view.orbit} onClick={() => setView((v) => ({ ...v, orbit: false, focus: f }))} className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize transition-all ${view.focus === f && !view.orbit ? "bg-blush text-cocoa shadow-card" : "text-cocoa-soft hover:text-rose-ink"}`}>
                  {f}
                </button>
              ))}
              <button type="button" aria-pressed={view.orbit} onClick={() => setView((v) => ({ ...v, orbit: !v.orbit }))} className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${view.orbit ? "bg-blush text-cocoa shadow-card" : "text-cocoa-soft hover:text-rose-ink"}`} title="Free orbit: drag to turn, scroll to zoom">
                ⟲ orbit
              </button>
            </div>
            <label className="glass-pill gap-2 text-xs font-semibold text-cocoa-soft">
              explode
              <input type="range" min={0} max={1} step={0.01} value={view.explode} onChange={(e) => setView((v) => ({ ...v, explode: +e.target.value }))} className="w-28 accent-rose" aria-label="Exploded view" />
            </label>
            <button type="button" aria-pressed={view.wireframe} onClick={() => setView((v) => ({ ...v, wireframe: !v.wireframe }))} className={`btn btn-sm ${view.wireframe ? "btn-primary" : "btn-glass"}`}>
              x-ray
            </button>
            <button type="button" aria-pressed={view.grid} onClick={() => setView((v) => ({ ...v, grid: !v.grid }))} className={`btn btn-sm ${view.grid ? "btn-primary" : "btn-glass"}`}>
              grid
            </button>
            <button type="button" aria-pressed={view.autoRotate} onClick={() => setView((v) => ({ ...v, autoRotate: !v.autoRotate }))} className={`btn btn-sm ${view.autoRotate ? "btn-primary" : "btn-glass"}`}>
              turntable
            </button>
            <div role="group" aria-label="Backdrop" className="glass-pill gap-1.5">
              {(Object.keys(BACKDROPS) as BackdropId[]).map((id) => (
                <button key={id} type="button" aria-label={`${BACKDROPS[id].label} backdrop`} aria-pressed={view.backdrop === id} onClick={() => setView((v) => ({ ...v, backdrop: id }))} className={`h-5 w-5 rounded-full border-2 transition-transform ${view.backdrop === id ? "scale-110 border-cocoa" : "border-white/80 hover:scale-105"}`} style={{ background: `linear-gradient(${BACKDROPS[id].top}, ${BACKDROPS[id].horizon})` }} />
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ---------- grid legend ---------- */}
      {c && view.grid && <p className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-cocoa-soft md:left-5">grid: 1 square ≈ 2.5 cm · thick line ≈ 10 cm</p>}

      {/* ---------- right: the spec sheet ---------- */}
      <AnimatePresence>
        {c && spec && file && (
          <motion.aside key="sheet" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="glass-sheet absolute inset-x-3 bottom-3 top-[46dvh] z-20 flex flex-col overflow-hidden lg:inset-y-3 lg:left-auto lg:right-3 lg:w-[23rem]" aria-label="Design spec sheet">
            <div className="border-b border-white/70 px-4 pb-3 pt-4">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.24em] text-rose-ink">{OCCASIONS.find((o) => o.id === c.occasion)?.label ?? "Just because"}</p>
              <h1 className="mt-1 truncate font-script text-3xl leading-tight text-cocoa">{file.name}</h1>
              <p className="mt-1 text-[11px] text-cocoa-soft">
                {file.createdAt && Date.parse(file.createdAt) > 0 ? new Date(file.createdAt).toLocaleString() : "no date"} · format v{file.version}
              </p>
              {warnings.length > 0 && (
                <ul className="mt-2 flex flex-col gap-0.5">
                  {warnings.map((w) => (
                    <li key={w} className="text-[11px] text-cocoa-soft">
                      · {w}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3">
                <Segmented
                  ariaLabel="Sheet tab"
                  size="sm"
                  options={[
                    { value: "spec", label: "Spec sheet" },
                    { value: "view", label: "Parts" },
                    { value: "json", label: "File" },
                  ]}
                  value={tab}
                  onChange={setTab}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-lenis-prevent>
              {tab === "spec" && (
                <div className="flex flex-col gap-5">
                  <p className="text-pretty font-hand text-xl leading-snug text-cocoa">{file.summary}</p>
                  {c.note && (
                    <blockquote className="rounded-2xl bg-butter/70 px-3.5 py-2.5 text-sm text-cocoa">
                      <span className="font-bold text-rose-ink">Customer note: </span>
                      {c.note}
                    </blockquote>
                  )}

                  <section>
                    <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cocoa-soft">Colours</h2>
                    <ul className="flex flex-col gap-2">
                      {spec.palette.map((p) => (
                        <li key={p.role + p.hex}>
                          <ColourChip hex={p.hex} name={p.name} role={p.role} large />
                        </li>
                      ))}
                    </ul>
                    {c.mixColors && c.type === "bouquet" && <p className="mt-2 text-[11px] text-cocoa-soft">palette “{MIX_PALETTES[c.mixPalette].label}” cycles in order; flower 1 starts at the front-right and goes anticlockwise.</p>}
                  </section>

                  <section>
                    <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cocoa-soft">Counts & size</h2>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                      <Stat k="flowers" v={String(spec.flowers)} />
                      <Stat k="petals / flower" v={`${spec.petalsPerFlower} (${c.petalLayers} ring${c.petalLayers > 1 ? "s" : ""} × ${c.petalCount}${c.petalLayers > 1 ? "↓" : ""})`} />
                      <Stat k="petals total" v={String(spec.petalsTotal)} />
                      <Stat k="leaves total" v={String(spec.leavesTotal)} />
                      <Stat k="finished size" v={`≈ ${spec.heightCm} × ${spec.widthCm} cm`} />
                      <Stat k="yarn" v={`${c.yarn}${c.sparkle ? " + glitter" : ""}`} />
                      <Stat k="petal size" v={c.petalSize} />
                      <Stat k="openness" v={c.openness} />
                    </dl>
                  </section>

                  <section>
                    <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cocoa-soft">Yarn estimate</h2>
                    <ul className="flex flex-col gap-1.5">
                      {spec.yarnGrams.map((y) => (
                        <li key={y.hex + y.role} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="h-4 w-4 shrink-0 rounded-full border border-white shadow-soft" style={{ backgroundColor: y.hex }} />
                            <span className="truncate">{colourName(y.hex)}</span>
                          </span>
                          <span className="font-semibold tabular-nums">{y.grams} g</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-[11px] text-cocoa-soft">rough guide for 4-ply cotton on a 3 mm hook; add ~15% for tails and swatching.</p>
                  </section>

                  <section>
                    <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cocoa-soft">Parts list</h2>
                    <ul className="flex flex-col gap-1 text-sm">
                      {spec.parts.map((p) => (
                        <li key={p} className="flex gap-2">
                          <FlowerDoodle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-ink" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {c.petalShape === "custom" && c.customPetal && (
                    <section>
                      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cocoa-soft">Hand-drawn petal template</h2>
                      <PetalTemplate data={c.customPetal} color={c.petalColor} />
                      <p className="mt-1.5 text-[11px] text-cocoa-soft">the customer&apos;s own outline, normalised to petal length — print at ~{Math.round((c.petalSize === "petite" ? 3 : c.petalSize === "full" ? 4.6 : 3.8) * (c.size === "mini" ? 0.7 : c.size === "grand" ? 1.35 : 1) * 10) / 10} cm tall.</p>
                    </section>
                  )}
                </div>
              )}

              {tab === "view" && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-cocoa-soft">Hide parts to see how the piece is built. Combine with the explode slider and x-ray.</p>
                  {(Object.keys(PART_LABELS) as PartId[]).map((p) => (
                    <ToggleSwitch key={p} small label={PART_LABELS[p]} checked={!view.hidden.includes(p)} onChange={() => togglePart(p)} />
                  ))}
                  <button type="button" onClick={() => setView((v) => ({ ...v, hidden: [] }))} className="btn btn-glass btn-sm self-start">
                    show everything
                  </button>
                </div>
              )}

              {tab === "json" && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-cocoa-soft">Exactly what the customer sent. Only the options that differ from the defaults matter — anything missing means “default”.</p>
                  <pre className="max-h-[50dvh] overflow-auto rounded-2xl bg-white/70 p-3 font-mono text-[11px] leading-relaxed text-cocoa" data-lenis-prevent>
                    {JSON.stringify(diffFromDefault(c), null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-white/70 px-4 py-3">
              <button type="button" onClick={() => { setFile(null); setWarnings([]); }} className="btn btn-glass btn-sm">
                ⤒ Open another
              </button>
              <button type="button" onClick={reSave} className="btn btn-glass btn-sm" title="Re-save as a clean v2 file">
                ⤓ Save copy
              </button>
              <button type="button" onClick={exportPng} className="btn btn-glass btn-sm hidden md:inline-flex">
                ◎ PNG
              </button>
              <Link href={studioLink} className="btn btn-outline btn-sm ml-auto">
                Edit in studio →
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-cocoa-soft">{k}</dt>
      <dd className="font-semibold capitalize text-cocoa">{v}</dd>
    </>
  );
}

/** The hand-drawn outline as a printable SVG template. */
function PetalTemplate({ data, color }: { data: number[]; color: string }) {
  const pts = dequantizePetal(data);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${(50 + p.x * 90).toFixed(1)},${(100 - p.y * 92 - 4).toFixed(1)}`).join(" ") + " Z";
  return (
    <svg viewBox="0 0 100 100" className="h-40 w-40 rounded-2xl bg-white/80" role="img" aria-label="Hand-drawn petal outline">
      <path d={path} fill={color} fillOpacity={0.55} stroke="#4A3238" strokeWidth={1.2} strokeLinejoin="round" />
      <line x1="50" y1="6" x2="50" y2="96" stroke="#B8456F" strokeWidth={0.5} strokeDasharray="2 2" />
    </svg>
  );
}

function diffFromDefault(c: DesignConfig): Partial<DesignConfig> {
  const out: Partial<DesignConfig> = {};
  for (const k of Object.keys(c) as (keyof DesignConfig)[]) {
    if (JSON.stringify(c[k]) !== JSON.stringify(DEFAULT_DESIGN[k])) (out as Record<string, unknown>)[k] = c[k];
  }
  return out;
}
