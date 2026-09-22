#!/usr/bin/env node
/**
 * Whimlet Engine — scheduler decision tests (pure, no browser).
 *   src/lib/engine/scheduler.ts → decide(), smoothFrameMs()
 *
 * Run: npm run test:engine
 */
import { createRequire } from "node:module";
import { resolve } from "node:path";

const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: node scripts/engine-tests.mjs <compiled-out-dir>");
  process.exit(2);
}
const require = createRequire(import.meta.url);
const { decide, smoothFrameMs, FRAME_BUDGET_MS } = require(resolve(outDir, "scheduler.js"));
const { decideBack, shouldPushEntry } = require(resolve(outDir, "android.js"));
const { gpuScore, scoreDevice, tierFromScore, decideParity, orientationToPointer, followRest, tiltMayDrive, TILT_RANGE_DEG } = require(resolve(outDir, "capability.js"));

let pass = 0;
let fail = 0;
const check = (name, cond) => {
  if (cond) pass++;
  else {
    fail++;
    console.error("  ✗ FAIL:", name);
  }
};
const by = (ds) => Object.fromEntries(ds.map((d) => [d.id, d]));

console.log("engine: visibility gating");
{
  const d = by(decide([{ id: "hero", area: 0.9, hint: "run", priority: 1 }, { id: "desk", area: 0, hint: "run", priority: 0 }], 8, 0));
  check("visible root renders", d.hero.render && d.hero.primary);
  check("off-screen root does not render", !d.desk.render);
  const none = decide([{ id: "a", area: 0, hint: "run", priority: 0 }], 8, 0);
  check("nothing visible → nothing renders", none.every((x) => !x.render));
  check("output order matches input order", decide([{ id: "b", area: 0.1, hint: "run", priority: 0 }, { id: "a", area: 0.9, hint: "run", priority: 0 }], 8, 0).map((x) => x.id).join() === "b,a");
}

console.log("engine: pause hint");
{
  const d = by(decide([{ id: "hero", area: 0.9, hint: "pause", priority: 1 }, { id: "desk", area: 0.2, hint: "run", priority: 0 }], 8, 0));
  check("paused root never renders even when visible", !d.hero.render);
  check("the next visible root becomes primary", d.desk.render && d.desk.primary);
}

console.log("engine: primary selection");
{
  const d = by(decide([{ id: "small", area: 0.1, hint: "run", priority: 0 }, { id: "big", area: 0.6, hint: "run", priority: 0 }], 8, 0));
  check("largest visible area is primary", d.big.primary && !d.small.primary);
  const p = by(decide([{ id: "small", area: 0.1, hint: "run", priority: 5 }, { id: "big", area: 0.6, hint: "run", priority: 0 }], 8, 0));
  check("priority beats area", p.small.primary && !p.big.primary);
}

console.log("engine: frame budget");
{
  const roots = [{ id: "a", area: 0.6, hint: "run", priority: 0 }, { id: "b", area: 0.3, hint: "run", priority: 0 }, { id: "c", area: 0.2, hint: "run", priority: 0 }];
  const ok = by(decide(roots, FRAME_BUDGET_MS - 1, 0));
  check("under budget: every visible root renders", ok.a.render && ok.b.render && ok.c.render);
  const f0 = by(decide(roots, FRAME_BUDGET_MS + 10, 0));
  const f1 = by(decide(roots, FRAME_BUDGET_MS + 10, 1));
  check("over budget: primary still renders every frame", f0.a.render && f1.a.render);
  check("over budget: secondaries alternate frames", f0.b.render !== f1.b.render && f0.c.render !== f1.c.render);
  check("over budget: secondaries are staggered (not both skipped)", f0.b.render !== f0.c.render);
  const solo = by(decide([roots[0]], FRAME_BUDGET_MS + 10, 0));
  check("over budget with one root: it still renders", solo.a.render);
}

console.log("engine: priming");
{
  const d = by(decide([{ id: "hero", area: 0.9, hint: "run", priority: 1 }, { id: "studio", area: 0, hint: "run", priority: 0, prime: true }], 8, 0));
  check("off-screen primed root gets a frame", d.studio.render && !d.studio.primary);
  check("visible root unaffected", d.hero.render && d.hero.primary);
  const two = decide([{ id: "x", area: 0, hint: "run", priority: 0, prime: true }, { id: "y", area: 0, hint: "run", priority: 0, prime: true }], 8, 0);
  check("only one prime per frame", two.filter((x) => x.render).length === 1);
  const paused = by(decide([{ id: "x", area: 0, hint: "pause", priority: 0, prime: true }], 8, 0));
  check("paused roots are never primed", !paused.x.render);
  const vis = by(decide([{ id: "x", area: 0.5, hint: "run", priority: 0, prime: true }], 8, 0));
  check("a visible root with prime set renders normally (as primary)", vis.x.render && vis.x.primary);
}

