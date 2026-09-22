"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import * as THREE from "three";
import {
  BRUSHES,
  FALLOFFS,
  type BrushKind,
  type Falloff,
} from "@/lib/sculpt";
import {
  FINISHES,
  MAKER_SWATCHES,
  MAKER_TEMPLATES,
  MAX_PARTS,
  NAME_MAX,
  NOTE_MAX,
  PRIMITIVES,
  UNIT_CM,
  buildMakerMessage,
  describeDoc,
  estimateDoc,
  type MakerFinish,
  type MakerPart,
  type PrimitiveKind,
} from "@/lib/maker";
import { waLink } from "@/lib/whatsapp";
import { useIsMobile, useWebGL } from "@/lib/hooks";
import { SparkleDoodle, WhatsAppGlyph } from "../Decorations";
import { ColourChip, Segmented, Swatches, ToggleSwitch } from "../studio/controls";
import { DEFAULT_MAKER_VIEW, type GizmoMode, type MakerView, type SceneApi } from "../three/MakerScene";
import { useMakerDoc } from "./useMakerDoc";

const MakerScene = dynamic(() => import("../three/MakerScene"), { ssr: false, loading: () => <SceneLoading /> });

function SceneLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_40%,#FFE6EE,#FFF4F7_70%)]">
      <p className="font-hand text-xl text-rose-ink">setting the table…</p>
    </div>
  );
}

/**
 * The Whimlet Maker (/maker) — a small, friendly Blender for crochet.
 *
 * Layout follows Blender's muscle memory without its density:
 *  - left: the tool rail (T-panel) — mode, add shapes, gizmo / brushes;
 *  - right: properties (N-panel) — the selected part's transform, colour,
 *    finish, mirror, and the parts list (outliner);
 *  - bottom: what it is in words + save / open / share / send.
 * Shortcuts mirror Blender where they don't fight the browser:
 * Tab (object ⇄ sculpt), G/R/S (gizmo modes), Shift+A (add), Shift+D
 * (duplicate), X / Delete, H / Alt+H, F (brush size), Ctrl+Z / ⇧Ctrl+Z,
 * 1–0 add a shape by number, Esc deselects.
 */
