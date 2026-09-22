#!/usr/bin/env node
/**
 * Domain tests for the Whimlet Maker — pure, no browser:
 * - src/lib/sculpt.ts  (brush falloff, dabs, grab, offset codec, area)
 * - src/lib/maker.ts   (document, sanitiser, link/file round-trips, estimates, templates)
 *
 * Run: npm run test:maker
 */
import { createRequire } from "node:module";
import { resolve } from "node:path";

const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: node scripts/maker-tests.mjs <compiled-out-dir>");
  process.exit(2);
}
const require = createRequire(import.meta.url);
const s = require(resolve(outDir, "sculpt.js"));
const m = require(resolve(outDir, "maker.js"));

let pass = 0;
let fail = 0;
const check = (name, cond) => {
  if (cond) pass++;
  else {
    fail++;
    console.error("  ✗ FAIL:", name);
  }
};
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

/* ---------- a tiny test mesh: a unit-ish sphere from lat/long ---------- */
function sphere(rings = 12, segs = 16, r = 0.5) {
  const pos = [];
  const nrm = [];
  const idx = [];
  for (let i = 0; i <= rings; i++) {
    const v = i / rings;
    const th = v * Math.PI;
    for (let j = 0; j <= segs; j++) {
      const u = j / segs;
      const ph = u * Math.PI * 2;
      const x = -Math.cos(ph) * Math.sin(th);
      const y = Math.cos(th);
      const z = Math.sin(ph) * Math.sin(th);
      pos.push(x * r, y * r, z * r);
      nrm.push(x, y, z);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j;
      const b = a + segs + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { pos: Float32Array.from(pos), nrm: Float32Array.from(nrm), idx, count: pos.length / 3 };
}

/* ---------- falloff ---------- */
check("falloff: centre is 1, edge is 0", s.falloffWeight(0, "smooth") === 1 && s.falloffWeight(1, "smooth") === 0);
check("falloff: smooth is monotone", [0.1, 0.3, 0.5, 0.7, 0.9].every((t, i, a) => i === 0 || s.falloffWeight(t, "smooth") < s.falloffWeight(a[i - 1], "smooth")));
check("falloff: constant is flat inside", s.falloffWeight(0.5, "constant") === 1 && s.falloffWeight(0.99, "constant") === 1);
check("falloff: sharp < linear < smooth at mid", s.falloffWeight(0.5, "sharp") < s.falloffWeight(0.5, "linear") && s.falloffWeight(0.5, "linear") < s.falloffWeight(0.5, "smooth"));

/* ---------- adjacency ---------- */
{
  const sp = sphere(4, 6);
  const adj = s.buildAdjacency(sp.idx, sp.count);
  check("adjacency: every used vertex has ≥ 2 neighbours", adj.filter((a) => a.length > 0).every((a) => a.length >= 2));
  check("adjacency: symmetric", adj.every((nb, i) => Array.from(nb).every((j) => Array.from(adj[j]).includes(i))));
}

/* ---------- draw dab ---------- */
{
  const sp = sphere();
  const before = Float32Array.from(sp.pos);
  const params = { kind: "draw", radius: 0.25, strength: 1, falloff: "smooth", invert: false, symmetryX: false };
  const top = [0, 0.5, 0];
  const moved = s.applyDab(sp.pos, sp.nrm, null, sp.count, params, { point: top, normal: [0, 1, 0] });
  check("draw: moves some vertices", moved > 0 && moved < sp.count);
  let maxUp = 0;
  let anyDown = false;
  let farMoved = false;
  for (let i = 0; i < sp.count; i++) {
    const dy = sp.pos[i * 3 + 1] - before[i * 3 + 1];
    maxUp = Math.max(maxUp, dy);
    if (dy < -1e-9) anyDown = true;
    const d = Math.hypot(before[i * 3] - top[0], before[i * 3 + 1] - top[1], before[i * 3 + 2] - top[2]);
    if (d >= 0.25 && Math.abs(dy) > 1e-9) farMoved = true;
  }
  check("draw: pushes out along the area normal (up), never down", maxUp > 0 && !anyDown);
  check("draw: nothing outside the radius moved", !farMoved);
  check("draw: one dab ≤ 12 % of radius", maxUp <= 0.25 * 0.12 + 1e-9);
  // inverted carves in
  const sp2 = sphere();
  s.applyDab(sp2.pos, sp2.nrm, null, sp2.count, { ...params, invert: true }, { point: top, normal: [0, 1, 0] });
  const topIdx = 0; // first ring is the pole
  check("draw inverted: carves in", sp2.pos[topIdx * 3 + 1] < 0.5 - 1e-6);
}

/* ---------- symmetry ---------- */
{
  const sp = sphere();
  const params = { kind: "inflate", radius: 0.3, strength: 1, falloff: "smooth", invert: false, symmetryX: true };
  s.applyDab(sp.pos, sp.nrm, null, sp.count, params, { point: [0.5, 0, 0], normal: [1, 0, 0] });
  let maxX = -Infinity;
  let minX = Infinity;
  for (let i = 0; i < sp.count; i++) {
    maxX = Math.max(maxX, sp.pos[i * 3]);
    minX = Math.min(minX, sp.pos[i * 3]);
  }
  check("symmetry X: the mirrored side inflates too", maxX > 0.5 + 1e-4 && near(maxX, -minX, 1e-3));
}

/* ---------- smooth ---------- */
{
  const sp = sphere();
  const adj = s.buildAdjacency(sp.idx, sp.count);
  // spike one vertex
  sp.pos[1] += 0.3;
  const spikeBefore = sp.pos[1];
  s.applyDab(sp.pos, sp.nrm, adj, sp.count, { kind: "smooth", radius: 0.4, strength: 1, falloff: "smooth", invert: false, symmetryX: false }, { point: [0, 0.8, 0], normal: [0, 1, 0] });
  check("smooth: pulls a spike back towards its neighbours", sp.pos[1] < spikeBefore - 1e-4);
}

/* ---------- flatten ---------- */
{
  const sp = sphere();
  const params = { kind: "flatten", radius: 0.3, strength: 1, falloff: "constant", invert: false, symmetryX: false };
  const spread = () => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < sp.count; i++) {
      const d = Math.hypot(sp.pos[i * 3], sp.pos[i * 3 + 1] - 0.5, sp.pos[i * 3 + 2]);
      if (d < 0.3) {
        lo = Math.min(lo, sp.pos[i * 3 + 1]);
        hi = Math.max(hi, sp.pos[i * 3 + 1]);
      }
    }
    return hi - lo;
  };
  const before = spread();
  for (let k = 0; k < 6; k++) s.applyDab(sp.pos, sp.nrm, null, sp.count, params, { point: [0, 0.5, 0], normal: [0, 1, 0] });
  check("flatten: reduces height variation under the brush", spread() < before * 0.6);
}