console.log("engine: frame-time smoothing");
{
  check("first sample seeds the average", smoothFrameMs(0, 16.7) === 16.7);
  const after = smoothFrameMs(16, 2000);
  check("a tab-switch gap is clamped (does not poison the average)", after < 16 + (100 - 16) * 0.1 + 1e-9);
  let a = 0;
  for (let i = 0; i < 200; i++) a = smoothFrameMs(a, 33);
  check("converges toward the steady frame time", Math.abs(a - 33) < 0.01);
}

console.log("engine: android back button");
{
  check("no dialog open → Back leaves as usual", decideBack(0) === "leave");
  check("a dialog open → Back closes it", decideBack(1) === "close-dialog");
  check("stacked dialogs → Back closes (the top one)", decideBack(3) === "close-dialog");
  // minimal Element stand-ins (no DOM in node)
  const el = (attrs, classes = []) => ({ getAttribute: (k) => attrs[k] ?? null, classList: { contains: (c) => classes.includes(c) } });
  const tracked = new WeakSet();
  const modal = el({ role: "dialog", "aria-modal": "true" });
  check("modal dialog gets a history entry", shouldPushEntry(modal, tracked) === true);
  tracked.add(modal);
  check("never twice for the same element", shouldPushEntry(modal, tracked) === false);
  check("non-modal dialog is ignored", shouldPushEntry(el({ role: "dialog" }), tracked) === false);
  check("plain element is ignored", shouldPushEntry(el({}), tracked) === false);
  check("the welcome door (.candy) is excluded", shouldPushEntry(el({ role: "dialog", "aria-modal": "true" }, ["candy"]), tracked) === false);
}

console.log("engine: GPU classification (capability.ts)");
{
  check("Adreno 750 (Snapdragon 8 Gen 3) → capable", gpuScore("Adreno (TM) 750") === 2);
  check("Adreno 650 (Snapdragon 865) → capable", gpuScore("Adreno (TM) 650") === 2);
  check("Adreno 610 (Snapdragon 6xx) → neutral", gpuScore("Adreno (TM) 610") === 0);
  check("Adreno 506 → entry", gpuScore("Adreno (TM) 506") === -2);
  check("Mali-G715 (Tensor G3) → capable", gpuScore("Mali-G715-Immortalis MC11") === 2);
  check("Mali-G78 (Tensor G1) → capable", gpuScore("Mali-G78 MP20") === 2);
  check("Mali-G52 → entry-ish", gpuScore("Mali-G52 MC2") === -1);
  check("Mali-G57 → entry-ish", gpuScore("Mali-G57 MC2") === -1);
  check("Mali-T830 → entry", gpuScore("Mali-T830") === -2);
  check("Xclipse 940 → capable", gpuScore("Samsung Xclipse 940") === 2);
  check("Apple GPU → capable", gpuScore("Apple GPU") === 2);
  check("PowerVR → entry", gpuScore("PowerVR Rogue GE8320") === -2);
  check("desktop NVIDIA → unrecognised (neutral)", gpuScore("ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)") === null);
  check("empty → unrecognised", gpuScore("") === null);
}

console.log("engine: device score → tier");
{
  const t = (e) => tierFromScore(scoreDevice(e));
  check("software renderer → low regardless", t({ cores: 16, mem: 32, gpu: 2, software: true, coarseSmall: false }) === "low");
  check("Pixel 8 class (Mali-G715, 8 GB) → high", t({ cores: 9, mem: 8, gpu: 2, software: false, coarseSmall: true }) === "high");
  check("Snapdragon 8 Gen 2, 12 GB → high", t({ cores: 8, mem: 8, gpu: 2, software: false, coarseSmall: true }) === "high");
  check("Adreno 610 phone, 4 GB → mid", t({ cores: 8, mem: 4, gpu: 0, software: false, coarseSmall: true }) === "mid");
  check("Mali-G52 phone, 4 GB (8 cores!) → low", t({ cores: 8, mem: 4, gpu: -1, software: false, coarseSmall: true }) === "low");
  check("Mali-G52 phone, 3 GB → low", t({ cores: 8, mem: 2, gpu: -1, software: false, coarseSmall: true }) === "low");
  check("unknown phone GPU, 4 cores, 4 GB → mid (old heuristic)", t({ cores: 4, mem: 4, gpu: null, software: false, coarseSmall: true }) === "mid");
  check("unknown phone GPU, 4 cores, 2 GB → low", t({ cores: 4, mem: 2, gpu: null, software: false, coarseSmall: true }) === "low");
  check("desktop 8 cores 16 GB unknown GPU → high", t({ cores: 8, mem: 16, gpu: null, software: false, coarseSmall: false }) === "high");
  check("Safari (no deviceMemory), Apple GPU → high", t({ cores: 6, mem: undefined, gpu: 2, software: false, coarseSmall: true }) === "high");
}

