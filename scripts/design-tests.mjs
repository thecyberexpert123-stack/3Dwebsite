#!/usr/bin/env node
/**
 * Domain test suite for the 3D Design Studio logic — pure, no browser:
 * - src/lib/design.ts (config, presets, URL round-trips, sanitizing)
 * - src/lib/sketch.ts  (sketch → smoothed petal pipeline)
 *
 * Run: npm run test:design
 * (the npm script compiles both libs to CommonJS first, then runs this file)
 */
import { createRequire } from "node:module";
import { resolve } from "node:path";

const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: node scripts/design-tests.mjs <compiled-out-dir>");
  process.exit(2);
}

const require = createRequire(import.meta.url);
const d = require(resolve(outDir, "design.js"));
const sk = require(resolve(outDir, "sketch.js"));

let pass = 0;
let fail = 0;
const check = (name, cond) => {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error("  ✗ FAIL:", name);
  }
};
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

/* ================================================================
   design.ts — config, sharing, tamper-proofing
   ================================================================ */

/* 1. encode/decode round-trip */
const code = d.encodeDesign(d.DEFAULT_DESIGN);
const back = d.decodeDesign(code);
check("round-trip identity", JSON.stringify(back) === JSON.stringify(d.DEFAULT_DESIGN));
check("code is URL-safe", /^[A-Za-z0-9_-]+$/.test(code));

/* 2. tampered / invalid inputs */
check("garbage → null", d.decodeDesign("!!!not-base64!!!") === null);
const tampered = Buffer.from(
  JSON.stringify({ ...d.DEFAULT_DESIGN, petalCount: 99, petalColor: "javascript:", stem: "huge" })
).toString("base64url");
const san = d.decodeDesign(tampered);
check("tampered survives as sanitized config", san !== null);
check("petalCount 99 → clamped to valid", [4, 5, 6, 7, 8].includes(san.petalCount));
check("bad hex rejected → default", /^#[0-9A-F]{6}$/i.test(san.petalColor));
check("bad stem → valid stem", ["none", "short", "tall"].includes(san.stem));

/* 3. business rule: bouquets need visible stems */
const bouquetNoStem = d.sanitizeDesign({ ...d.DEFAULT_DESIGN, type: "bouquet", stem: "none" });
check("bouquet + none stem → short", bouquetNoStem.stem === "short");

/* 4. hex normalization */
check(
  "lowercase hex → uppercase",
  d.sanitizeDesign({ ...d.DEFAULT_DESIGN, petalColor: "#f2b9c9" }).petalColor === "#F2B9C9"
);

/* 5. randomizer stability (incl. hand-drawn petals) */
let randomsOk = true;
for (let i = 0; i < 5000; i++) {
  const r = d.randomDesign();
  const ok =
    ["flower", "bouquet"].includes(r.type) &&
    ["rounded", "pointed", "custom"].includes(r.petalShape) &&
    [4, 5, 6, 7, 8].includes(r.petalCount) &&
    [0, 1, 2].includes(r.leaves) &&
    [3, 5, 7, 9].includes(r.bouquetCount) &&
    /^#[0-9A-F]{6}$/.test(r.petalColor) &&
    /^#[0-9A-F]{6}$/.test(r.centerColor) &&
    /^#[0-9A-F]{6}$/.test(r.ribbonColor) &&
    !(r.type === "bouquet" && r.stem === "none") &&
    (r.petalShape !== "custom" || sk.isValidPetalData(r.customPetal));
  if (!ok) {
    randomsOk = false;
    console.error("  bad random:", JSON.stringify(r).slice(0, 200));
    break;
  }
}
check("5000 random designs all valid", randomsOk);

/* 6. every preset round-trips */
for (const p of d.DESIGN_PRESETS) {
  const rt = d.decodeDesign(d.encodeDesign(p.config));
  check(`preset "${p.label}" round-trips`, JSON.stringify(rt) === JSON.stringify(p.config));
}

/* 7. WhatsApp message shape */
const msg = d.buildDesignMessage(d.DESIGN_PRESETS[3].config);
check("message starts with greeting", msg.startsWith("Hi Whimlet!"));
check("message asks to make it", msg.includes("Could you please make this for me?"));

/* ================================================================
   design.ts — hand-drawn petals (sketch integration)
   ================================================================ */

/* 8. sketch data survives the URL round-trip */
const drawn = d.sanitizeDesign({
  ...d.DEFAULT_DESIGN,
  petalShape: "custom",
  customPetal: sk.quantizePetal(sk.tulipPetalOutline()),
});
const drawnRt = d.decodeDesign(d.encodeDesign(drawn));
check("hand-drawn petal round-trips through the URL", JSON.stringify(drawnRt) === JSON.stringify(drawn));

/* 9. "custom" without usable data falls back safely */
const noData = d.sanitizeDesign({ ...d.DEFAULT_DESIGN, petalShape: "custom", customPetal: [1, 2, 3] });
check("custom + garbage data → rounded", noData.petalShape === "rounded" && noData.customPetal === null);
const tamperedDrawn = d.decodeDesign(
  Buffer.from(
    JSON.stringify({ ...drawn, customPetal: "alert(1)" })
  ).toString("base64url")
);
check("petal data tamper rejected", tamperedDrawn.petalShape === "rounded");

/* 10. sketch presets are real custom petals */
const tulip = d.DESIGN_PRESETS.find((p) => p.id === "tulip-sketch");
const wild = d.DESIGN_PRESETS.find((p) => p.id === "wildflower-mix");
check("Tulip Sketch preset is a hand-drawn petal", !!tulip && tulip.config.petalShape === "custom" && sk.isValidPetalData(tulip.config.customPetal));
check("Wildflower Mix preset is a hand-drawn petal", !!wild && wild.config.petalShape === "custom" && sk.isValidPetalData(wild.config.customPetal));

/* 11. description mentions the hand-drawn petal */
check("describeDesign says hand-drawn", d.describeDesign(drawn).includes("hand-drawn"));
check("WhatsApp message mentions the sketch", d.buildDesignMessage(drawn).includes("sketch"));

/* ================================================================
   sketch.ts — the smoothing pipeline
   ================================================================ */

/* 12. resample: exact count, endpoints preserved */
const line = Array.from({ length: 50 }, (_, i) => ({ x: i / 49, y: 0 }));
const rs = sk.resample(line, 17);
check("resample returns exact count", rs.length === 17);
check("resample keeps the start", near(rs[0].x, 0, 1e-9) && near(rs[0].y, 0, 1e-9));

/* 13. laplacian smoothing actually calms a zigzag */
const zigzag = Array.from({ length: 40 }, (_, i) => ({ x: i % 2 === 0 ? 1 : -1, y: i / 39 }));
const spread = (pts) => {
  let minX = Infinity, maxX = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); }
  return maxX - minX;
};
const smoothedZig = sk.laplacianSmooth(zigzag, 4, 0.6);
check("laplacian shrinks zigzag spread", spread(smoothedZig) < spread(zigzag) * 0.6);