/* ---------- grab ---------- */
{
  const sp = sphere();
  const params = { kind: "grab", radius: 0.3, strength: 1, falloff: "smooth", invert: false, symmetryX: false };
  const g = s.beginGrab(sp.pos, sp.count, params, [0, 0.5, 0]);
  check("grab: captures a patch", g.idx.length > 0 && g.start.length === g.idx.length * 3 && g.mirror === null);
  s.applyGrab(sp.pos, g, [0.2, 0.1, 0]);
  const pole = g.idx.indexOf(0);
  check("grab: pole vertex follows the pointer fully (weight 1)", pole >= 0 && near(sp.pos[0], 0.2, 1e-6) && near(sp.pos[1], 0.6, 1e-6));
  s.applyGrab(sp.pos, g, [0, 0, 0]);
  check("grab: dragging back to zero restores the start", near(sp.pos[0], 0) && near(sp.pos[1], 0.5));
  const spm = sphere();
  const gm = s.beginGrab(spm.pos, spm.count, { ...params, symmetryX: true }, [0.5, 0, 0]);
  // a lat/long sphere has a duplicated seam column at +X, so the two sets differ by the seam only
  check("grab: symmetric capture has a mirror set", gm.mirror && gm.mirror.idx.length > 0 && Math.abs(gm.mirror.idx.length - gm.idx.length) <= 6);
}

/* ---------- offsets codec ---------- */
{
  const off = new Float32Array(30);
  check("encodeOffsets: untouched → null", s.encodeOffsets(off, 10) === null);
  off[4] = 0.123;
  off[17] = -0.05;
  const enc = s.encodeOffsets(off, 10);
  check("encodeOffsets: shape", enc && enc.count === 10 && near(enc.scale, 0.123) && typeof enc.data === "string");
  const dec = s.decodeOffsets(enc, 10);
  check("decodeOffsets: round-trip within quantisation error", dec && near(dec[4], 0.123, 0.123 / 32767 + 1e-9) && near(dec[17], -0.05, 0.123 / 32767 + 1e-9) && dec[0] === 0);
  check("decodeOffsets: rejects a vertex-count mismatch", s.decodeOffsets(enc, 11) === null);
  check("decodeOffsets: rejects garbage", s.decodeOffsets({ count: 10, scale: 1, data: "@@@" }, 10) === null && s.decodeOffsets({ count: 10, scale: 1, data: "AAAA" }, 10) === null);
  // sparse: two touched vertices → 2 records × 8 bytes → 16 bytes → 24 base64 chars
  check("encodeOffsets: sparse (only touched vertices stored)", enc.data.length === 24);
  check("decodeOffsets: rejects out-of-range vertex index", s.decodeOffsets({ count: 4, scale: 1, data: btoa(String.fromCharCode(9, 0, 1, 0, 1, 0, 1, 0)) }, 4) === null);
}