console.log("engine: touch parity");
{
  check("capable phone → desktop choreography", decideParity({ coarse: true, tier: "high", reducedMotion: false }));
  check("mid phone → on", decideParity({ coarse: true, tier: "mid", reducedMotion: false }));
  check("low phone → off", !decideParity({ coarse: true, tier: "low", reducedMotion: false }));
  check("reduced motion → off", !decideParity({ coarse: true, tier: "high", reducedMotion: true }));
  check("mouse device → not this path", !decideParity({ coarse: false, tier: "high", reducedMotion: false }));
  check("?parity=on forces even low", decideParity({ coarse: true, tier: "low", reducedMotion: false, forced: "on" }));
  check("?parity=off forces off", !decideParity({ coarse: true, tier: "high", reducedMotion: false, forced: "off" }));
  check("?parity=on never applies to a mouse", !decideParity({ coarse: false, tier: "high", reducedMotion: false, forced: "on" }));
}

console.log("engine: tilt → pointer");
{
  const rest = { beta: 45, gamma: 0 };
  const c = orientationToPointer(rest, rest, 0);
  check("at rest → centre", c.x === 0 && c.y === 0);
  const r = orientationToPointer({ beta: 45, gamma: TILT_RANGE_DEG / 2 }, rest, 0);
  check("roll right (portrait) → pointer.x +0.5", Math.abs(r.x - 0.5) < 1e-9 && r.y === 0);
  const away = orientationToPointer({ beta: 45 + TILT_RANGE_DEG, gamma: 0 }, rest, 0);
  check("top edge away → pointer.y −1 (look up)", away.y === -1 && away.x === 0);
  const far = orientationToPointer({ beta: 45, gamma: 90 }, rest, 0);
  check("clamped to ±1", far.x === 1);
  const land = orientationToPointer({ beta: 45 + TILT_RANGE_DEG / 2, gamma: 0 }, rest, 90);
  check("landscape (90°): beta drives x", Math.abs(land.x - 0.5) < 1e-9 && land.y === 0);
  const land2 = orientationToPointer({ beta: 45 + TILT_RANGE_DEG / 2, gamma: 0 }, rest, 270);
  check("landscape (270°): mirrored", Math.abs(land2.x + 0.5) < 1e-9);
  const neg = orientationToPointer({ beta: 45, gamma: 7 }, rest, -90);
  check("negative angle normalised", Number.isFinite(neg.x));

  // rest follows the sample: a held tilt fades to centre
  let rr = { beta: 45, gamma: 0 };
  const held = { beta: 45, gamma: 20 };
  for (let i = 0; i < 60 * 3.2; i++) rr = followRest(rr, held, 1 / 60);
  check("rest reaches ~63 % of a held tilt after one time constant", Math.abs(rr.gamma - 20 * (1 - Math.exp(-1))) < 0.4);
  for (let i = 0; i < 60 * 15; i++) rr = followRest(rr, held, 1 / 60);
  check("…and (nearly) all of it after 18 s", Math.abs(rr.gamma - 20) < 0.1);
  check("followRest is frame-rate independent", Math.abs(followRest({ beta: 0, gamma: 0 }, { beta: 0, gamma: 10 }, 1).gamma - (followRest(followRest({ beta: 0, gamma: 0 }, { beta: 0, gamma: 10 }, 0.5), { beta: 0, gamma: 10 }, 0.5).gamma)) < 1e-9);
  check("negative dt is inert", followRest({ beta: 1, gamma: 1 }, { beta: 9, gamma: 9 }, -1).gamma === 1);

  check("finger just touched → tilt yields", !tiltMayDrive(1000, 900));
  check("finger gone for a second → tilt drives", tiltMayDrive(2000, 900));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
