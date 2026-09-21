# Agent Experience Log

Actionable engineering experience from working on this project — causes,
conditions and mechanisms, not just events. Read this before extending the 3D
scenes, adding dependencies or touching the build.

## Dependencies

### R3F peer-ranges vs floating React ranges
- **Event:** `npm install` failed with ERESOLVE — `@react-three/fiber@9.7.0`
  peers `react >=19 <19.3`, but `"react": "^19.1.0"` resolved to 19.3.0.
- **Cause:** caret ranges float to the newest minor, while R3F pins narrow
  peer windows that lag React releases.
- **Condition → strategy:** when pairing React Three Fiber/Drei with a fresh
  React, pin `react`/`react-dom` to a tilde range (here `~19.2.0`) instead of
  using `--legacy-peer-deps`, which hides real incompatibilities. Re-check the
  window on every upgrade.

## Fonts & network-restricted builds

### next/font/google requires build-time network
- **Event:** first build failed — sandbox could reach registry.npmjs.org but
  NOT fonts.googleapis.com (`ECONNRESET`), so `next/font/google` died.
- **Mechanism:** `next/font/google` fetches and inlines font files at build
  time; any blocked egress breaks the build even though fonts would be
  self-hosted at runtime.
- **Condition → strategy:** in network-restricted CI, self-host via Fontsource
  npm packages (registry is usually reachable if npm works) → copy the latin
  woff2 files into `src/fonts/` → use `next/font/local` (keep preload +
  fallback-metric benefits) → uninstall the Fontsource packages so no dead
  dependencies remain. Note: `next/font/local` rejects the `subsets` option
  (Google-only) — remove it.
- **Watch:** OFL fonts are fine to commit; keep `src/fonts` tiny (here 126 KB).

### Environment HDRIs have the same trap
- drei `<Environment preset="…">` fetches HDR files from a CDN at runtime.
  In this project lighting is 100% local: `<Environment>` with
  `<Lightformer>` **children** renders a cubemap from local lights only.
  Never switch to presets without checking runtime egress.

## Tooling

### ImageMagick 6 vs 7 CLI syntax
- **Event:** optimize script failed with `convert identify …` — IM6's
  `convert` treats `identify` as a filename; `magick identify` is IM7-only.
- **Condition → strategy:** detect `magick` first (IM7 → `magick identify` /
  `magick`), else fall back to the standalone `identify` + `convert` pair
  (IM6). Implemented in `scripts/optimize-images.mjs`.

### Image generation has a per-turn cap (10 images)
- **Event:** hit the cap mid-way; 4 planned shots (yarn basket, sketchbook,
  wrapped parcel, desk still life) were not generated.
- **Condition → strategy:** budget image slots up front: hero fallback and all
  product shots first (they carry the business), secondary slots last — they
  can fall back to reuse + hand-drawn SVG doodles. Next time these can be
  generated in a later turn and dropped straight into
  `public/images/` (run `npm run optimize:images` after).

## React Three Fiber patterns that worked here

- **SSR/no-JS safety:** `next/dynamic(..., { ssr: false })` renders its
  `loading` component into the SSR HTML — point it at the same static
  composition used for the no-WebGL path, so crawlers/no-JS get real content
  and the page never shows a broken canvas.
- **WebGL detection:** small `useWebGL` hook (canvas probe on mount) decides
  canvas vs static fallback; `null` until measured so first paint shows the
  static composition either way.
- **Demand-mode still lifes:** `frameloop="demand"` + `invalidate()` on
  pointer move gives pointer parallax at ~zero cost for decorative scenes
  (used by the custom-order desk).
- **Stable "handmade" jitter:** a deterministic `rnd(seed)` (sin-hash) drives
  all per-petal scale/rotation wobble and vertex displacement, so nothing
  flickers between frames or remounts.
- **Manual materials leak if you forget cleanup:** materials/geometries
  created imperatively (needed for live colour-lerping) are not auto-disposed
  by R3F — dispose them in a `useEffect` return (see `CrochetFlower`,
  `CustomFlowerScene`).
- **Damped motion reads beautifully:** `THREE.MathUtils.damp(current, target,
  lambda, dt)` for camera/parallax; multiply the motion terms by 0 when
  `prefers-reduced-motion` is set (don't skip rendering — static pose beats
  a blank canvas).

## Verification practices

- `grep -c` counts **matching lines**, not matches — minified HTML is often a
  single line, so counts of 1 can hide many matches. Use
  `grep -oF "x" | wc -l` when counting occurrences.