export function MakerApp() {
  const m = useMakerDoc();
  const reduce = !!useReducedMotion();
  const webgl = useWebGL();
  const phone = useIsMobile();
  const [view, setView] = useState<MakerView>(DEFAULT_MAKER_VIEW);
  const [toast, setToast] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [panel, setPanel] = useState<"part" | "parts" | "piece">("part");
  const [rightOpen, setRightOpen] = useState(false);
  // desktop: properties open by default; phones: the table first
  useEffect(() => setRightOpen(window.matchMedia("(min-width: 1024px)").matches), []);
  const sceneApi = useRef<SceneApi | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const modifiers = useRef({ ctrl: false, shift: false });

  const say = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const setBrush = useCallback((patch: Partial<MakerView["brush"]>) => setView((v) => ({ ...v, brush: { ...v.brush, ...patch } })), []);

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      modifiers.current.ctrl = e.ctrlKey || e.metaKey;
      modifiers.current.shift = e.shiftKey;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "z") {
        e.preventDefault();
        if (e.shiftKey) m.redo();
        else m.undo();
        return;
      }
      if (e.metaKey || e.ctrlKey) return;
      switch (k) {
        case "tab":
          e.preventDefault();
          setView((v) => ({ ...v, mode: v.mode === "object" ? "sculpt" : "object" }));
          break;
        case "escape":
          setAddOpen(false);
          m.select(null);
          break;
        case "a":
          if (e.shiftKey) {
            e.preventDefault();
            setAddOpen((o) => !o);
          }
          break;
        case "d":
          if (e.shiftKey && m.selectedId) {
            e.preventDefault();
            m.duplicatePart(m.selectedId);
          } else if (view.mode === "sculpt") setBrush({ kind: "draw" });
          break;
        case "x":
        case "delete":
        case "backspace":
          if (m.selectedId) {
            e.preventDefault();
            m.removePart(m.selectedId);
          }
          break;
        case "h":
          if (e.altKey) m.commit((d) => ({ ...d, parts: d.parts.map((p) => ({ ...p, visible: true })) }));
          else if (m.selectedId) m.updatePart(m.selectedId, { visible: false });
          break;
        case "g":
          if (view.mode === "sculpt") setBrush({ kind: "grab" });
          else setView((v) => ({ ...v, gizmo: "translate" }));
          break;
        case "r":
          if (view.mode === "object") setView((v) => ({ ...v, gizmo: "rotate" }));
          break;
        case "s":
          if (view.mode === "sculpt") setBrush({ kind: "smooth" });
          else setView((v) => ({ ...v, gizmo: "scale" }));
          break;
        case "i":
          if (view.mode === "sculpt") setBrush({ kind: "inflate" });
          break;
        case "t":
          if (view.mode === "sculpt") setBrush({ kind: "flatten" });
          break;
        case "p":
          if (view.mode === "sculpt") setBrush({ kind: "pinch" });
          break;
        case "f":
          if (view.mode === "sculpt") setBrush({ radius: e.shiftKey ? Math.max(0.05, view.brush.radius / 1.25) : Math.min(1.5, view.brush.radius * 1.25) });
          break;
        case "m":
          if (m.selectedId && m.selected) m.updatePart(m.selectedId, { mirror: !m.selected.mirror });
          break;
        case "n":
          setRightOpen((o) => !o);
          break;
        default: {
          const prim = PRIMITIVES.find((p) => p.key === e.key);
          if (prim && !e.shiftKey && !e.altKey) {
            m.addPart(prim.kind, m.selected);
            setAddOpen(false);
          }
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      modifiers.current.ctrl = e.ctrlKey || e.metaKey;
      modifiers.current.shift = e.shiftKey;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [m, view.mode, view.brush.radius, setBrush]);

  /* ---------- files ---------- */
  const openFile = (file: File | undefined) => {
    if (!file) return;
    file.text().then((text) => {
      const r = m.openText(text, file.name);
      if (!r.ok) say(r.error);
      else say(r.warnings.length ? `Opened — ${r.warnings[0]}` : `Opened ${file.name}`);
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(m.shareUrl);
      say(m.share.sculptDropped ? "Link copied — sculpt detail is too big for a link; save the file to keep it" : "Design link copied");
    } catch {
      say("Couldn't copy — the link is in the address bar after Save");
    }
  };

  const snapshot = () => {
    const url = sceneApi.current?.snapshot();
    if (!url) return say("Snapshot needs the 3D view");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(m.doc.name || "whimlet-maker").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    a.click();
  };

  const exportGlb = async () => {
    const root = sceneApi.current?.root();
    if (!root) return say("Export needs the 3D view");
    const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
    // export a clean copy: parts only, no helpers, materials flattened to colour
    const group = new THREE.Group();
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.userData.partId) return;
      const clone = new THREE.Mesh(mesh.geometry, new THREE.MeshStandardMaterial({ color: (mesh.material as THREE.MeshStandardMaterial).color, roughness: 0.8 }));
      mesh.updateWorldMatrix(true, false);
      clone.applyMatrix4(mesh.matrixWorld);
      clone.name = mesh.userData.twin ? `${mesh.name}-mirror` : mesh.name;
      group.add(clone);
    });
    new GLTFExporter().parse(
      group,
      (result) => {
        const blob = new Blob([result as ArrayBuffer], { type: "model/gltf-binary" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(m.doc.name || "whimlet-maker").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.glb`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        say("Exported .glb — opens in Blender, Windows 3D Viewer, iOS AR Quick Look");
      },
      (err) => say(`Export failed: ${String(err)}`),
      { binary: true }
    );
  };

  const spec = useMemo(() => estimateDoc(m.doc), [m.doc]);
  const summary = useMemo(() => describeDoc(m.doc), [m.doc]);

  const sel = m.selected;
  const partCount = m.doc.parts.length;

  return (
    <div
      className="studio-page relative min-h-[100dvh] overflow-hidden bg-[#FFE6EE] text-cocoa"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        openFile(e.dataTransfer.files?.[0]);
      }}
    >
      <h1 className="sr-only">Whimlet Maker — free-form 3D crochet design</h1>

      {/* ---------- stage ---------- */}
      <div className="absolute inset-0">
        {webgl === false ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <p className="max-w-md font-hand text-2xl text-rose-ink">The Maker needs WebGL for its 3D table — your parts list, save/open and the WhatsApp handoff below still work.</p>
          </div>
        ) : (
          m.hydrated && (
            <MakerScene
              doc={m.doc}
              selectedId={m.selectedId}
              view={view}
              onSelect={m.select}
              onCommit={m.updatePart}
              onPreview={m.preview}
              apiRef={sceneApi}
              modifiers={modifiers}
              className={`!absolute inset-0 ${view.mode === "sculpt" ? "cursor-crosshair" : "cursor-default"}`}
            />
          )
        )}
      </div>

      {/* ---------- top bar ---------- */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 md:p-5">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <Link href="/" className="btn btn-glass btn-sm" aria-label="Back to Whimlet">
            <ToolIcon name="back" /> Whimlet
          </Link>
          <span className="glass-pill hidden items-center gap-2 md:inline-flex">
            <SparkleDoodle className="h-3.5 w-3.5 text-rose-ink" />
            <span className="font-hand text-lg leading-none text-rose-ink" aria-hidden="true">
              The Maker
            </span>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-cocoa-soft">
              {partCount}/{MAX_PARTS} parts
            </span>
          </span>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <div role="group" aria-label="Mode" className="glass-rail flex p-1">
            {(["object", "sculpt"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view.mode === mode}
                onClick={() => setView((v) => ({ ...v, mode }))}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-all ${view.mode === mode ? "bg-blush font-bold text-cocoa shadow-card" : "font-semibold text-cocoa-soft hover:text-rose-ink"}`}
                title={mode === "object" ? "Object mode — place, turn, size parts (Tab)" : "Sculpt mode — push and pull the surface (Tab)"}
              >
                {mode === "object" ? "Arrange" : "Sculpt"}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setView((v) => ({ ...v, turntable: !v.turntable }))} aria-pressed={view.turntable} className={`btn btn-sm ${view.turntable ? "btn-primary" : "btn-glass"}`} title="Turntable" aria-label="Turntable">
            <ToolIcon name="turn" />
          </button>
          <button type="button" onClick={() => setRightOpen((o) => !o)} aria-pressed={rightOpen} className={`btn btn-sm ${rightOpen ? "btn-primary" : "btn-glass"}`} title="Properties (N)" aria-label="Properties">
            <ToolIcon name="panel" />
          </button>
        </div>
      </header>

      {/* ---------- left tool rail ---------- */}
      <nav aria-label="Tools" className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 md:block">
        <div className="glass-rail flex flex-col items-center gap-1 p-1.5">
          <div className="relative">
            <button type="button" onClick={() => setAddOpen((o) => !o)} aria-expanded={addOpen} className="btn btn-primary btn-sm h-10 w-10 !p-0 text-lg" title="Add a shape (Shift+A)">
              +
            </button>
            <AnimatePresence>
              {addOpen && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="glass-sheet absolute left-14 top-0 z-30 w-64 p-3"
                  role="menu"
                  aria-label="Add a shape"
                >
                  <p className="mb-2 font-hand text-base text-rose-ink">Add a shape</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRIMITIVES.map((p) => (
                      <button
                        key={p.kind}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          m.addPart(p.kind, sel);
                          setAddOpen(false);
                        }}
                        className="flex items-center justify-between rounded-xl bg-white/60 px-2.5 py-1.5 text-left text-sm font-semibold text-cocoa hover:bg-blush-soft"
                        title={p.hint}
                      >
                        <span className="flex items-center gap-2">
                          <PrimitiveIcon kind={p.kind} />
                          {p.label}
                        </span>
                        <kbd className="text-[10px] text-cocoa-soft">{p.key}</kbd>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="my-0.5 h-px w-7 bg-cocoa/15" />
          {view.mode === "object" ? (
            <>
              {(
                [
                  ["translate", "Move", "G", "move"],
                  ["rotate", "Rotate", "R", "rotate"],
                  ["scale", "Size", "S", "scale"],
                ] as [GizmoMode, string, string, "move" | "rotate" | "scale"][]
              ).map(([mode, label, key, icon]) => (
                <button key={mode} type="button" aria-pressed={view.gizmo === mode} onClick={() => setView((v) => ({ ...v, gizmo: mode }))} className={`btn btn-sm h-10 w-10 !p-0 ${view.gizmo === mode ? "btn-primary" : "btn-glass"}`} title={`${label} (${key})`} aria-label={label}>
                  <ToolIcon name={icon} className="h-[18px] w-[18px]" />
                </button>
              ))}
              <button type="button" aria-pressed={view.snap} onClick={() => setView((v) => ({ ...v, snap: !v.snap }))} className={`btn btn-sm h-10 w-10 !p-0 text-[10px] font-bold ${view.snap ? "btn-primary" : "btn-glass"}`} title="Snap: 0.5 cm steps, 15° turns">
                SNAP
              </button>
            </>
          ) : (
            BRUSHES.map((b) => (
              <button key={b.id} type="button" aria-pressed={view.brush.kind === b.id} onClick={() => setBrush({ kind: b.id })} className={`btn btn-sm h-10 w-10 !p-0 text-[11px] font-bold ${view.brush.kind === b.id ? "btn-primary" : "btn-glass"}`} title={`${b.label} — ${b.hint} (${b.key})`}>
                {b.label.slice(0, 3)}
              </button>
            ))
          )}
          <span className="my-0.5 h-px w-7 bg-cocoa/15" />
          <button type="button" aria-pressed={view.grid} onClick={() => setView((v) => ({ ...v, grid: !v.grid }))} className={`btn btn-sm h-10 w-10 !p-0 ${view.grid ? "btn-primary" : "btn-glass"}`} title="Grid (1 square = 1 cm)" aria-label="Grid">
            <ToolIcon name="grid" className="h-[18px] w-[18px]" />
          </button>
          <button type="button" aria-pressed={view.wireframe} onClick={() => setView((v) => ({ ...v, wireframe: !v.wireframe }))} className={`btn btn-sm h-10 w-10 !p-0 ${view.wireframe ? "btn-primary" : "btn-glass"}`} title="Wireframe — see the stitches' mesh" aria-label="Wireframe">
            <ToolIcon name="wire" className="h-[18px] w-[18px]" />
          </button>
        </div>
      </nav>

      {/* ---------- sculpt brush settings (floating under the top bar) ---------- */}
      <AnimatePresence>
        {view.mode === "sculpt" && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="glass-sheet absolute left-1/2 top-16 z-20 flex w-[min(92vw,34rem)] -translate-x-1/2 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 md:left-20 md:top-20 md:w-[17.5rem] md:translate-x-0 md:flex-col md:items-stretch md:gap-y-3 md:p-4"
            aria-label="Brush settings"
          >
            {!sel && <p className="w-full text-center font-hand text-base text-rose-ink">Pick a part to sculpt it — click one on the table.</p>}
            <label className="flex items-center gap-2 text-xs font-semibold text-cocoa-soft">
              <span className="w-14">Size</span>
              <input type="range" min={0.05} max={1.5} step={0.01} value={view.brush.radius} onChange={(e) => setBrush({ radius: Number(e.target.value) })} className="w-24 flex-1 accent-rose" aria-label="Brush size" />
              <span className="w-12 text-right tabular-nums text-cocoa">{(view.brush.radius * UNIT_CM).toFixed(1)} cm</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-cocoa-soft">
              <span className="w-14">Strength</span>
              <input type="range" min={0.05} max={1} step={0.01} value={view.brush.strength} onChange={(e) => setBrush({ strength: Number(e.target.value) })} className="w-24 flex-1 accent-rose" aria-label="Brush strength" />
              <span className="w-12 text-right tabular-nums text-cocoa">{Math.round(view.brush.strength * 100)}</span>
            </label>
            <Segmented<Falloff> ariaLabel="Falloff" size="sm" options={FALLOFFS.map((f) => ({ value: f.id, label: f.label }))} value={view.brush.falloff} onChange={(falloff) => setBrush({ falloff })} />
            <div className="flex flex-wrap gap-2">
              <ToggleSwitch small label="Mirror X" checked={view.brush.symmetryX} onChange={(symmetryX) => setBrush({ symmetryX })} />
              <ToggleSwitch small label={view.brush.kind === "draw" ? "Carve in" : "Invert"} checked={view.brush.invert} onChange={(invert) => setBrush({ invert })} />
            </div>
            <p className="hidden w-full text-[11px] leading-relaxed text-cocoa-soft md:block">
              <b className="text-cocoa">{BRUSHES.find((b) => b.id === view.brush.kind)?.label}</b> · {BRUSHES.find((b) => b.id === view.brush.kind)?.hint}. Hold <kbd>Shift</kbd> to smooth, <kbd>Ctrl</kbd> to invert, <kbd>F</kbd> / <kbd>Shift+F</kbd> for size.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- right: properties ---------- */}
      <AnimatePresence>
        {rightOpen && (
          <motion.aside
            initial={reduce ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="glass-sheet absolute right-3 top-16 z-20 flex max-h-[min(24rem,calc(100dvh-19rem))] w-[min(92vw,20rem)] flex-col overflow-hidden md:top-20 md:max-h-[calc(100dvh-15rem)] lg:max-h-[calc(100dvh-6.5rem)]"
            aria-label="Properties"
            data-lenis-prevent
          >
            <div className="flex gap-1 border-b border-blush-deep/20 p-2">
              {(
                [
                  ["part", sel ? sel.name : "Part"],
                  ["parts", `Parts (${partCount})`],
                  ["piece", "Piece"],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" aria-pressed={panel === id} onClick={() => setPanel(id)} className={`flex-1 truncate rounded-full px-2.5 py-1 text-xs transition-all ${panel === id ? "bg-blush font-bold text-cocoa shadow-card" : "font-semibold text-cocoa-soft hover:text-rose-ink"}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="no-scrollbar flex-1 overflow-y-auto p-3">
              {panel === "part" && (sel ? <PartPanel part={sel} m={m} /> : <EmptyPart onAdd={() => setAddOpen(true)} />)}
              {panel === "parts" && <PartsList m={m} />}
              {panel === "piece" && <PiecePanel m={m} spec={spec} />}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ---------- bottom bar ---------- */}
      <footer className={`absolute inset-x-0 bottom-0 z-20 p-3 transition-[padding] duration-300 md:p-4 ${rightOpen ? "lg:pr-[21.5rem]" : ""}`}>
        <div className="glass-sheet mx-auto flex max-w-5xl flex-col gap-2.5 p-3 md:p-4">
          {/* phones: the tool rail lives here, thumb-reachable */}
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 md:hidden" role="toolbar" aria-label="Tools">
            <button type="button" onClick={() => setAddOpen((o) => !o)} aria-expanded={addOpen} className="btn btn-primary btn-sm shrink-0">
              + Add
            </button>
            {view.mode === "object"
              ? (["translate", "rotate", "scale"] as GizmoMode[]).map((g) => (
                  <button key={g} type="button" aria-pressed={view.gizmo === g} onClick={() => setView((v) => ({ ...v, gizmo: g }))} className={`btn btn-sm shrink-0 ${view.gizmo === g ? "btn-primary" : "btn-glass"}`}>
                    {g === "translate" ? "Move" : g === "rotate" ? "Rotate" : "Size"}
                  </button>
                ))
              : BRUSHES.map((b) => (
                  <button key={b.id} type="button" aria-pressed={view.brush.kind === b.id} onClick={() => setBrush({ kind: b.id })} className={`btn btn-sm shrink-0 ${view.brush.kind === b.id ? "btn-primary" : "btn-glass"}`}>
                    {b.label}
                  </button>
                ))}
            {sel && (
              <button type="button" onClick={() => m.removePart(sel.id)} className="btn btn-outline btn-sm shrink-0">
                Delete
              </button>
            )}
          </div>
          <AnimatePresence>
            {addOpen && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-5 gap-1 rounded-2xl bg-white/60 p-2 md:hidden" role="menu" aria-label="Add a shape">
                {PRIMITIVES.map((p) => (
                  <button key={p.kind} type="button" role="menuitem" onClick={() => { m.addPart(p.kind, sel); setAddOpen(false); }} className="flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-semibold text-cocoa hover:bg-blush-soft">
                    <PrimitiveIcon kind={p.kind} />
                    {p.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <p aria-live="polite" className="line-clamp-1 text-pretty font-hand text-base leading-snug text-cocoa md:line-clamp-2 md:text-xl">
            <span className="text-rose-ink">your piece:</span> {summary}
          </p>
          <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
            <div role="group" aria-label="History" className="flex shrink-0 gap-1">
              <button type="button" onClick={m.undo} disabled={!m.canUndo} className="btn btn-glass btn-sm disabled:opacity-40" title="Undo (Ctrl/⌘+Z)" aria-label="Undo">
                <ToolIcon name="undo" />
              </button>
              <button type="button" onClick={m.redo} disabled={!m.canRedo} className="btn btn-glass btn-sm disabled:opacity-40" title="Redo (Shift+Ctrl/⌘+Z)" aria-label="Redo">
                <ToolIcon name="redo" />
              </button>
            </div>
            <TemplateMenu onPick={(id) => { const t = MAKER_TEMPLATES.find((x) => x.id === id)!; m.loadDoc(structuredClone(t.doc), t.label); say(t.id === "blank" ? "A clean table" : `Started from ${t.label}`); }} />
            <span className="mx-1 hidden h-6 w-px bg-cocoa/15 md:block" />
            <button type="button" onClick={m.download} className="btn btn-glass btn-sm shrink-0" title="Download a .whimlet-maker.json you can reopen here or send to Whimlet">
              <ToolIcon name="save" /> Save file
            </button>
            <button type="button" onClick={() => fileInput.current?.click()} className="btn btn-glass btn-sm shrink-0" title="Open a saved .whimlet-maker.json (or drop it anywhere)">
              <ToolIcon name="open" /> Open
            </button>
            <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" aria-label="Open a Whimlet Maker file" tabIndex={-1} onChange={(e) => { openFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
            <button type="button" onClick={copyLink} className="btn btn-glass btn-sm shrink-0" title="Copy a link that reopens this design">
              <ToolIcon name="link" /> Copy link
            </button>
            {!phone && (
              <>
                <button type="button" onClick={snapshot} className="btn btn-glass btn-sm" title="Download a PNG of the table">
                  <ToolIcon name="camera" /> Snapshot
                </button>
                <button type="button" onClick={exportGlb} className="btn btn-outline btn-sm" title="Export a .glb — opens in Blender and AR viewers">
                  Export .glb
                </button>
              </>
            )}
            <a href={waLink(buildMakerMessage(m.doc, m.shareUrl))} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-md ml-auto hidden shrink-0 md:inline-flex">
              <WhatsAppGlyph className="h-4 w-4" /> Ask Whimlet to make it
            </a>
          </div>
          {/* phones: the conversion button never hides inside a scroll row */}
          <a href={waLink(buildMakerMessage(m.doc, m.shareUrl))} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-md w-full md:hidden">
            <WhatsAppGlyph className="h-4 w-4" /> Ask Whimlet to make it
          </a>
        </div>
      </footer>

      <AnimatePresence>
        {toast && (
          <motion.div key="toast" role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-none absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-full bg-cocoa px-4 py-2 text-sm font-semibold text-white shadow-lift md:top-20">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panels                                                               */
/* ------------------------------------------------------------------ */

type Api = ReturnType<typeof useMakerDoc>;

function EmptyPart({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="space-y-3 text-sm text-cocoa-soft">
      <p className="font-hand text-lg text-rose-ink">Nothing picked.</p>
      <p>Click a part on the table to edit it, or add a new shape.</p>
      <button type="button" onClick={onAdd} className="btn btn-primary btn-sm">
        + Add a shape
      </button>
      <ul className="hidden space-y-1 text-xs md:block">
        <li><kbd>Tab</kbd> arrange / sculpt</li>
        <li><kbd>G</kbd> <kbd>R</kbd> <kbd>S</kbd> move / rotate / size</li>
        <li><kbd>Shift+D</kbd> duplicate · <kbd>X</kbd> delete · <kbd>M</kbd> mirror</li>
        <li><kbd>1</kbd>–<kbd>0</kbd> add a shape by number</li>
      </ul>
    </div>
  );
}

function Num({ label, value, onCommit, step = 0.05, min = -20, max = 20, unit }: { label: string; value: number; onCommit: (v: number) => void; step?: number; min?: number; max?: number; unit?: string }) {
  const [text, setText] = useState(String(Math.round(value * 100) / 100));
  useEffect(() => setText(String(Math.round(value * 100) / 100)), [value]);
  const done = () => {
    const n = Number(text);
    if (Number.isFinite(n)) onCommit(Math.min(max, Math.max(min, n)));
    else setText(String(Math.round(value * 100) / 100));
  };
  return (
    <label className="flex items-center gap-1 text-[11px] font-semibold text-cocoa-soft">
      <span className="w-3">{label}</span>
      <input
        type="number"
        step={step}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={done}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-full rounded-lg border border-blush-deep/30 bg-white/70 px-1.5 py-1 text-xs tabular-nums text-cocoa focus:border-rose focus:outline-none"
        aria-label={`${label}${unit ? ` (${unit})` : ""}`}
      />
    </label>
  );
}

function PartPanel({ part, m }: { part: MakerPart; m: Api }) {
  const set = (patch: Partial<MakerPart>) => m.updatePart(part.id, patch);
  const deg = (r: number) => Math.round((r * 180) / Math.PI);
  const rad = (d: number) => (d * Math.PI) / 180;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <PrimitiveIcon kind={part.kind} />
        <input
          type="text"
          value={part.name}
          maxLength={NAME_MAX}
          onChange={(e) => m.preview(part.id, { name: e.target.value })}
          onBlur={(e) => set({ name: e.target.value.trim() || part.kind })}
          className="min-w-0 flex-1 rounded-full border border-blush-deep/30 bg-white/70 px-3 py-1 text-sm font-semibold text-cocoa focus:border-rose focus:outline-none"
          aria-label="Part name"
        />
      </div>

      <section>
        <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cocoa-soft">Position <span className="normal-case tracking-normal">(cm)</span></h3>
        <div className="grid grid-cols-3 gap-1.5">
          {(["X", "Y", "Z"] as const).map((ax, i) => (
            <Num key={ax} label={ax} value={part.position[i] * UNIT_CM} step={0.5} min={-100} max={100} unit="cm" onCommit={(v) => { const p = [...part.position] as [number, number, number]; p[i] = v / UNIT_CM; set({ position: p }); }} />
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cocoa-soft">Rotation <span className="normal-case tracking-normal">(°)</span></h3>
        <div className="grid grid-cols-3 gap-1.5">
          {(["X", "Y", "Z"] as const).map((ax, i) => (
            <Num key={ax} label={ax} value={deg(part.rotation[i])} step={5} min={-720} max={720} unit="degrees" onCommit={(v) => { const r = [...part.rotation] as [number, number, number]; r[i] = rad(v); set({ rotation: r }); }} />
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cocoa-soft">Size <span className="normal-case tracking-normal">(cm)</span></h3>
        <div className="grid grid-cols-3 gap-1.5">
          {(["W", "H", "D"] as const).map((ax, i) => (
            <Num key={ax} label={ax} value={part.scale[i] * UNIT_CM} step={0.5} min={0.25} max={40} unit="cm" onCommit={(v) => { const s = [...part.scale] as [number, number, number]; s[i] = v / UNIT_CM; set({ scale: s }); }} />
          ))}
        </div>
        <button type="button" onClick={() => { const u = (part.scale[0] + part.scale[1] + part.scale[2]) / 3; set({ scale: [u, u, u] }); }} className="mt-1.5 text-[11px] font-semibold text-rose-ink hover:underline">
          make it round again
        </button>
      </section>

      <section>
        <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cocoa-soft">Colour</h3>
        <Swatches compact ariaLabel="Part colour" options={MAKER_SWATCHES} value={part.color} onChange={(color) => set({ color: color.toUpperCase() })} />
      </section>
      <section>
        <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cocoa-soft">Yarn</h3>
        <Segmented<MakerFinish> ariaLabel="Yarn finish" size="sm" options={FINISHES.map((f) => ({ value: f.id, label: f.label, title: f.hint }))} value={part.finish} onChange={(finish) => set({ finish })} />
      </section>

      <section className="flex flex-wrap gap-2">
        <ToggleSwitch small label="Mirror across the middle" checked={part.mirror} onChange={(mirror) => set({ mirror })} />
        <ToggleSwitch small label="Visible" checked={part.visible} onChange={(visible) => set({ visible })} />
      </section>

      {part.sculpt && (
        <p className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-2 text-xs text-cocoa-soft">
          hand-sculpted
          <button type="button" onClick={() => set({ sculpt: null })} className="font-semibold text-rose-ink hover:underline">
            reset shape
          </button>
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={() => m.duplicatePart(part.id)} className="btn btn-glass btn-sm" title="Duplicate (Shift+D)">
          Duplicate
        </button>
        <button type="button" onClick={() => m.removePart(part.id)} className="btn btn-outline btn-sm" title="Delete (X)">
          Delete
        </button>
      </div>
    </div>
  );
}

function PartsList({ m }: { m: Api }) {
  if (!m.doc.parts.length) return <p className="font-hand text-lg text-rose-ink">No parts yet — add a shape.</p>;
  return (
    <ul className="space-y-1" aria-label="Parts">
      {m.doc.parts.map((p, i) => {
        const active = p.id === m.selectedId;
        return (
          <li key={p.id} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${active ? "bg-blush/80" : "bg-white/50 hover:bg-white/80"}`}>
            <button type="button" onClick={() => m.select(p.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-pressed={active}>
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/80" style={{ background: p.color }} aria-hidden="true" />
              <PrimitiveIcon kind={p.kind} />
              <span className={`truncate text-sm ${active ? "font-bold text-cocoa" : "font-semibold text-cocoa-soft"}`}>{p.name}</span>
              {p.mirror && <span className="rounded bg-white/70 px-1 text-[9px] font-bold uppercase text-cocoa-soft" title="mirrored">mir</span>}
              {p.sculpt && <span className="rounded bg-white/70 px-1 text-[9px] font-bold uppercase text-cocoa-soft" title="sculpted">scu</span>}
            </button>
            <button type="button" onClick={() => m.updatePart(p.id, { visible: !p.visible })} className="text-xs text-cocoa-soft hover:text-rose-ink" aria-label={p.visible ? `Hide ${p.name}` : `Show ${p.name}`} aria-pressed={!p.visible}>
              <span className={`inline-block h-3 w-3 rounded-full border-2 border-current ${p.visible ? "bg-current" : ""}`} />
            </button>
            <button type="button" onClick={() => m.reorderPart(p.id, -1)} disabled={i === 0} className="text-xs text-cocoa-soft hover:text-rose-ink disabled:opacity-30" aria-label={`Move ${p.name} up`}>
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true"><path d="m4 10 4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" onClick={() => m.reorderPart(p.id, 1)} disabled={i === m.doc.parts.length - 1} className="text-xs text-cocoa-soft hover:text-rose-ink disabled:opacity-30" aria-label={`Move ${p.name} down`}>
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PiecePanel({ m, spec }: { m: Api; spec: ReturnType<typeof estimateDoc> }) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-cocoa-soft">Name it</span>
        <input type="text" value={m.doc.name} maxLength={NAME_MAX} placeholder="e.g. Nana's bear" onChange={(e) => m.setMeta({ name: e.target.value })} className="mt-1 w-full rounded-full border border-blush-deep/30 bg-white/70 px-3 py-1.5 text-sm text-cocoa focus:border-rose focus:outline-none" />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-cocoa-soft">A note for the maker</span>
        <textarea value={m.doc.note} maxLength={NOTE_MAX} rows={3} placeholder="safety eyes please · a gift for a 5-year-old · needs a keyring" onChange={(e) => m.setMeta({ note: e.target.value })} className="mt-1 w-full rounded-2xl border border-blush-deep/30 bg-white/70 px-3 py-2 text-sm text-cocoa focus:border-rose focus:outline-none" />
        <span className="text-[10px] text-cocoa-soft">{m.doc.note.length}/{NOTE_MAX}</span>
      </label>
      <section>
        <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cocoa-soft">Rough numbers</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-cocoa-soft">size</dt>
          <dd className="tabular-nums text-cocoa">≈ {spec.sizeCm.map((v) => Math.round(v)).join(" × ")} cm</dd>
          <dt className="text-cocoa-soft">parts</dt>
          <dd className="text-cocoa">{spec.byKind.map((k) => `${k.count} ${k.label.toLowerCase()}${k.count === 1 ? "" : "s"}`).join(", ") || "—"}</dd>
          <dt className="text-cocoa-soft">surface</dt>
          <dd className="tabular-nums text-cocoa">≈ {Math.round(spec.areaCm2)} cm²</dd>
          <dt className="text-cocoa-soft">stitches</dt>
          <dd className="tabular-nums text-cocoa">≈ {spec.stitches.toLocaleString()}</dd>
          <dt className="text-cocoa-soft">yarn</dt>
          <dd className="tabular-nums text-cocoa">≈ {spec.yarnGrams} g DK</dd>
        </dl>
        <p className="mt-1 text-[10px] text-cocoa-soft">Estimates at ~3 single-crochet stitches per cm². Whimlet confirms on WhatsApp.</p>
      </section>
      <section>
        <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cocoa-soft">Colours</h3>
        <div className="flex flex-col gap-1.5">
          {spec.palette.map((c) => (
            <ColourChip key={c.hex} hex={c.hex} name={`${c.name} · ${c.count}`} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TemplateMenu({ onPick }: { onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="btn btn-outline btn-sm whitespace-nowrap">
        <SparkleDoodle className="h-4 w-4" /> Start from…
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-sheet absolute bottom-11 left-0 z-30 w-56 p-2" role="menu">
            {MAKER_TEMPLATES.map((t) => (
              <button key={t.id} type="button" role="menuitem" onClick={() => { onPick(t.id); setOpen(false); }} className="flex w-full flex-col rounded-xl px-2.5 py-1.5 text-left hover:bg-blush-soft">
                <span className="text-sm font-semibold text-cocoa">{t.label}</span>
                <span className="text-[11px] text-cocoa-soft">{t.hint}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Tool icons — inline SVG, because the site's fonts have no glyphs for
 *  ⟳ / ✥ / ⤢ and headless fonts render them as tofu. */
function ToolIcon({ name, className = "h-4 w-4" }: { name: "move" | "rotate" | "scale" | "grid" | "wire" | "undo" | "redo" | "turn" | "panel" | "camera" | "save" | "open" | "back" | "link"; className?: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const d: Record<string, React.ReactNode> = {
    move: <><path d="M8 1.5v13M1.5 8h13" {...p} /><path d="m5.5 4 2.5-2.5L10.5 4M5.5 12l2.5 2.5 2.5-2.5M4 5.5 1.5 8 4 10.5M12 5.5 14.5 8 12 10.5" {...p} /></>,
    rotate: <><path d="M13 8a5 5 0 1 1-1.6-3.7" {...p} /><path d="M13 2.5v3h-3" {...p} /></>,
    scale: <><path d="M9.5 2.5h4v4M13.5 2.5 8.5 7.5M6.5 13.5h-4v-4M2.5 13.5l5-5" {...p} /></>,
    grid: <><rect x="2" y="2" width="12" height="12" rx="1.5" {...p} /><path d="M2 6h12M2 10h12M6 2v12M10 2v12" {...p} /></>,
    wire: <><path d="M8 1.5 14 5v6l-6 3.5L2 11V5Z" {...p} /><path d="M8 1.5v13M2 5l6 3.5L14 5M2 11l6-2.5 6 2.5" {...p} /></>,
    undo: <><path d="M6 4 2.5 7.5 6 11" {...p} /><path d="M2.5 7.5H10a3.5 3.5 0 0 1 0 7H8" {...p} /></>,
    redo: <><path d="m10 4 3.5 3.5L10 11" {...p} /><path d="M13.5 7.5H6a3.5 3.5 0 0 0 0 7h2" {...p} /></>,
    turn: <><ellipse cx="8" cy="10.5" rx="6" ry="2.5" {...p} /><path d="M8 2.5v6M5.5 6 8 8.5 10.5 6" {...p} /></>,
    panel: <><rect x="2" y="2.5" width="12" height="11" rx="2" {...p} /><path d="M9.5 2.5v11M11 6h1.5M11 8.5h1.5" {...p} /></>,
    camera: <><rect x="1.5" y="4.5" width="13" height="9" rx="2" {...p} /><circle cx="8" cy="9" r="2.5" {...p} /><path d="M5.5 4.5 6.5 2.5h3l1 2" {...p} /></>,
    save: <><path d="M8 2v8M5 7l3 3 3-3" {...p} /><path d="M2.5 11v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" {...p} /></>,
    open: <><path d="M8 10V2M5 5l3-3 3 3" {...p} /><path d="M2.5 11v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" {...p} /></>,
    back: <path d="M10 3 5 8l5 5" {...p} />,
    link: <><path d="M6.5 9.5a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-1 1" {...p} /><path d="M9.5 6.5a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l1-1" {...p} /></>,
  };
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      {d[name]}
    </svg>
  );
}

/** Tiny line icons for the shape vocabulary. */
function PrimitiveIcon({ kind }: { kind: PrimitiveKind }) {
  const c = "h-4 w-4 shrink-0 text-rose-ink";
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "ball":
      return <svg viewBox="0 0 16 16" className={c} aria-hidden="true"><circle cx="8" cy="8" r="5.5" {...p} /></svg>;
    case "egg":
      return <svg viewBox="0 0 16 16" className={c} aria-hidden="true"><path d="M8 2.5c2.6 0 4.8 3.2 4.8 6.3A4.8 4.8 0 0 1 8 13.7a4.8 4.8 0 0 1-4.8-4.9C3.2 5.7 5.4 2.5 8 2.5Z" {...p} /></svg>;
    case "tube":
      return <svg viewBox="0 0 16 16" className={c} aria-hidden="true"><rect x="5" y="2.5" width="6" height="11" rx="3" {...p} /></svg>;
    case "cone":
      return <svg viewBox="0 0 16 16" className={c} aria-hidden="true"><path d="M8 2.5 12.5 12H3.5Z" {...p} /><ellipse cx="8" cy="12" rx="4.5" ry="1.4" {...p} /></svg>;
    case "ring":
      return <svg viewBox="0 0 16 16" className={c} aria-hidden="true"><circle cx="8" cy="8" r="5.5" {...p} /><circle cx="8" cy="8" r="2" {...p} /></svg>;
    case "heart":
      return <svg viewBox="0 0 16 16" className={c} aria-hidden="true"><path d="M8 13.5S2.5 10 2.5 6.2A2.9 2.9 0 0 1 8 4.8a2.9 2.9 0 0 1 5.5 1.4C13.5 10 8 13.5 8 13.5Z" {...p} /></svg>;
    case "petal":
      return <svg viewBox="0 0 16 16" className={c} aria-hidden="true"><path d="M8 2.5c3 2.5 4 5.5 2.5 9-1 1.6-4 1.6-5 0-1.5-3.5-.5-6.5 2.5-9Z" {...p} /></svg>;
    case "leaf":
      return <svg viewBox="0 0 16 16" className={c} aria-hidden="true"><path d="M3 13c0-6 4-10 10-10 0 6-4 10-10 10Z" {...p} /><path d="M3 13 11 5" {...p} /></svg>;
    case "cube":
      return <svg viewBox="0 0 16 16" className={c} aria-hidden="true"><rect x="3" y="3" width="10" height="10" rx="2" {...p} /></svg>;
    case "disc":
      return <svg viewBox="0 0 16 16" className={c} aria-hidden="true"><ellipse cx="8" cy="6.5" rx="5.5" ry="2.2" {...p} /><path d="M2.5 6.5v3c0 1.2 2.5 2.2 5.5 2.2s5.5-1 5.5-2.2v-3" {...p} /></svg>;
  }
}
