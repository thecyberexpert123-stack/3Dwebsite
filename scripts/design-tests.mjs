#!/usr/bin/env node
/**
 * Design-domain test suite for src/lib/design.ts (pure logic — no browser).
 *
 * Verifies: URL encode/decode round-trips, tamper/garbage rejection,
 * business rules (bouquets need stems), hex normalization, randomizer
 * stability and WhatsApp message shape.
 *
 * Run: npm run test:design
 * (the npm script compiles design.ts to CommonJS first, then runs this file)
 */
import { createRequire } from "node:module";
import { resolve } from "node:path";

const compiledPath = process.argv[2];
if (!compiledPath) {
  console.error("usage: node scripts/design-tests.mjs <path to compiled design.js>");
  process.exit(2);
}

const d = createRequire(import.meta.url)(resolve(compiledPath));

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

/* 5. randomizer stability */
let randomsOk = true;
for (let i = 0; i < 5000; i++) {
  const r = d.randomDesign();
  const ok =
    ["flower", "bouquet"].includes(r.type) &&
    ["rounded", "pointed"].includes(r.petalShape) &&
    [4, 5, 6, 7, 8].includes(r.petalCount) &&
    [0, 1, 2].includes(r.leaves) &&
    [3, 5, 7].includes(r.bouquetCount) &&
    /^#[0-9A-F]{6}$/.test(r.petalColor) &&
    /^#[0-9A-F]{6}$/.test(r.centerColor) &&
    /^#[0-9A-F]{6}$/.test(r.ribbonColor) &&
    !(r.type === "bouquet" && r.stem === "none");
  if (!ok) {
    randomsOk = false;
    console.error("  bad random:", JSON.stringify(r));
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

console.log(`\nDesign domain tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