- Split-text headings (e.g. `Find Your <span>Little Something</span>`) will
  never match a contiguous `grep -F "Find Your Little Something"` — expected,
  not a bug.
- Verify with: production `next build` (types), served HTML content checks
  (anchors, wa.me links, JSON-LD, h1 count), asset 200s (images/fonts/icon),
  and clean server logs. Browser-level interaction testing is still missing
  here — noted as a limitation, not silently assumed.

## Content honesty (business safety)

- Placeholders must be *structurally* replaceable and *visually* honest:
  images referenced by data files that exist, testimonials unattributed,
  socials rendered as explicit "coming soon" chips, and no prices/policies
  anywhere. The custom-order wizard intentionally says reference photos are
  shared in WhatsApp rather than faking an upload pipeline.

## v0.2.0 additions — configurators, canvases and cursors

### OrbitControls traps page scroll on touch devices
- **Condition:** drei `<OrbitControls>` sets `touch-action: none` on the canvas.
  A canvas embedded mid-page therefore swallows vertical swipes — the user
  cannot scroll past the studio. Unacceptable for a marketing page.
- **Mechanism:** the browser hands the whole gesture to the canvas instead of
  scrolling the document.
- **Strategy that worked:** hand-rolled drag on the canvas element with
  `touch-action: pan-y`: horizontal drags rotate (pointer events), vertical
  swipes scroll the page; inertia via exponential velocity decay; idle
  auto-spin resumes ~2.6s after the last interaction. ~40 lines, no
  dependency, mobile-perfect. Prefer this pattern for embedded decorative 3D.

### Scaling the number of canvases: gate, don't just mount
- **Pattern:** two levels of gating.
  1) *Mount gating* — accent scenes render `null` until an IntersectionObserver
     says the wrapper is within ~300px (they unmount when far away; replaying
     their entrance animations on return reads as charm, not a bug).
  2) *Frameloop gating* — the always-mounted hero canvas flips
     `frameloop="never"` while off-screen (R3F supports dynamic switching).
- **Watch:** with `frameloop="never"` nothing renders until invalidated; that's
  fine because the canvas is off-screen. Also keep IO `rootMargin` generous so
  scenes are warm before they scroll into view.

### Configurator state that survives remounts
- **Problem:** in React Three Fiber, remounting a component (e.g. petals after
  a count change) recreates its materials — killing smooth colour transitions.
- **Strategy:** materials live in the *stable* parent (flower) and are passed
  down; only the petal rings remount (with a scale-in "pop"), so colours lerp
  continuously while structure changes pop. Deterministic `rnd(seed)` keeps the
  handmade jitter identical across remounts.

### URL-param state must be sanitized, not trusted
- Design links (`?design=…`) decode to JSON anyone can edit. `sanitizeDesign`
  whitelists enums, clamps counts to exact allowed values, validates hex via
  regex, normalizes case, and enforces business rules (bouquet ⇒ stems
  required). Verified with compiled-run unit checks (16/16) including 5,000
  random configs and tampered payloads. Rule: pure domain logic in a framework
  -free module (`src/lib/design.ts`) is cheap to test without a browser.

### Small traps worth remembering
- **Hydration mismatch via `window`:** computing a URL string in `useMemo`
  differs between server ("" fallback) and first client render → move it to
  `useState` + `useEffect`.
- **Escaped apostrophes break grep assertions:** React emits `&#x27;` — check
  SSR output for phrases containing apostrophes with the escaped form.
- **Cursor leaks:** `document.body.style.cursor` set in R3F hover handlers must
  be reset in an unmount effect, or the cursor sticks when the scene unmounts
  mid-hover (viewport-gated scenes unmount often!).
- **Direct-DOM animation beats state for pointermove:** TiltCard writes
  `style.transform` on a ref — zero re-renders; setState-per-move in a grid
  would jank.
- **Word-staggered headlines split SSR strings:** "Little Stitches." no longer
  appears contiguously in HTML once words are wrapped in motion spans —
  expected, not a regression (SEO-safe: text still present in spans).

## Environment lessons (this sandbox, learned the hard way)

### The local .git can reset to its session-start state between turns
- **Event:** at the start of a new turn, `git log` showed only the initial
  commit, the local branch pointed at `80ad57d`, my commits were missing from
  the object store — while every working-tree file survived fine (all showing
  as untracked).