/* 14. processSketch: clean, normalized, closed output */
const sketchStroke = Array.from({ length: 80 }, (_, i) => {
  const t = (i / 80) * Math.PI * 2;
  return { x: 0.5 + Math.sin(t) * (0.22 + 0.05 * Math.cos(3 * t)), y: 0.5 + Math.cos(t) * 0.3 };
});
const petal = sk.processSketch(sketchStroke, true);
check("processSketch returns PETAL_POINTS", petal.length === sk.PETAL_POINTS);
const ys = petal.map((p) => p.y);
check("petal normalized: base ≈ 0, tip ≈ 1", near(Math.min(...ys), 0, 0.02) && near(Math.max(...ys), 1, 0.02));
const xs = petal.map((p) => p.x);
check("petal centred on x", Math.abs(Math.max(...xs) + Math.min(...xs)) < 0.05);
check("petal width stays petal-shaped", Math.max(...xs) <= 0.5 + 1e-9);

/* 15. symmetry is real: every point has a mirrored partner */
let symOk = true;
const n = petal.length;
for (let i = 0; i < n; i++) {
  const j = (n / 2 - i + n) % n;
  if (Math.abs(petal[i].x + petal[j].x) > 0.02 || Math.abs(petal[i].y - petal[j].y) > 0.02) {
    symOk = false;
    break;
  }
}
check("symmetrized outline is mirror-even", symOk);

/* 16. asymmetric mode keeps the sketch's own character */
const asym = sk.processSketch(sketchStroke, false);
check("asymmetric mode still normalizes", near(Math.max(...asym.map((p) => p.y)), 1, 0.02));

/* 17. degenerate sketches are rejected with guidance */
let threwShort = false;
try { sk.processSketch([{ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.51 }], true); } catch { threwShort = true; }
check("too-short sketch throws", threwShort);

/* 17b. outlines are SIMPLE polygons — what extrusion actually needs
   (a self-intersecting outline would break ExtrudeGeometry) */