/* ---------- area ---------- */
{
  const sp = sphere(24, 32);
  const a = s.surfaceArea(sp.pos, sp.idx, sp.count, [1, 1, 1]);
  check("surfaceArea: unit sphere r 0.5 ≈ π", near(a, Math.PI, 0.03));
  const a2 = s.surfaceArea(sp.pos, sp.idx, sp.count, [2, 2, 2]);
  check("surfaceArea: scales with the square of scale", near(a2, a * 4, 1e-6));
}

/* ======================= maker.ts ======================= */

check("templates: all have valid parts", m.MAKER_TEMPLATES.every((t) => m.sanitizeDoc(t.doc).parts.length === t.doc.parts.length));
check("templates: bear has mirrored limbs", m.MAKER_TEMPLATES.find((t) => t.id === "bear").doc.parts.filter((p) => p.mirror).length >= 3);
check("templates: unique part ids", m.MAKER_TEMPLATES.every((t) => new Set(t.doc.parts.map((p) => p.id)).size === t.doc.parts.length));

/* ---------- makePart / sanitise ---------- */
{
  const p = m.makePart("tube");
  check("makePart: defaults", p.kind === "tube" && p.name === "Tube" && p.scale.join() === "1,1,1" && p.visible && !p.mirror && p.sculpt === null);
  const bad = m.sanitizePart({ kind: "dragon" }, 0, []);
  check("sanitizePart: unknown kind dropped", bad === null);
  const w = [];
  const fixed = m.sanitizePart({ kind: "ball", position: [999, "x", -999], scale: [0, 100, 1], color: "red", finish: "gold", name: "  a\tb  ", rotation: [1, 2, 3] }, 0, w);
  check("sanitizePart: clamps and defaults", fixed.position.join() === "20,0.5,-20" && fixed.scale.join() === "0.05,8,1" && fixed.color === "#F2B9C9" && fixed.finish === "cotton" && fixed.name === "a b");
  const doc = m.sanitizeDoc({ name: "x".repeat(100), parts: Array.from({ length: 50 }, () => ({ kind: "ball" })) }, w);
  check("sanitizeDoc: caps parts and name", doc.parts.length === m.MAX_PARTS && doc.name.length === m.NAME_MAX && w.some((x) => /first 40/.test(x)));
  const dup = m.sanitizeDoc({ parts: [{ kind: "ball", id: "same" }, { kind: "cube", id: "same" }] });
  check("sanitizeDoc: de-duplicates ids", dup.parts[0].id !== dup.parts[1].id);
  const badSculpt = m.sanitizePart({ kind: "ball", sculpt: { count: 5, scale: 1, data: "not base64!!" } }, 0, w);
  check("sanitizePart: invalid sculpt dropped with a warning", badSculpt.sculpt === null && w.some((x) => /sculpt/.test(x)));
}