- **Mechanism:** the platform snapshots working files, but the `.git` state
  can be restored to how the session began. GitHub is the durable source of
  truth for anything committed **and pushed**.
- **Condition → strategy:**
  1. At the start of every turn, check `git log --oneline -3` and
     `git status --short` before trusting local state.
  2. Repair pattern (zero-loss, verified): fetch the branch with an explicit
     refspec, stage the working tree (`git add -A`), compare `git write-tree`
     against `origin/<branch>^{tree}` — if the tree SHAs match, the working
     tree is *cryptographically identical* to the pushed commit and
     `git reset --hard <sha>` is safe. Never reset blind.
  3. Commit and push promptly at the end of any substantial change.

### `.git/config` edits do not persist across turns
- The clone uses a single-branch fetch refspec (`main` only). Adding
  `remote.origin.fetch` entries works within a turn and is silently gone the
  next. **Use explicit refspecs on the command instead**:
  `git fetch origin "+refs/heads/<branch>:refs/remotes/origin/<branch>"`.

### `node_modules`, `.next`, and background processes do not survive turns
- Expect to `npm install` + `npm run build` + restart the preview server at
  the start of a turn that needs them. Check first (`ls node_modules | wc -l`,
  `curl localhost:3000`) — restoring is cheap but must not be assumed away.

