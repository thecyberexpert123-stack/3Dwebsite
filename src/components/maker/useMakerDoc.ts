"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_DOC,
  MAKER_TEMPLATES,
  MAX_PARTS,
  decodeDoc,
  encodeDoc,
  makePart,
  makerFileName,
  parseMakerFile,
  toMakerFile,
  type MakerDoc,
  type MakerPart,
  type PrimitiveKind,
} from "@/lib/maker";

/**
 * The Maker document + history. One undo step per *committed* change:
 * gizmo drags and sculpt strokes commit on pointer-up, sliders commit on
 * change, numeric fields on blur/enter. Live previews (`preview`) never
 * touch history.
 *
 * Persistence: the current doc autosaves to localStorage so a refresh or
 * an accidental tab close does not lose the piece; `?m=` links and
 * `.whimlet-maker.json` files are the portable forms.
 */

const STORAGE_KEY = "whimlet:maker:draft";
const HISTORY_MAX = 80;

export function useMakerDoc() {
  const [doc, setDocState] = useState<MakerDoc>(EMPTY_DOC);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const past = useRef<MakerDoc[]>([]);
  const future = useRef<MakerDoc[]>([]);
  const [, bump] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [openedFrom, setOpenedFrom] = useState<string | null>(null);

  // hydrate: ?m= link wins, then the local draft, else the bear template
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("m");
    const fromLink = code ? decodeDoc(code) : null;
    if (fromLink) {
      setDocState(fromLink);
      setOpenedFrom("link");
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? parseMakerFile(raw) : null;
        if (parsed?.ok && parsed.file.doc.parts.length) {
          setDocState(parsed.file.doc);
          setOpenedFrom("draft");
        } else {
          setDocState(MAKER_TEMPLATES.find((t) => t.id === "bear")!.doc);
        }
      } catch {
        setDocState(MAKER_TEMPLATES.find((t) => t.id === "bear")!.doc);
      }
    }
    setHydrated(true);
  }, []);

  // autosave (debounced)
  useEffect(() => {
    if (!hydrated) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toMakerFile(doc)));
      } catch {
        /* quota / private mode — the file & link still work */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [doc, hydrated]);

  const commit = useCallback((next: MakerDoc | ((d: MakerDoc) => MakerDoc)) => {
    setDocState((cur) => {
      const n = typeof next === "function" ? next(cur) : next;
      if (n === cur) return cur;
      past.current.push(cur);
      if (past.current.length > HISTORY_MAX) past.current.shift();
      future.current = [];
      return n;
    });
    bump((x) => x + 1);
  }, []);

  /** live preview: replaces the doc without a history entry */
  const preview = useCallback((id: string, patch: Partial<MakerPart>) => {
    setDocState((cur) => ({ ...cur, parts: cur.parts.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }, []);

  const updatePart = useCallback(
    (id: string, patch: Partial<MakerPart>) => {
      commit((cur) => {
        // the gizmo previews before committing; collapse the preview into one step
        const base = past.current.length ? cur : cur;
        return { ...base, parts: base.parts.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
      });
    },
    [commit]
  );

  const addPart = useCallback(
    (kind: PrimitiveKind, near?: MakerPart | null) => {
      let created: MakerPart | null = null;
      commit((cur) => {
        if (cur.parts.length >= MAX_PARTS) return cur;
        const n = cur.parts.filter((p) => p.kind === kind).length;
        created = makePart(kind, {
          name: n ? `${makePart(kind).name} ${n + 1}` : undefined,
          position: near ? [near.position[0] + 0.6, near.position[1], near.position[2]] : [0, 0.5, 0],
          color: near?.color,
          finish: near?.finish,
        });
        return { ...cur, parts: [...cur.parts, created] };
      });
      if (created) setSelectedId((created as MakerPart).id);
      return created;
    },
    [commit]
  );

  const duplicatePart = useCallback(
    (id: string) => {
      let created: MakerPart | null = null;
      commit((cur) => {
        const src = cur.parts.find((p) => p.id === id);
        if (!src || cur.parts.length >= MAX_PARTS) return cur;
        created = { ...makePart(src.kind), ...src, id: makePart(src.kind).id, name: `${src.name} copy`, position: [src.position[0] + 0.4, src.position[1], src.position[2]] };
        const i = cur.parts.indexOf(src);
        const parts = [...cur.parts];
        parts.splice(i + 1, 0, created);
        return { ...cur, parts };
      });
      if (created) setSelectedId((created as MakerPart).id);
    },
    [commit]
  );

  const removePart = useCallback(
    (id: string) => {
      commit((cur) => ({ ...cur, parts: cur.parts.filter((p) => p.id !== id) }));
      setSelectedId((s) => (s === id ? null : s));
    },
    [commit]
  );

  const reorderPart = useCallback(
    (id: string, dir: -1 | 1) => {
      commit((cur) => {
        const i = cur.parts.findIndex((p) => p.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= cur.parts.length) return cur;
        const parts = [...cur.parts];
        [parts[i], parts[j]] = [parts[j], parts[i]];
        return { ...cur, parts };
      });
    },
    [commit]
  );

  const setMeta = useCallback((patch: Partial<Pick<MakerDoc, "name" | "note">>) => commit((cur) => ({ ...cur, ...patch })), [commit]);

  const loadDoc = useCallback(
    (d: MakerDoc, from: string) => {
      commit(d);
      setSelectedId(null);
      setOpenedFrom(from);
    },
    [commit]
  );

  const undo = useCallback(() => {
    setDocState((cur) => {
      const prev = past.current.pop();
      if (!prev) return cur;
      future.current.push(cur);
      return prev;
    });
    bump((x) => x + 1);
  }, []);
  const redo = useCallback(() => {
    setDocState((cur) => {
      const next = future.current.pop();
      if (!next) return cur;
      past.current.push(cur);
      return next;
    });
    bump((x) => x + 1);
  }, []);

  // keep the selection valid
  useEffect(() => {
    if (selectedId && !doc.parts.some((p) => p.id === selectedId)) setSelectedId(null);
  }, [doc.parts, selectedId]);

  /* ---------- share / file ---------- */
  const share = useMemo(() => encodeDoc(doc), [doc]);
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    const u = new URL(window.location.href);
    u.search = "";
    u.hash = "";
    u.searchParams.set("m", share.code);
    setShareUrl(u.toString());
  }, [share.code]);

  const download = useCallback(() => {
    const file = toMakerFile(doc);
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = makerFileName(doc);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [doc]);

  const openText = useCallback(
    (text: string, from: string): { ok: true; warnings: string[] } | { ok: false; error: string } => {
      const r = parseMakerFile(text);
      if (!r.ok) return r;
      loadDoc(r.file.doc, from);
      return { ok: true, warnings: r.warnings };
    },
    [loadDoc]
  );

  const selected = doc.parts.find((p) => p.id === selectedId) ?? null;

  return {
    doc,
    hydrated,
    openedFrom,
    selected,
    selectedId,
    select: setSelectedId,
    commit,
    preview,
    updatePart,
    addPart,
    duplicatePart,
    removePart,
    reorderPart,
    setMeta,
    loadDoc,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    share,
    shareUrl,
    download,
    openText,
  };
}

export type MakerDocApi = ReturnType<typeof useMakerDoc>;
