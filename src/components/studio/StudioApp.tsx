"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DESIGN_PRESETS, buildDesignMessage, describeDesign, estimateSpec, type DesignConfig } from "@/lib/design";
import { waLink } from "@/lib/whatsapp";
import { useIsMobile, useWebGL } from "@/lib/hooks";
import { HeartDoodle, PencilDoodle, RedoDoodle, RotateDoodle, SparkleDoodle, UndoDoodle, WhatsAppGlyph } from "../Decorations";
import { PetalSketch } from "../PetalSketch";
import { BACKDROPS, DEFAULT_VIEW, type BackdropId, type StudioView } from "../three/DesignScene";
import { PANELS, Panel, countOptions, type PanelId } from "./OptionPanels";
import { ColourChip } from "./controls";
import { useDesign } from "./useDesign";
import { useAuth } from "@/components/auth/AuthProvider";
import { MAX_SAVED_DESIGNS, saveDesign } from "@/lib/designs";

const DesignScene = dynamic(() => import("../three/DesignScene"), { ssr: false, loading: () => <SceneLoading /> });

function SceneLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_40%,#FFE6EE,#FFF4F7_70%)]">
      <span className="rounded-full bg-white/85 px-4 py-1.5 font-hand text-lg text-rose-ink">warming up the hooks…</span>
    </div>
  );
}

/**
 * The full-page 3D Design Studio (/studio).
 *
 * Layout: the 3D stage fills the page; a floating glass rail on the left
 * lists the option groups (each with its own camera framing), the active
 * group's controls open in a glass sheet beside it, and a slim bar along
 * the bottom carries the live description and the actions (undo / redo,
 * surprise, save file, open file, copy link, send to WhatsApp).
 * On phones the stage sits on top and the sheet becomes a bottom drawer.
 */
