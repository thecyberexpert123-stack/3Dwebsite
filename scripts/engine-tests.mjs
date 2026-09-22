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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