/* ---------- link round-trip ---------- */
{
  const bear = m.MAKER_TEMPLATES.find((t) => t.id === "bear").doc;
  const { code, sculptDropped } = m.encodeDoc(bear);
  check("encodeDoc: url-safe, compact", /^[A-Za-z0-9_-]+$/.test(code) && code.length < 1500 && !sculptDropped);
  const back = m.decodeDoc(code);
  check("decodeDoc: round-trips the bear", back && back.name === "Little Bear" && back.parts.length === bear.parts.length && back.parts.every((p, i) => p.kind === bear.parts[i].kind && p.mirror === bear.parts[i].mirror && p.color === bear.parts[i].color && p.finish === bear.parts[i].finish));
  check("decodeDoc: positions survive to 3 dp", back.parts.every((p, i) => p.position.every((v, k) => near(v, bear.parts[i].position[k], 0.0006))));
  check("decodeDoc: garbage → null", m.decodeDoc("!!!") === null && m.decodeDoc("") === null && m.decodeDoc(btoa("[1,2]")) !== undefined);
  // sculpt in a link: a small sculpted part (few vertices) fits, real meshes do not
  // a realistic dab: ~60 of 757 vertices moved → fits in a link
  const small = new Float32Array(757 * 3);
  for (let i = 0; i < 60; i++) small[i * 3 + 1] = 0.02 + i * 0.0005;
  const withSculpt = { ...bear, parts: bear.parts.map((p, i) => (i === 0 ? { ...p, sculpt: s.encodeOffsets(small, 757) } : p)) };
  const enc1 = m.encodeDoc(withSculpt);
  check("encodeDoc: a typical sculpt fits in a link", !enc1.sculptDropped && m.decodeDoc(enc1.code).parts[0].sculpt !== null && m.decodeDoc(enc1.code).parts[0].sculpt.count === 757);
  // every vertex of every part reworked → too big → dropped
  const off = new Float32Array(2001 * 3);
  for (let i = 0; i < off.length; i++) off[i] = 0.01 + (i % 7) * 0.001;
  const big = { ...bear, parts: bear.parts.map((p) => ({ ...p, sculpt: s.encodeOffsets(off, 2001) })) };
  const enc2 = m.encodeDoc(big);
  check("encodeDoc: too much sculpt → dropped from the link, flagged", enc2.sculptDropped && enc2.code.length <= m.SHARE_LINK_MAX && m.decodeDoc(enc2.code).parts.every((p) => p.sculpt === null));
}

/* ---------- file round-trip ---------- */
{
  const bunny = m.MAKER_TEMPLATES.find((t) => t.id === "bunny").doc;
  const file = m.toMakerFile(bunny, new Date("2026-09-22T10:00:00Z"));
  check("toMakerFile: envelope", file.format === "whimlet-maker" && file.version === 1 && file.createdAt === "2026-09-22T10:00:00.000Z" && /Bunny/.test(file.summary));
  const parsed = m.parseMakerFile(JSON.stringify(file));
  check("parseMakerFile: round-trips", parsed.ok && parsed.file.doc.parts.length === bunny.parts.length && parsed.warnings.length === 0);
  check("parseMakerFile: rejects wrong format", !m.parseMakerFile(JSON.stringify({ format: "whimlet-design", doc: {} })).ok);
  check("parseMakerFile: rejects bad JSON", !m.parseMakerFile("{nope").ok);
  check("parseMakerFile: rejects oversized", /large/.test(m.parseMakerFile("{" + " ".repeat(m.MAKER_FILE_MAX_BYTES) + "}").error));
  const newer = m.parseMakerFile(JSON.stringify({ ...file, version: 9 }));
  check("parseMakerFile: newer version warns, still opens", newer.ok && newer.warnings.some((w) => /newer/.test(w)));
  const link = m.parseMakerFile("https://example.com/maker?m=" + m.encodeDoc(bunny).code);
  check("parseMakerFile: accepts a share link", link.ok && link.file.doc.parts.length === bunny.parts.length);
  check("makerFileName: slug", m.makerFileName(bunny) === "bunny.whimlet-maker.json" && m.makerFileName(m.EMPTY_DOC).endsWith(".whimlet-maker.json"));
}

/* ---------- estimates & description ---------- */
{
  const bear = m.MAKER_TEMPLATES.find((t) => t.id === "bear").doc;
  const spec = m.estimateDoc(bear);
  check("estimateDoc: counts mirrored parts twice", spec.byKind.find((k) => k.kind === "ball").count === 8);
  check("estimateDoc: plausible size for a bear (cm)", spec.sizeCm[1] > 8 && spec.sizeCm[1] < 20);
  check("estimateDoc: yarn grams positive and sane", spec.yarnGrams >= 5 && spec.yarnGrams <= 200);
  check("estimateDoc: palette names known colours", spec.palette[0].name === "caramel");
  const one = m.estimateDoc({ name: "", note: "", parts: [m.makePart("ball")] });
  check("estimateDoc: one 5 cm ball ≈ 78 cm² → ~4 g", near(one.areaCm2, 3.14 * 25, 1) && one.yarnGrams === 4);
  const desc = m.describeDoc(bear);
  check("describeDoc: mentions name, parts, size, yarn", /Little Bear/.test(desc) && /parts/.test(desc) && /cm/.test(desc) && /g of yarn/.test(desc));
  check("describeDoc: empty", /empty/.test(m.describeDoc(m.EMPTY_DOC)));
  const msg = m.buildMakerMessage(bear, "https://x/maker?m=abc");
  check("buildMakerMessage: has link", /https:\/\/x\/maker\?m=abc/.test(msg) && /quote/.test(msg));
}

console.log(`\nMaker domain tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
