"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_DESIGN,
  DESIGN_PRESETS,
  decodeDesign,
  designFileName,
  encodeDesign,
  parseDesignFile,
  randomDesign,
  sanitizeDesign,
  toDesignFile,
  type DesignConfig,
} from "@/lib/design";

const DRAFT_KEY = "whimlet.studio.draft.v2";

/**
 * One source of truth for a design being edited: the config, its undo/redo
 * history, the matching preset (if any), the share link, and file I/O.
 * Used by the homepage teaser (light) and the full-page studio (all of it).
 */
export function useDesign(opts: { studioPath?: string; draft?: boolean } = {}) {
  const { studioPath = "/studio", draft = false } = opts;
  const [config, setConfigRaw] = useState<DesignConfig>(DEFAULT_DESIGN);
  const [past, setPast] = useState<DesignConfig[]>([]);
  const [future, setFuture] = useState<DesignConfig[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const skipDraft = useRef(false);

  // hydrate from ?design=… (a share link) or the local draft, once
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("design");
    const fromLink = code ? decodeDesign(code) : null;
    if (fromLink) {
      setConfigRaw(fromLink);
    } else if (draft) {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) setConfigRaw(sanitizeDesign(JSON.parse(saved)));
      } catch {
        /* ignore */
      }
    }
    setHydrated(true);
  }, [draft]);

  // keep the draft (full studio only) — a refresh should never lose work
  useEffect(() => {
    if (!draft || !hydrated || skipDraft.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(config));
    } catch {
      /* quota / private mode */
    }
  }, [config, draft, hydrated]);

  const commit = useCallback((next: DesignConfig | ((c: DesignConfig) => DesignConfig)) => {
    setConfigRaw((c) => {
      const n = sanitizeDesign(typeof next === "function" ? next(c) : next);
      if (JSON.stringify(n) === JSON.stringify(c)) return c;
      setPast((p) => [...p.slice(-39), c]);
      setFuture([]);
      return n;
    });
  }, []);

  const update = useCallback(
    <K extends keyof DesignConfig>(key: K, value: DesignConfig[K]) => commit((c) => ({ ...c, [key]: value })),
    [commit]
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setConfigRaw((c) => {
        setFuture((f) => [c, ...f].slice(0, 40));
        return prev;
      });
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setConfigRaw((c) => {
        setPast((p) => [...p, c].slice(-40));
        return next;
      });
      return f.slice(1);
    });
  }, []);

  const activePreset = useMemo(() => {
    const json = JSON.stringify(config);
    return DESIGN_PRESETS.find((p) => JSON.stringify(p.config) === json)?.id ?? null;
  }, [config]);

  const applyPreset = useCallback(
    (id: string) => {
      const p = DESIGN_PRESETS.find((x) => x.id === id);
      if (p) commit(p.config);
    },
    [commit]
  );

  const surprise = useCallback(() => commit(randomDesign()), [commit]);
  const reset = useCallback(() => commit(DEFAULT_DESIGN), [commit]);

  // share link — computed after mount so SSR and first client render agree
  const [designUrl, setDesignUrl] = useState("");
  useEffect(() => {
    const u = new URL(window.location.origin + studioPath);
    u.searchParams.set("design", encodeDesign(config));
    setDesignUrl(u.toString());
  }, [config, studioPath]);

  const download = useCallback(
    (name?: string) => {
      const file = toDesignFile(config, name);
      const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = designFileName(config, name);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    [config]
  );

  const openText = useCallback(
    (text: string): string | null => {
      const r = parseDesignFile(text);
      if (!r.ok) return r.error;
      commit(r.file.config);
      return null;
    },
    [commit]
  );

  return {
    config,
    hydrated,
    set: commit,
    update,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    activePreset,
    applyPreset,
    surprise,
    reset,
    designUrl,
    download,
    openText,
  };
}

export type DesignStore = ReturnType<typeof useDesign>;
