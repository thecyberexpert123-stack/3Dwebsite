"use client";

import * as THREE from "three";
import { detectTier } from "@/lib/quality";

/**
 * Whimlet material system — ONE finish vocabulary for every scene.
 *
 * Before this module each mesh carried its own matte MeshStandardMaterial,
 * so a crochet flower, a satin ribbon and a wooden hook were all the same
 * plaster. Real crochet is *fuzzy*: light catches the fibres at grazing
 * angles (that soft halo along the edge of a yarn ball) and the surface is
 * ridged with stitches. Satin is the opposite — a smooth, glossy skin.
 *
 * Finishes
 *  yarn   MeshPhysicalMaterial with `sheen` (three's Charlie fabric lobe —
 *         built for velvet/cloth) + a procedural knit bump map.
 *  satin  smooth + clearcoat — ribbons, bows, wraps.
 *  clay   the claymorphism body finish — soft, a hint of gloss.
 *  pearl  white, glossy clearcoat — bow knots, beads.
 *  wood   matte, warm — the crochet hook.
 *  paper  fully matte — the bouquet wrap.
 *
 * Cost control
 *  - `shared(finish, colour)` caches one material per (finish, colour, side)
 *    so hundreds of meshes reuse a handful of programs and uniforms.
 *  - On the low device tier every finish degrades to a plain
 *    MeshStandardMaterial without bump maps (cheapest fragment shader).
 *  - Shared materials are never disposed (they live for the session and are
 *    reused by every canvas); `create()` returns an owned instance for
 *    callers that lerp colours and dispose themselves.
 */

export type Finish = "yarn" | "satin" | "clay" | "pearl" | "wood" | "paper";

export type MaterialOptions = {
  side?: THREE.Side;
  /** render both faces with transparency (bouquet wrap uses this) */
  transparent?: boolean;
  opacity?: number;
};

/* ------------------------------------------------------------------
   Knit texture — a tiling field of interlocking "V" stitches, drawn once
   into a canvas. Used as a bump map, so it costs one 128² texture and no
   geometry. Deterministic (no Math.random) so every ball matches.
   ------------------------------------------------------------------ */

let knitTex: THREE.CanvasTexture | null = null;

function knitTexture(): THREE.CanvasTexture {
  if (knitTex) return knitTex;
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#808080"; // mid-grey = no displacement
  ctx.fillRect(0, 0, S, S);

  // stitch grid: columns of V's, rows offset by half a stitch
  const cols = 6;
  const rows = 8;
  const cw = S / cols;
  const rh = S / rows;
  ctx.lineCap = "round";
  for (let r = -1; r <= rows; r++) {
    for (let col = -1; col <= cols; col++) {
      const x = col * cw + (r % 2 ? cw / 2 : 0);
      const y = r * rh;
      // highlight arm (left leg of the V) — lighter = raised
      ctx.strokeStyle = "#b4b4b4";
      ctx.lineWidth = cw * 0.26;
      ctx.beginPath();
      ctx.moveTo(x + cw * 0.12, y + rh * 0.1);
      ctx.quadraticCurveTo(x + cw * 0.34, y + rh * 0.5, x + cw * 0.5, y + rh * 0.86);
      ctx.stroke();
      // shadow arm (right leg) — darker = recessed groove beside it
      ctx.strokeStyle = "#5a5a5a";
      ctx.beginPath();
      ctx.moveTo(x + cw * 0.88, y + rh * 0.1);
      ctx.quadraticCurveTo(x + cw * 0.66, y + rh * 0.5, x + cw * 0.5, y + rh * 0.86);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.anisotropy = 2;
  knitTex = tex;
  return tex;
}

/* ------------------------------------------------------------------
   Factory
   ------------------------------------------------------------------ */

function isSimple(): boolean {
  return typeof window !== "undefined" && detectTier() === "low";
}

/** A lighter, slightly desaturated tint of the base colour — the fibre halo. */
function sheenTint(color: THREE.Color): THREE.Color {
  return color.clone().lerp(WHITE, 0.45);
}

/** Owned instance — caller disposes. */
export function create(finish: Finish, color: THREE.ColorRepresentation, opts: MaterialOptions = {}): THREE.MeshStandardMaterial {
  const base = new THREE.Color(color);
  const common = {
    color: base,
    side: opts.side ?? THREE.FrontSide,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
  };

  if (isSimple()) {
    // cheapest shader that still keeps the finish hierarchy readable
    const rough: Record<Finish, number> = { yarn: 0.85, satin: 0.35, clay: 0.55, pearl: 0.25, wood: 0.7, paper: 0.95 };
    return new THREE.MeshStandardMaterial({ ...common, roughness: rough[finish], metalness: 0 });
  }

  switch (finish) {
    case "yarn": {
      const m = new THREE.MeshPhysicalMaterial({
        ...common,
        roughness: 0.82,
        metalness: 0,
        sheen: 0.9,
        sheenRoughness: 0.55,
        sheenColor: sheenTint(base),
        bumpMap: knitTexture(),
        // subtle: the knit should read as texture in the highlights, not as
        // craters — 0.35 made every petal look like crumpled foil
        bumpScale: 0.12,
        envMapIntensity: 0.6,
      });
      return m;
    }
    case "satin":
      return new THREE.MeshPhysicalMaterial({
        ...common,
        roughness: 0.38,
        metalness: 0,
        clearcoat: 0.6,
        clearcoatRoughness: 0.3,
        sheen: 0.35,
        sheenRoughness: 0.35,
        sheenColor: sheenTint(base),
        envMapIntensity: 0.9,
      });
    case "clay":
      return new THREE.MeshPhysicalMaterial({
        ...common,
        roughness: 0.5,
        metalness: 0,
        clearcoat: 0.28,
        clearcoatRoughness: 0.55,
        envMapIntensity: 0.7,
      });
    case "pearl":
      return new THREE.MeshPhysicalMaterial({
        ...common,
        roughness: 0.22,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        envMapIntensity: 1.2,
      });
    case "wood":
      return new THREE.MeshStandardMaterial({ ...common, roughness: 0.68, metalness: 0 });
    case "paper":
    default:
      return new THREE.MeshStandardMaterial({ ...common, roughness: 0.95, metalness: 0 });
  }
}

/** Keep a yarn/satin material's fibre halo in step with a colour that is
 *  being lerped at runtime (the design studio). No-op for plain materials. */
export function syncSheen(m: THREE.MeshStandardMaterial): void {
  const pm = m as THREE.MeshPhysicalMaterial;
  if (pm.sheen && pm.sheen > 0) pm.sheenColor.copy(m.color).lerp(WHITE, 0.45);
}

const WHITE = new THREE.Color("#FFFFFF");

const cache = new Map<string, THREE.MeshStandardMaterial>();

/** Cached instance shared by every mesh that asks for the same finish+colour. */
export function shared(finish: Finish, color: THREE.ColorRepresentation, opts: MaterialOptions = {}): THREE.MeshStandardMaterial {
  const key = `${finish}|${new THREE.Color(color).getHexString()}|${opts.side ?? 0}|${opts.transparent ? 1 : 0}|${opts.opacity ?? 1}|${isSimple() ? "s" : "f"}`;
  let m = cache.get(key);
  if (!m) {
    m = create(finish, color, opts);
    cache.set(key, m);
  }
  return m;
}