export function StudioApp() {
  const d = useDesign({ draft: true });
  const c = d.config;
  const webgl = useWebGL();
  const reduce = useReducedMotion();
  const auth = useAuth();
  const [panel, setPanel] = useState<PanelId | null>("piece");
  const [drawing, setDrawing] = useState(false);
  const [view, setView] = useState<StudioView>({ ...DEFAULT_VIEW, autoRotate: true });
  const [toast, setToast] = useState<string | null>(null);
  // the bottom bar wraps to a different height per viewport; the mobile tabs
  // and sheet are anchored above it via a measured CSS variable, not a guess
  const barRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [barH, setBarH] = useState(168);
  const [tabsH, setTabsH] = useState(44);
  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      setBarH(el.offsetHeight);
      setTabsH(tabsRef.current?.offsetHeight ?? 0);
    });
    ro.observe(el);
    if (tabsRef.current) ro.observe(tabsRef.current);
    return () => ro.disconnect();
  }, []);
  // The action bar folds to a slim strip (summary + send) so the piece gets
  // the screen back. Phones start folded — the stage is the point there;
  // desktops start open. The choice is remembered for the session.
  const [barOpen, setBarOpen] = useState(true);
  const barChosen = useRef(false);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem("whimlet-studio-bar");
    } catch {
      /* private mode */
    }
    if (saved === "open" || saved === "closed") {
      barChosen.current = true;
      setBarOpen(saved === "open");
    } else setBarOpen(!window.matchMedia("(max-width: 767px)").matches);
  }, []);
  const toggleBar = () => {
    barChosen.current = true;
    setBarOpen((o) => {
      try {
        sessionStorage.setItem("whimlet-studio-bar", o ? "closed" : "open");
      } catch {
        /* ignore */
      }
      return !o;
    });
  };
  const [saveName, setSaveName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const captureRef = useRef<(() => string | null) | null>(null);

  const say = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2400);
  }, []);

  const saveToMyDesigns = useCallback(async () => {
    if (!auth.user) {
      say("Sign in to save designs (up to " + MAX_SAVED_DESIGNS + ") ♥");
      return;
    }
    const r = await saveDesign(c, saveName);
    say(r.ok ? "Saved to your designs ♥" : r.error);
  }, [auth.user, c, saveName, say]);

  // the camera follows the open group
  const focus = useMemo(() => PANELS.find((p) => p.id === panel)?.focus ?? "all", [panel]);
  useEffect(() => setView((v) => ({ ...v, focus })), [focus]);
  // keep the piece out from under the sheet: right of it on desktop, above
  // the drawer on phones; centred again when the sheet is closed
  const phone = useIsMobile();
  const sheetOpen = !!panel || drawing;
  const sheetRef = useRef<HTMLElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // vertical: centre the piece in the band between the header and
      // whatever sits lowest on top of the stage — the open sheet / phone
      // tabs, else the bar. Measured, so folding the bar or opening a
      // group re-centres it (the Rig damps the move).
      const headerB = headerRef.current?.getBoundingClientRect().bottom ?? 64;
      const barT = barRef.current?.getBoundingClientRect().top ?? h;
      const sheetT = sheetRef.current?.getBoundingClientRect().top ?? null;
      const tabsT = tabsRef.current && getComputedStyle(tabsRef.current).display !== "none" ? tabsRef.current.getBoundingClientRect().top : null;
      const bandBottom = phone ? Math.min(barT, sheetT ?? Infinity, tabsT ?? Infinity) : barT;
      const band = Math.max(1, bandBottom - headerB);
      // the Rig backs the camera off by 1/fit; the shift then centres the
      // (smaller) piece in the band. On a phone with the sheet open the band
      // is too small for the whole piece — show the head, as before.
      const fit = Math.min(1, band / h);
      const up = h / 2 - (headerB + bandBottom) / 2; // px the piece must rise
      const sy = Math.min(phone && sheetOpen ? 0.42 : 0.6, Math.max(0, up / (h * 0.5)));
      // horizontal (desktop): centre in the band between the sheet and the
      // right-hand aside (measured, so it holds at 1000 px and 2560 px)
      let sx = 0;
      if (sheetOpen && !phone) {
        const sheetRight = sheetRef.current?.getBoundingClientRect().right ?? 0;
        const aside = asideRef.current;
        const asideW = aside && getComputedStyle(aside).display !== "none" ? w - aside.getBoundingClientRect().left : 0;
        sx = Math.min(0.6, Math.max(0, (sheetRight - asideW) / w));
      }
      const shift: [number, number] = [sx, sy];
      setView((v) =>
        Math.abs((v.shift?.[0] ?? 0) - shift[0]) < 0.005 && Math.abs((v.shift?.[1] ?? 0) - shift[1]) < 0.005 && Math.abs((v.fit ?? 1) - fit) < 0.01 ? v : { ...v, shift, fit }
      );
    };
    // the sheet mounts with an enter animation; measure after layout
    const id = requestAnimationFrame(compute);
    const t = setTimeout(compute, 400);
    window.addEventListener("resize", compute);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(t);
      window.removeEventListener("resize", compute);
    };
  }, [sheetOpen, phone, panel, drawing, barOpen, barH]);
  // a bouquet-only group closes when the piece becomes a single flower
  useEffect(() => {
    if (c.type !== "bouquet" && panel === "bouquet") setPanel("piece");
  }, [c.type, panel]);

  // keyboard: ⌘/Ctrl+Z undo, ⇧⌘Z redo, Esc closes the sheet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) d.redo();
        else d.undo();
      } else if (e.key === "Escape") {
        setDrawing(false);
        setPanel(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [d]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(d.designUrl);
      say("Link copied ♥");
    } catch {
      window.prompt("Copy your design link:", d.designUrl);
    }
  };

  const openFile = (file: File | undefined) => {
    if (!file) return;
    file.text().then((text) => {
      const err = d.openText(text);
      say(err ?? `Opened ${file.name}`);
    });
  };

  const snapshot = () => {
    const url = captureRef.current?.();
    if (!url) return say("Couldn't capture the preview");
    const a = document.createElement("a");
    a.href = url;
    a.download = "whimlet-design.png";
    a.click();
  };

  const summary = describeDesign(c);
  const spec = estimateSpec(c);
  const options = countOptions(c);
  const visiblePanels = PANELS.filter((p) => !p.bouquetOnly || c.type === "bouquet");

  return (
    <div
      className="studio-page relative min-h-[100dvh] overflow-hidden bg-[#FFE6EE] text-cocoa"
      style={{ "--bar-h": `${barH}px`, "--tabs-h": `${tabsH}px` } as React.CSSProperties}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        openFile(e.dataTransfer.files?.[0]);
      }}
    >
      {/* ---------- stage ---------- */}
      <div className="absolute inset-0">
        {webgl === false ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <p className="max-w-sm rounded-3xl bg-white/80 p-6 font-hand text-2xl text-rose-ink">3D preview unavailable on this device — every choice below still saves and sends.</p>
          </div>
        ) : (
          <DesignScene config={c} view={view} opaque className="!absolute inset-0 cursor-grab active:cursor-grabbing" captureRef={captureRef} />
        )}
      </div>

      {/* ---------- top bar ---------- */}
      <h1 className="sr-only">Whimlet 3D Design Studio</h1>
      <header ref={headerRef} className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 md:p-5">
        <div className="pointer-events-auto flex items-center gap-2">
          <Link href="/" className="btn btn-glass btn-sm" aria-label="Back to Whimlet">
            ← Whimlet
          </Link>
          <Link href="/maker" className="btn btn-glass btn-sm hidden sm:inline-flex" title="Free-form 3D: build anything from soft shapes">
            Maker →
          </Link>
          <span className="glass-pill hidden items-center gap-2 md:inline-flex">
            <SparkleDoodle className="h-3.5 w-3.5 text-rose-ink" />
            <span className="font-hand text-lg leading-none text-rose-ink" aria-hidden="true">3D Design Studio</span>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-cocoa-soft">{options} options live</span>
          </span>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <div role="group" aria-label="Backdrop" className="glass-pill flex items-center gap-1.5">
            {(Object.keys(BACKDROPS) as BackdropId[]).map((id) => (
              <button
                key={id}
                type="button"
                aria-label={`${BACKDROPS[id].label} backdrop`}
                aria-pressed={view.backdrop === id}
                title={BACKDROPS[id].label}
                onClick={() => setView((v) => ({ ...v, backdrop: id }))}
                className={`h-5 w-5 rounded-full border-2 transition-transform ${view.backdrop === id ? "scale-110 border-cocoa" : "border-white/80 hover:scale-105"}`}
                style={{ background: `linear-gradient(${BACKDROPS[id].top}, ${BACKDROPS[id].horizon})` }}
              />
            ))}
          </div>
          <button type="button" className="btn btn-glass btn-sm" aria-pressed={view.autoRotate} onClick={() => setView((v) => ({ ...v, autoRotate: !v.autoRotate }))}>
            <RotateDoodle className={`h-3.5 w-3.5 ${view.autoRotate ? "animate-[spin_6s_linear_infinite]" : ""}`} />
            {view.autoRotate ? "turning" : "still"}
          </button>
        </div>
      </header>

      {/* ---------- left rail: option groups ---------- */}
      <nav aria-label="Design options" className="absolute left-3 z-20 hidden -translate-y-1/2 md:block" style={{ top: "calc((100dvh - var(--bar-h) + 3.5rem) / 2)" }}>
        <ul className="glass-rail flex flex-col gap-1 p-1.5">
          {visiblePanels.map((p, i) => {
            const active = panel === p.id && !drawing;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setDrawing(false);
                    setPanel(active ? null : p.id);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-full py-2 pl-2 pr-4 text-left text-sm font-semibold transition-all ${active ? "bg-blush text-cocoa shadow-card" : "text-cocoa-soft hover:bg-white/50 hover:text-rose-ink"}`}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${active ? "bg-white text-rose-ink" : "bg-white/70 text-cocoa-soft"}`}>{i + 1}</span>
                  {p.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ---------- mobile group tabs ---------- */}
      <div ref={tabsRef} className="absolute inset-x-0 z-20 md:hidden" style={{ bottom: "calc(var(--bar-h) + 0.5rem)" }}>
        <div className="flex flex-wrap justify-center gap-1.5 px-3">
          {visiblePanels.map((p) => {
            const active = panel === p.id && !drawing;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setDrawing(false);
                  setPanel(active ? null : p.id);
                }}
                className={`btn btn-sm shrink-0 ${active ? "btn-primary" : "btn-glass"}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------- the sheet: active group's controls (or the sketch pad) ---------- */}
      <AnimatePresence mode="wait">
        {(panel || drawing) && (
          <motion.aside
            ref={sheetRef}
            key={drawing ? "draw" : panel}
            initial={reduce ? false : { opacity: 0, x: -14, y: 0, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -10, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            aria-label={drawing ? "Petal sketch pad" : PANELS.find((p) => p.id === panel)?.label}
            className="glass-sheet absolute inset-x-3 top-auto z-20 max-h-[42dvh] overflow-y-auto p-4 md:inset-x-auto md:left-[13.5rem] md:w-[26rem] md:p-5"
            style={{ bottom: phone ? "calc(var(--bar-h) + var(--tabs-h) + 1rem)" : "calc(var(--bar-h) + 0.75rem)", maxHeight: phone ? undefined : "calc(100dvh - var(--bar-h) - 5.5rem)" }}
            data-lenis-prevent
          >
            {drawing ? (
              <PetalSketch
                color={c.petalColor}
                centerColor={c.centerColor}
                petalCount={c.petalCount}
                initial={c.customPetal}
                onApply={(data) => {
                  d.set((x) => ({ ...x, petalShape: "custom", customPetal: data }));
                  setDrawing(false);
                  setPanel("bloom");
                }}
                onCancel={() => {
                  setDrawing(false);
                  setPanel("bloom");
                }}
              />
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-hand text-2xl text-rose-ink">{PANELS.find((p) => p.id === panel)?.label}</h2>
                  <button type="button" onClick={() => setPanel(null)} className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold text-cocoa-soft hover:text-rose-ink" aria-label="Close">
                    ✕
                  </button>
                </div>
                <Panel id={panel!} c={c} update={d.update} set={d.set} onDraw={() => setDrawing(true)} />
              </>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ---------- right: presets + palette ---------- */}
      <aside ref={asideRef} className="absolute right-3 top-16 z-10 hidden w-56 flex-col gap-3 lg:flex md:top-20">
        <div className="glass-sheet p-3">
          <p className="mb-2 font-hand text-lg text-rose-ink">start from</p>
          <div className="flex flex-wrap gap-1.5">
            {DESIGN_PRESETS.map((p) => (
              <button key={p.id} type="button" aria-pressed={d.activePreset === p.id} onClick={() => d.applyPreset(p.id)} className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${d.activePreset === p.id ? "bg-blush text-cocoa shadow-card" : "bg-white/70 text-cocoa-soft hover:text-rose-ink"}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="glass-sheet p-3">
          <p className="mb-2 font-hand text-lg text-rose-ink">your palette</p>
          <ul className="flex flex-col gap-1.5">
            {spec.palette.slice(0, 7).map((p) => (
              <li key={p.role + p.hex}>
                <ColourChip hex={p.hex} name={p.name} role={p.role} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-cocoa-soft">
            ≈ {spec.heightCm} × {spec.widthCm} cm · {spec.petalsTotal} petals
          </p>
        </div>
      </aside>

      {/* ---------- bottom bar (folds to a slim strip) ---------- */}
      <footer ref={barRef} className="absolute inset-x-0 bottom-0 z-20 p-3 md:p-4">
        <div className="glass-sheet mx-auto flex max-w-5xl flex-col gap-2.5 p-3 md:p-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleBar}
              aria-expanded={barOpen}
              aria-controls="studio-actions"
              className="btn btn-glass btn-sm shrink-0 !px-2.5"
              title={barOpen ? "Hide the actions — more room for the piece" : "Show the actions"}
            >
              <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 transition-transform duration-300 ${barOpen ? "" : "rotate-180"}`} aria-hidden="true">
                <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="sr-only">{barOpen ? "Hide actions" : "Show actions"}</span>
            </button>
            <p aria-live="polite" className={`min-w-0 flex-1 text-pretty font-hand leading-snug text-cocoa ${barOpen ? "line-clamp-1 text-base md:line-clamp-2 md:text-xl" : "truncate text-base md:text-lg"}`}>
              <span className="text-rose-ink">your design:</span> {summary}
            </p>
            {!barOpen && (
              <a href={waLink(buildDesignMessage(c, d.designUrl))} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm shrink-0" aria-label="Send to Whimlet">
                <WhatsAppGlyph className="h-5 w-5" strokeWidth={1.8} />
                <span className="hidden sm:inline">Send</span>
              </a>
            )}
          </div>
          <div id="studio-actions" hidden={!barOpen} className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="History" className="flex gap-1">
              <button type="button" onClick={d.undo} disabled={!d.canUndo} className="btn btn-glass btn-sm disabled:opacity-40" title="Undo (Ctrl/⌘+Z)" aria-label="Undo">
                <UndoDoodle className="h-4 w-4" />
              </button>
              <button type="button" onClick={d.redo} disabled={!d.canRedo} className="btn btn-glass btn-sm disabled:opacity-40" title="Redo (Shift+Ctrl/⌘+Z)" aria-label="Redo">
                <RedoDoodle className="h-4 w-4" />
              </button>
            </div>
            <button type="button" onClick={d.surprise} className="btn btn-outline btn-sm">
              <SparkleDoodle className="h-4 w-4" /> Surprise me
            </button>
            <button type="button" onClick={() => setDrawing(true)} className="btn btn-outline btn-sm">
              <PencilDoodle className="h-4 w-4" /> Draw a petal
            </button>
            <button type="button" onClick={d.reset} className="btn btn-glass btn-sm">
              ↺ Reset
            </button>
            <span className="mx-1 hidden h-6 w-px bg-cocoa/15 md:block" />
            <label className="hidden items-center gap-1.5 md:flex">
              <span className="sr-only">Design name</span>
              <input type="text" value={saveName} maxLength={40} placeholder="name it (optional)" onChange={(e) => setSaveName(e.target.value)} className="w-40 rounded-full border border-blush-deep/30 bg-white/70 px-3 py-1.5 text-xs text-cocoa placeholder:text-cocoa-soft/70 focus:border-rose focus:outline-none" />
            </label>
            <button type="button" onClick={() => { d.download(saveName); say("Saved your .whimlet.json ♥"); }} className="btn btn-glass btn-sm" title="Download a design file the maker can open">
              ⤓ Save file
            </button>
            <button type="button" onClick={saveToMyDesigns} className="btn btn-glass btn-sm" title="Save this design to your account (up to 5)">
              ♥ Save to my designs
            </button>
            <button type="button" onClick={() => fileInput.current?.click()} className="btn btn-glass btn-sm" title="Open a .whimlet.json file (or drop it anywhere)">
              ⤒ Open
            </button>
            <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" aria-label="Open a Whimlet design file" tabIndex={-1} onChange={(e) => { openFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
            <button type="button" onClick={snapshot} className="btn btn-glass btn-sm hidden md:inline-flex" title="Download a PNG of the preview">
              ◎ Snapshot
            </button>
            <button type="button" onClick={copyLink} className="btn btn-glass btn-sm">
              Copy link
            </button>
            <a href={waLink(buildDesignMessage(c, d.designUrl))} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm ml-auto md:btn-md">
              <WhatsAppGlyph className="h-5 w-5" strokeWidth={1.8} />
              Send to Whimlet
            </a>
          </div>
        </div>
      </footer>

      {/* ---------- toast ---------- */}
      <AnimatePresence>
        {toast && (
          <motion.div key="toast" role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-none absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-full bg-cocoa px-4 py-2 text-sm font-semibold text-white shadow-lift md:top-20">
            <HeartDoodle className="mr-1.5 inline h-3.5 w-3.5 text-blush" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export type { DesignConfig };