### Verification commands have their own failure modes
- `git ls-tree <branch> | awk '{print $3}'` prints the SHA of **every root
  entry**, not the branch's tree SHA — it produced a wall of misleading
  "mismatched" hashes. The correct comparison is
  `git rev-parse "<branch>^{tree}"` (or the GitHub API's `commit.tree.sha`).
- Pipe truncation lies: `ls … | head -12` made `src/` look empty. When
  verifying directory integrity, list each directory separately without
  truncation.

## v0.3.0 — sketch pad + cozy motion

### Edits can report success without persisting — verify every edit
- **Event:** during a large multi-file change, several `edit_file` calls
  returned "success" but the target files were later missing exactly those
  changes (an import line here, a JSX block there, a state declaration).
  The build kept failing on "cannot find name X" for names whose edits had
  reportedly landed.
- **Detection pattern:** after a batch of edits, grep for a distinctive token
  from EACH edit before building — don't trust the tool response alone.
- **Repair:** re-apply missing hunks with small python scripts that `assert`
  the anchor text exists and print what they applied, then grep-verify again.
  Prefer few-but-verified patches over many-but-hopeful ones.

### Ship the geometry pipeline as a library, not as UI code
- `src/lib/sketch.ts` is pure (no THREE, no DOM), so the same code runs in
  the browser, in Node, and in CI. That made it possible to numerically
  verify properties the eye can't: mirror symmetry tolerance, normalization
  bounds, quantization error, and — most importantly — that outputs are
  always SIMPLE polygons (self-intersecting outlines break ExtrudeGeometry).
  The 100-stroke extrusion-safety sweep in the test suite came from finding
  a real bug this way (mirror-averaging could swap adjacent points in
  angular order; fixed by re-running polar resampling after symmetrizing).

### Geometry lessons
- `mirrorSymmetrize` must mirror about the loop's **centroid**, not the
  origin — mirroring about x=0 silently doubles the outline's width and the
  normalizer's aspect clamp then squashes the height.
- A polar (angle-based) resample of a loop around its centroid always yields
  an angularly-ordered, hence simple, outline — a reliable "heal" step after
  any operation that can disorder points.
- Verification code has its own bugs: my first star-shape checker only
  accepted counter-clockwise loops and mixed array/object access (NaNs).
  When a validator fails everything, suspect the validator — test it on
  known-good data (a circle) first.

## v0.5.0 — the girly/cute overhaul

### The sandbox resets harder than expected
- **Problem:** at turn start the repo had no history, `node_modules` and
  `.next` were gone and the previous work only existed on another arena
  branch. **Fix:** `git fetch origin +refs/heads/<branch>:refs/remotes/origin/<branch>`
  with explicit refspecs, `git reset -q <remote head>`, `npm ci`. Trust the
  pushed branch, never the local tree.
- **Network:** npm registry, PyPI and github.com work; Chrome-for-Testing
  CDNs, apt, unpkg and jsdelivr do not. For headless screenshots,
  `@sparticuz/chromium` works if you set
  `AWS_EXECUTION_ENV=AWS_Lambda_nodejs22.x` before the first
  `executablePath()` and launch with `LD_LIBRARY_PATH=/tmp/al2023/lib`.

### Stale `next start` after a rebuild ⇒ 400s on `_next/static`
- `stop_process` leaves the `next-server` child alive; the old server then
  serves the new HTML with old chunk hashes. Always `pkill -f next-server`
  before `next start` (that is what `/tmp/pw/restart.sh` does). Symptom to
  recognise: page loads, every chunk 400s, no client JS.

### SwiftShader realities (for interpreting screenshots)
- `THREE.WebGLRenderer: Context Lost.` in the console is a teardown artifact,
  not a bug. Screenshots take 4–7 s each so any timed shot lands late. The
  hero at `quality=high` needs ~15–20 s to fully compose; use
  `?intro=skip&quality=high` and long waits when judging composition, and
  do not read SwiftShader frame rates as user frame rates — only compare
  relative numbers (draw calls/frame before vs after).

### Pastels and ACES do not mix
- **Problem:** every scene had a grey cast even though materials were pink.
  **Root cause:** R3F's default ACESFilmic tone mapping compresses bright
  low-saturation colours towards grey. **Fix:** `<Canvas flat>` (linear tone
  mapping) plus a hemisphere fill. Also the standard-material ground read
  darker than the page → use an unlit `meshBasicMaterial` for the floor when
  the floor is supposed to *be* the page colour. Confidence: high (verified in
  before/after shots).

### Cute ≠ noisy — how the "girly" direction stayed directed
- Research (claymorphism guides, coquette-aesthetic roundups) converged on:
  tinted (never white) surfaces, one light source, hue-tinted shadows,
  bows/pearls/ribbons as the signature motif, soft-bounce easing. We applied
  that as a *system* (tokens + `.btn-primary`/`.card-clay`/`.sticker`)
  instead of per-component decoration, so the page reads cohesively.
- The single entrance surprise hooks into the existing intro clock
  (`startIntro()`) rather than adding a second loader — the door is a
  wrapper around the hero's first frame, not a competing animation.
- Decorative motion is budgeted: the heart trail is pooled DOM + CSS
  animation with distance/rate gating; no per-frame JS, no canvas.

### Text colour vs brand colour are different tokens
- Brand rose `#e07a9a` is 2.7:1 on ivory — fine for fills, doodles and 3D,
  failing for text. Adding `--color-rose-ink` (`#b8456f`, 4.8:1 on ivory)
  and moving every `text-rose` to it fixed 21 files with a regex. Lesson:
  compute the contrast table from the tokens *before* the palette is used in
  50 places; a text-safe variant of each accent should exist from day one.

### Python bulk edits: replace-all then replace-once lies
- A replace-all earlier in the script can consume an occurrence a later
  `replace(a, b, 1)` expects, so the helper reports MISSING although the
  file is already correct. Grep-verify the end state instead of trusting
  the MISSING message.

### Draw-call hygiene for "many small props" scenes
- A yarn ball made of 14 torus meshes is 15 draw calls; merging the rings
  with `BufferGeometryUtils.mergeGeometries` (same material) makes it 2.
  Same for strawberry seeds/leaves. Dispose the merged geometry in an
  effect cleanup. Measured hero: 190 → 175 calls/frame; the remaining cost
  is the flowers (one mesh per petal) — the next merge candidate if a real
  low-tier device struggles.

## v0.6.0 — one bloom, instancing, measured

### The sandbox can also revert the *working tree* mid-session
- **Problem:** history and `node_modules` vanished again, and once the tree
  silently reverted to an older commit while the memory said edits existed.
  **Fix:** at every turn start run `git log -3`, `git status`, and compare
  `git write-tree` with the remote tree before touching anything; recover
  with `git fetch origin +refs/heads/<b>:refs/remotes/origin/<b>` →
  `git reset --hard` → `npm ci` → rebuild. Push with the explicit refspec
  `git push origin HEAD:<branch>` (upstream config does not survive).
- The GitHub token can expire mid-session (`could not read Username`); the
  work is still in local commits — report it and keep going.

### Instancing petals: what actually changed
- One `InstancedMesh` per petal ring (outer/inner) instead of a mesh per
  petal took the hero from 136 to 53 calls/frame with identical visuals.
  Petal animation moved from per-mesh `scale` to `writeRing()` rewriting
  instance matrices — the same helper drives idle sway and the grow-in, so
  there is no second animation path to keep in sync.
- Shared materials via `finish(kind, hex)` collapsed program count as well;
  only the studio flower keeps `create()`-owned materials because it lerps
  colour per instance (and disposes them on unmount).

### Petal proportions come from product photos, not from taste
- First attempts (thick `scaleY 0.46`, or very wide `tilt 1.26`) read as
  blobs / dinner plates in screenshots. Measuring the real Whimlet crochet
  roses gave: petal ≈ 2× longer than wide, outer ring opened ≈ 68°, inner
  ring ≈ 46°, head leaning ≈ 0.5 rad toward the camera. Encoding that once
  as `BLOOM` and reusing it everywhere is why the four scenes now match.

### Bouquets gather at the neck, then fan out
- A ring of stems leaning *inward* looks right from above and wrong from
  the front: stems pierce the cone. Real bouquets do the opposite — stems
  meet inside the wrap (radius ≈ 0.1) and heads fan outward. The math is
  `tilt = -atan2(headRing - neckRadius, headY)`. Same fix applied to the
  hero and the studio.

### Rotations move the *root*: check where the head lands
- Laying the process flower down with `rotation.z = -90°` maps its +y onto
  +x, so a root at the box's right wall swings the head *out* of the box.
  Rule: when rolling a hierarchy, place the pivot on the side the tip will
  swing away from. Cheap to catch in a per-stage screenshot sequence
  (`/tmp/pw/proc.mjs` scrolls to 5 fractions of the section).

### Measuring, not guessing
- `gl.info` resets every frame by default and counts *every* render pass,
  so reading it once shows 1 call (the last shadow pass). Set
  `info.autoReset = false`, accumulate for a second and divide by frames —
  that is the `?stats=1` probe in `Stage.tsx`. Keep it behind a URL flag so
  production pays nothing.
- SwiftShader fps numbers (1–6) are meaningless for real devices; the
  draw-call and triangle counts are the transferable metric.

### Screenshot discipline (additions)
- Never run two Chromium captures in parallel and never start one while
  `rebuild.sh` is restarting the server — both produce a stale frame of the
  *old* build and cost a debugging loop.
- `?intro=hold` + click "Unwrap" + timed captures at 0.6/1.2/2/3.5 s is the
  only way to review the staged door bloom; a single late shot misses it.
- Framer `whileInView` sections stay blank in full-page captures — capture
  per section with `scrollTo` + a wait, not one tall screenshot.
- `python3` here has no PIL; crop/montage with the repo's `sharp`.

### 2026 trend research, applied not copied
- "Cute-alism" / "Snug Simple" / "Human Scribble" (Vistaprint, Ginger IT
  2026 trend round-ups) match what Whimlet already does — pastel blocks,
  rounded clay UI, handwritten stickers — so the overhaul refined the
  system instead of restyling it. The best-Three.js-sites round-ups agree
  on one confident, well-lit centrepiece with scroll as the narrative
  device; that is why effort went into *one* bloom system and directed
  beats rather than more props.

## v0.7.0 — realism without a new renderer

### "More realistic" for pastel crochet is *material + light*, not polycount
- The requests that moved the needle, in order of visual payoff per cost:
  1. one real shadow-casting key light onto a tinted `ShadowMaterial`
     plane (objects finally sit on the table; the blurred ContactShadows
     blob had no direction and no contact edge);
  2. a knit **albedo** map on top of the bump map (bump vanishes in flat
     light and at grazing angles — the faint ±7 % tint keeps stitches
     readable everywhere);
  3. silhouette detail on the flower: scalloped rims, cross-cup, folded
     leaves, bent stems, knots + calyx. Sphere segment counts went
     12×14 → 16×18; triangles per hero ~2×, draw calls barely moved
     because everything new is instanced or merged.
- Things that did NOT help and were skipped: HDRI environments (network,
  and they grey out pastels), post-processing bloom (fights the flat
  tone-mapping decision from 0.5.0), higher DPR.

### Shadow policy that survived testing
- `PCFShadowMap` (not PCFSoft) so `shadow.radius` feathers the edge.
  `bias −0.0005`, `normalBias 0.05` — thin cupped petals show acne at
  smaller normalBias. Keep the ortho frustum tight (`shadowSize` per scene);
  every extra unit costs resolution.
- Flag every see-through / floating decorative mesh `userData.noShadow`
  (particles, glows, sparkles, clouds, tissue): clouds 2 m up otherwise drop
  big grey blobs on the table. A throttled `scene.traverse` marking casters
  once is far cheaper than touching 60 mesh sites and catches late
  `Entrance` arrivals.
- Low tier keeps shadow maps OFF and the old ContactShadows path — verified
  with `?quality=low`.

### Geometry recipes worth reusing
- Ribbon loop = `ExtrudeGeometry(thin rectangle, { extrudePath: teardrop
  CatmullRom })`. A torus can never read as ribbon; it reads as a tyre.
- Yarn wraps = bands of 3 parallel strands whose circle radius is
  `sqrt(R² − lift²)` so they hug the sphere; rotate bands by the golden
  angle. Random single toruses read as rubber bands.
- Stems as `TubeGeometry` along a 3-point curve, with `curve.getPoint(f)`
  feeding leaf and head positions — the bend is free and nothing detaches.

### Process notes
- The sandbox wiped `node_modules`, `.next`, `/tmp/pw` and git history
  again *and* the GitHub token had expired the turn before; the uncommitted
  0.6.0 work survived only because the working tree is auto-saved.
  Recovery = `git reset --soft origin/<branch>` + commit + push, then
  `npm ci`, `npm i` puppeteer-core/@sparticuz/chromium in `/tmp/pw`.
- `npx eslint` without a flat config is a dead end in this repo (v10 +
  legacy .eslintrc); rely on `tsc --noEmit` and `next build`'s lint.

## v0.8.0 — cursor, arrival, stitched type

### Custom cursor: CSS-native beat JS by every metric that mattered
- Problem: "heart-shaped cursor". Two routes — a JS-driven DOM element that
  follows `pointermove` (what most "custom cursor" tutorials do) or CSS
  `cursor: url(data:image/svg+xml,…)` with per-state values.
- Chosen: CSS. Zero JS, zero layout on move, no lag at low frame rates, no
  `cursor: none` (so nothing breaks in iframes, over scrollbars or when
  focus leaves the window), and screen readers / keyboard users are
  untouched. SVG data-URIs are ~1 KB each; hotspot `5 5`; every declaration
  ends in a keyword fallback. Limitation accepted: cursor images cannot
  animate — hover feedback comes from the *elements* (sheen, lift), not the
  pointer.
- Gate it with `@media (hover: hover) and (pointer: fine)`. Headless
  Chromium (and CDP `Emulation.setEmulatedMedia`) reports `pointer: fine`
  false, so computed styles won't show the heart in Puppeteer. Verify by
  reading `document.styleSheets` for the media rule and by rasterising the
  SVGs with sharp — screenshots never include the OS cursor.
- Root cause of a subtle conflict: R3F scenes wrote `gl.domElement.style
  .cursor = "pointer"` on hover, and an inline `style` beats any stylesheet
  rule. Fix: canvases now set `dataset.cursor = "pointer"` and CSS maps
  `[data-cursor="pointer"]` to the heart. Rule for the future: **3D code
  signals intent with attributes; the theme decides the visual.**
- Add a `feDropShadow` to cursor SVGs: on the blush page a flat blush heart
  loses its edge; a 1 px rose shadow keeps it legible everywhere.

### Arrival beat and the first frame
- First `useFrame` tick pays for shader compilation (hundreds of ms on the
  door scene), so a time-based entrance keyed to `clock.elapsedTime` was
  half over before anyone saw it. Hide the object on frame 1, start the
  clock on frame 2. Applies to every timed entrance, not just this one.
- Ribbon "ties itself" = scale the bow loops with a 0→1 `tie` scalar over
  0.5 s after touchdown. Cheap, and it sells the box as *just wrapped*.

### Stitched type
- Per-letter clip-reveal + `filter: blur(4px→0)` + a fading `textShadow`
  glow reads as thread pulled through rather than text fading in. Keep the
  glyph wrappers `inline-block overflow-hidden` with a little `pb` so
  descenders of the script face aren't clipped. Same DOM for SSR and
  reduced motion (variants undefined) — no hydration branch.
- A hand-drawn underline (`.u-hand::after`, SVG, `clip-path` inset) needs
  `isolation: isolate` on the parent, otherwise `z-index: -1` drops it
  behind the section background and it silently disappears.
- `Reveal` exposes `is-inview` so CSS-only flourishes can ride the same
  IntersectionObserver instead of adding a second one.

### Process
- A `[pageerror] Cannot read properties of null (reading 'addEventListener')`
  appeared once in a tour run and never again — `gl.domElement` was null
  after a context loss swapped the fallback in during a long headless
  session. Guard listeners on `gl.domElement`; don't chase it further.