const segmentsCross = (p1, p2, p3, p4) => {
  const d = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
};
const isSimple = (pts) => {
  const n = pts.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (segmentsCross(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return false;
    }
  return true;
};
let allSimple = true;
for (let s = 0; s < 100; s++) {
  const n = 60 + (s % 40);
  const rx = 0.15 + ((s * 37) % 23) / 100, ry = 0.15 + ((s * 53) % 31) / 100;
  const stroke = Array.from({ length: n }, (_, k) => {
    const t = (k / n) * Math.PI * 2;
    const wob = 0.06 * (Math.sin(t * 3 + s) * 0.5 + (((s * k) % 11) / 11 - 0.5));
    return { x: 0.5 + Math.sin(t) * (rx + wob), y: 0.5 + Math.cos(t) * (ry + wob) };
  });
  try {
    const out = sk.processSketch(stroke, s % 2 === 0);
    if (!isSimple(out)) { allSimple = false; console.error("  self-intersecting outline at stroke", s); break; }
  } catch {
    // degenerate random strokes are allowed to be rejected, never to break
  }
}
check("100 wobbly strokes all extrude-safe (simple polygons)", allSimple);

/* 18. quantize/dequantize round-trip precision */
const q = sk.quantizePetal(petal);
const dq = sk.dequantizePetal(q);
let maxErr = 0;
for (let i = 0; i < petal.length; i++) {
  maxErr = Math.max(maxErr, Math.abs(petal[i].x - dq[i].x), Math.abs(petal[i].y - dq[i].y));
}
check("quantize round-trip error ≤ 0.004", maxErr <= 0.004);

/* 19. isValidPetalData strictness */
check("valid data accepted", sk.isValidPetalData(q));
check("odd length rejected", !sk.isValidPetalData([1, 2, 3]));
check("out-of-range rejected", !sk.isValidPetalData([0, 0, 300, 10]));
check("negative rejected", !sk.isValidPetalData([0, 0, -1, 10]));
check("too short rejected", !sk.isValidPetalData(new Array(14).fill(10)));
check("strings rejected", !sk.isValidPetalData(["a", "b"]));

/* 20. built-in outlines are valid petal data */
for (const [name, fn] of [["tulip", sk.tulipPetalOutline], ["wild", sk.wildPetalOutline], ["random", sk.randomPetalOutline]]) {
  check(`${name} outline quantizes to valid data`, sk.isValidPetalData(sk.quantizePetal(fn())));
}


/* ================================================================
   v2 — the design file, spec sheet, new options
   ================================================================ */

/* 12. v1 links/configs still open (every new field defaults) */
const v1 = { type: "bouquet", petalShape: "pointed", petalCount: 7, petalColor: "#F2CD8D", centerColor: "#8A6A5C", mixColors: false, stem: "tall", leaves: 2, bouquetCount: 5, wrap: true, ribbonColor: "#D8849C", customPetal: null };
const v1code = Buffer.from(JSON.stringify(v1)).toString("base64url");
const v1cfg = d.decodeDesign(v1code);
check("v1 link opens", v1cfg !== null && v1cfg.type === "bouquet" && v1cfg.petalCount === 7 && v1cfg.bouquetCount === 5);
check("v1 link gets v2 defaults", v1cfg.petalLayers === 2 && v1cfg.yarn === "cotton" && v1cfg.fillers === "none" && v1cfg.tag === "none");

/* 13. URL codes carry only the diff (short links) */
check("default design encodes tiny", d.encodeDesign(d.DEFAULT_DESIGN).length < 8);
const full = d.DESIGN_PRESETS.find((p) => p.id === "starlit-night").config;
check("preset round-trips via diff encoding", JSON.stringify(d.decodeDesign(d.encodeDesign(full))) === JSON.stringify(full));

/* 14. free text is sanitized */
const txt = d.sanitizeDesign({ ...d.DEFAULT_DESIGN, tag: "heart", tagText: "  for\nyou\u0007 and everyone else too  ", note: "x".repeat(500) });
check("tag text: control chars stripped, collapsed, capped", txt.tagText === "for you and everyo" && txt.tagText.length <= d.TAG_TEXT_MAX);
check("note capped", txt.note.length === d.NOTE_MAX);
check("tag text dropped when no tag", d.sanitizeDesign({ ...d.DEFAULT_DESIGN, tag: "none", tagText: "hi" }).tagText === "");

/* 15. business rules */
check("bouquet → no base", d.sanitizeDesign({ ...d.DEFAULT_DESIGN, type: "bouquet", base: "vase" }).base === "none");
check("stemless flower → no base", d.sanitizeDesign({ ...d.DEFAULT_DESIGN, stem: "none", base: "pot" }).base === "none");
check("unknown enum → default", d.sanitizeDesign({ ...d.DEFAULT_DESIGN, yarn: "silk", centerStyle: "eyes" }).yarn === "cotton");

/* 16. design file round-trip */
const file = d.toDesignFile(full, "Nana's bouquet", new Date("2026-09-21T10:00:00Z"));
check("file has format + version", file.format === d.DESIGN_FORMAT && file.version === d.DESIGN_VERSION);
check("file name slug", d.designFileName(full, "Nana's bouquet") === "nana-s-bouquet.whimlet.json");
const parsed = d.parseDesignFile(JSON.stringify(file));
check("file parses", parsed.ok && JSON.stringify(parsed.file.config) === JSON.stringify(full) && parsed.file.name === "Nana's bouquet");
check("file keeps date", parsed.ok && parsed.file.createdAt === "2026-09-21T10:00:00.000Z");
const bare = d.parseDesignFile(JSON.stringify(v1));
check("bare v1 config parses with a warning", bare.ok && bare.warnings.length > 0 && bare.file.config.bouquetCount === 5);
const link = d.parseDesignFile("https://whimlet.example/studio?design=" + d.encodeDesign(full));
check("share link parses", link.ok && JSON.stringify(link.file.config) === JSON.stringify(full));
const bareCode = d.parseDesignFile(d.encodeDesign(full));
check("bare code parses", bareCode.ok && bareCode.file.config.bouquetCount === 9);
check("garbage json rejected", d.parseDesignFile("{not json").ok === false);
check("unrelated json rejected", d.parseDesignFile('{"hello":"world"}').ok === false);
check("empty rejected", d.parseDesignFile("   ").ok === false);
const newer = d.parseDesignFile(JSON.stringify({ ...file, version: 99, config: { ...full, futureThing: 1 } }));
check("newer version opens with a warning", newer.ok && newer.warnings.some((w) => /newer/.test(w)));
const evil = d.parseDesignFile(JSON.stringify({ ...file, config: { ...full, petalColor: "url(javascript:1)", tagText: "<img src=x>" } }));
check("file colours sanitized", evil.ok && /^#[0-9A-F]{6}$/.test(evil.file.config.petalColor));

/* 17. spec sheet */
const spec = d.estimateSpec(full);
check("spec petals: 9 flowers × (6+5+4)", spec.flowers === 9 && spec.petalsPerFlower === 15 && spec.petalsTotal === 135);
check("spec palette includes wrap + ribbon", spec.palette.some((p) => p.role === "ribbon") && spec.palette.some((p) => /wrap/.test(p.role)));
check("spec yarn grams positive", spec.yarnGrams.length > 0 && spec.yarnGrams.every((y) => y.grams > 0));
check("spec size sane", spec.heightCm > 10 && spec.heightCm < 80 && spec.widthCm > 5);
const soloSpec = d.estimateSpec(d.DEFAULT_DESIGN);
check("solo spec: 1 flower, 11 petals, 2 leaves", soloSpec.flowers === 1 && soloSpec.petalsTotal === 11 && soloSpec.leavesTotal === 2);
check("mixed palette lists one entry per flower", d.paletteOf(d.DESIGN_PRESETS.find((p) => p.id === "sage-garden").config).filter((p) => /flower \d/.test(p.role)).length === 6);

/* 18. descriptions mention the new options */
const desc = d.describeDesign(full);
check("description: velvet, ombré, fairy lights, sheer, double bow", /velvet/.test(desc) && /fading to/.test(desc) && /fairy lights/.test(desc) && /sheer/.test(desc) && /double bow/.test(desc));
const msg2 = d.buildDesignMessage({ ...full, note: "for nana", occasion: "birthday" }, "https://x/studio?design=abc");
check("message carries note, occasion and link", /for nana/.test(msg2) && /Birthday/.test(msg2) && /https:\/\/x\/studio\?design=abc/.test(msg2));
check("short description", d.describeShort(full) === "berry bouquet of 9");

{
  const big = d.parseDesignFile("{" + " ".repeat(70 * 1024) + "}");
  check("parseDesignFile: rejects oversized input", big.ok === false && /large/.test(big.error));
}

{
  const ivory = d.describeDesign({ ...full, ribbonColor: "#FFF6EA", centerColor: "#F6C453", centerStyle: "dome" });
  check("description: 'an' before vowel colours (ivory bow)", /an ivory double bow/.test(ivory) && !/ a ivory/.test(ivory));
  const orange = d.describeDesign({ ...d.DEFAULT_DESIGN, centerColor: "#F4A261" });
  check("description: custom-hex centre keeps a single article", /, a custom colour \(#F4A261\) centre/.test(orange) && !/an a |a a /.test(orange));
}

console.log(`\nDesign domain tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
