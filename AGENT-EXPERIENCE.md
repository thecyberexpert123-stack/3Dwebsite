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

## v0.9.0 — outdoors, glass, and a real finishing pass

### Post-processing over a transparent canvas is a trap
- Problem: adding the same `EffectComposer` (N8AO + Bloom) to the hero,
  whose canvas is `alpha: true` over the page, made the *bouquet vanish* —
  only the cone, yarn ball and thread survived, and every draw call on the
  page's pastel background went grey-washed.
- Root cause: the composer renders to an opaque HalfFloat target, and N8AO
  composites with its own beauty pass; alpha is not carried through the
  chain the way `MeshStandardMaterial` over a cleared-to-transparent
  default framebuffer is. Anything relying on the transparent framebuffer
  (and the cast-shadow-only-in-alpha trick) breaks.
- Decision: post stack **only on opaque canvases** (the meadow door). The
  hero, desk, process and studio canvases stay composer-free; they get
  their "AAA" from shadows, sheen/clearcoat materials and the environment.
  If a transparent canvas ever needs AO, render it opaque over a
  colour-matched backdrop plane instead.

### Outdoor light that reads as a photograph, not a game
- The user's reference (a "toon meadow" hero) *looked* saturated because of
  a filmic curve on a bright HDR sun — not because the greens were neon.
  Neon vertex colours + a hard clip at 1.0 is exactly what reads as
  "game NPC colour". Fix = restrained albedo (`#4e7a3b → #b5cf78`), a sun
  above 1.0, `ToneMappingMode.NEUTRAL` in the composer, bloom threshold 1.0
  so only the sun blooms. Same materials, far more natural.
- Programs bake the tone-mapping function in. Switching `gl.toneMapping` at
  runtime (low tier without a composer) requires `material.needsUpdate`
  on everything already compiled, or half the scene stays clipped.
- Sky dome: `ShaderMaterial` with `toneMapped = false` and `fog = false`,
  `BackSide`, `depthWrite: false`, `renderOrder −2`. Fog colour must equal
  the horizon colour or the hills get a visible seam against the sky.
- Camera framing must respond to aspect: a box that fills 45 % of a 16:9
  frame bleeds off both sides of a 9:19 phone. Multiply `z` by
  `clamp(1/aspect, 1, 1.9)` in portrait.

### Instanced grass for one draw call
- `InstancedMesh` + `onBeforeCompile` patch in `<begin_vertex>`: bend by
  `uv.y²` (root stays put), phase from the instance matrix translation,
  two sine waves = gusts. `customProgramCacheKey` so three doesn't share the
  patched program with unpatched standard materials. Blades are
  `receiveShadow` only and `userData.noShadow` — 9 000 shadow casters would
  cost more than the entire rest of the scene.
- Don't set `vertexColors: true` when the *geometry* has no `color`
  attribute — three reads garbage; `instanceColor` is picked up on its own.
- Keep a clear radius under the lens (z > 1.7 for a camera at z ≈ 3.9);
  blades that intersect the near plane read as black shards.

### Liquid glass in CSS
- Layers that work: backdrop-filter `blur(14px) saturate(1.6)` (the
  frosting) + a `::before` with *two* inset rims (top-left bright, bottom-
  right dimmer) and a pale inner shadow (the bevel) + a `::after` radial
  highlight positioned by `--mx/--my` (the moving specular). The bevel is
  what sells it; blur alone is 2015 glassmorphism.
- Real refraction = `backdrop-filter: url(#svg-filter)` with an
  `feDisplacementMap` whose map is built from two `feImage` gradients
  (R ramps at the left/right edges, G at top/bottom, flat 0.5 elsewhere)
  summed with `feComposite arithmetic`. Chromium only. Safari *parses*
  it and renders nothing, so `@supports` is useless — gate by UA
  (`userAgentData.brands` → fallback regex) via `html.glass-bend`.
  Headless Chromium confirmed: computed `backdrop-filter` shows the url()
  and the button renders; the bend itself can't be judged from stills.
- `.btn > * { position: relative; z-index: 2 }` keeps text above the
  pseudo layers; `isolation: isolate` keeps `::before/::after` inside.

### Process
- SwiftShader + EffectComposer is *very* slow (≈1–2 fps at 960×600). Use
  `quality=mid`, small viewports, `protocolTimeout` ≥ 10 min in puppeteer,
  and long waits — otherwise `captureScreenshot` times out and looks like a
  page crash. Always check `[pageerror]` separately before concluding.

## v0.9.1 — honest progress, more air in the glass

- "Loading screen" progress must be tied to real milestones or it is a
  lie users can feel: `dynamic()` chunk resolved ⇒ component mounted
  (`onMount`), first `useFrame` ⇒ shaders compiled (`onReady`). Between
  milestones, ease toward a *ceiling* (38 % / 86 %) rather than fake a
  linear bar; the jump on each milestone is what makes it feel responsive.
- Glass that reads as glass needs more transparency than feels safe in
  a mock-up: tint alpha ≈ 0.1–0.2 with `saturate(1.7)` on the backdrop.
  Legibility then comes from the bevel rims + `brightness(1.05)`, not from
  the fill. White-text buttons (WhatsApp) are the exception — they need
  ≥ 0.6 tint to keep contrast.
- Keep the loading backdrop the brand wash and fade the opaque canvas in
  over it; a flat sky-blue first paint read as a broken page.

## v0.10.0 — the meadow is the hero

- **Research distilled to patterns, not looks.** The cozy/cute 3D sites that
  win awards share five moves: one hero object rendered *with weight*
  (contact shadow, rim, soft bloom), scroll as narrative, an explorable or
  at least continuous *place*, set dressing with direction (butterflies,
  petals that travel somewhere), and a palette that survives from loader to
  last section. Apply the moves; never copy a scene.
- **Continuity beats novelty.** Users asked for "more aesthetic" after the
  door already looked good — the real gap was that the door opened onto a
  *different* world (pink card, framed studio). Putting the studio on a
  blanket in the same meadow fixed "solid colour" more than any new effect.
  Confidence: high (visual before/after in `docs/qa/v0.10.0-*`).
- **"Solid colour" is usually a missing layer, not a wrong colour.** The
  sections were the right pinks; they read flat because pattern sat directly
  on a single fill. Large radial colour blooms + a 6 % paper grain fixed it
  with zero new elements. Avoid `mix-blend-mode` on a fixed full-page layer —
  it forces recomposite on scroll; low-alpha plain grain is enough.
- **Stylised grass = four colour layers, not more blades.** Root fake-AO,
  body, sunlit tip, world-space patch tint (+ translucency toward the sun,
  in view space: transform the world sun direction with `viewMatrix`
  before dotting with `vViewPosition`). Hooked into `MeshStandardMaterial`
  via `onBeforeCompile` at `<color_fragment>` / `<dithering_fragment>` so
  shadows/fog/tone mapping keep working. Confidence: high.
- **Post on the hero required opacity, not a workaround.** Earlier note
  ("Post on transparent canvas breaks it") stands; the fix was making the
  hero canvas opaque with its own sky+fog — which the meadow provided for
  free. Keep `LowTierToneMapping` (now shared in `Stage.tsx`) for the
  composer-less simple tier.
- **Layout-aware camera > responsive DOM tricks.** With the canvas full-
  bleed, framing the subject into the free column (`size.width >= 1024`)
  and into the open top half on portrait phones (`pos.z += 2.2`,
  `look.y -= 1.05`) is one `useFrame` branch; no duplicate scenes.
- **Reduced motion is also the fastest QA lens.** `prefers-reduced-motion`
  jumps the intro clock to the end, so a settled-composition screenshot
  costs ~60 s under SwiftShader instead of 4 min waiting for the intro.
- **Glass over a live scene needs a milkier pane.** `.glass-panel` (alpha
  .12–.26) was right over flat pastel; over grass and sky the body copy
  lost contrast. `.hero-panel` raises the fill to .4–.58 with
  `blur(22px)`. Rule: transparency budget scales inversely with backdrop
  busyness.

## v0.11.0 — one engine, one transition, a different axis per section

- **"Looks the same all over" is a motion problem before it is a colour
  problem.** Every section used the same Reveal (fade-up 26 px) on the same
  grid; the colour pass in v0.10 could not fix that. The fix that worked
  is structural: one shared *transition between* sections (`Beat`) plus a
  *different axis* inside each (scrub-read text → fan → sideways → depth
  stack → pinboard → column parallax). Confidence: high (before/after in
  `docs/qa/v0.11.0-*`).
- **Inertial scroll must own the scroll locks.** With Lenis, a modal that
  only sets `body.overflow=hidden` keeps receiving wheel deltas; the page
  jumps when the lock lifts. Centralise: `lockScroll()/unlockScroll()`
  (ref-counted) → `lenis.stop()/start()` + body overflow, and mark nested
  scrollers with `data-lenis-prevent`. Also disable CSS `scroll-behavior:
  smooth` while Lenis is on (double-easing on anchors).
- **Touch stays native.** `syncTouch:false`; phones already have inertia
  and every "smooth" desktop trick (pinned strips, sticky stacks, section
  peel) is gated behind `useDesktopPointer()` — the same three conditions
  (≥ width, `hover:hover`, `pointer:fine`) everywhere, one hook.
- **Headless Chromium cannot emulate `hover:hover`/`pointer:fine`**
  (`emulateMediaFeatures` rejects them; blink-settings flags are ignored).
  Ship a QA override (`?pointer=fine`) like `?quality=`/`?intro=` rather
  than fight the browser. Reduced-motion *can* be emulated.
- **Pinned horizontal strips: measure travel, do not compute it.** The
  first version derived the track width from card count × rem in CSS calc
  and drifted with padding/fonts; `ResizeObserver` on the track writing a
  MotionValue (`scrollWidth − innerWidth`) is exact and resize-safe.
- **Sticky card stacks need short gaps.** 14vh gaps left one-and-a-half
  cards visible at rest (read as a broken grid); 9vh + top offsets of
  `22vh + i·1.1rem` gives a true pile. Keep the last card un-shrunk.
- **A `Beat` wrapper creates a stacking context per section.** Anything
  that used to overhang the next section (scallop trims at `bottom:-13px`)
  needs explicit descending z-index on the wrappers or it is clipped.
- **Environment note:** the sandbox loses node_modules, .next, /tmp
  tooling *and* apt access between turns; the sparticuz chromium tarball
  still contains the AL2023 libs (`/tmp/al2023/lib`) — extract from the
  package instead of trying `apt-get`.


## v0.12.0 — a full studio, a design file, and one honest grey plate

- **A configurator with 24 options needs pacing, not a longer form.** The
  research (Etsy custom-bouquet listings for *what* people ask; configurator
  UX write-ups for *how*) agreed on the same shape: one group at a time,
  the camera moves to what you are editing, swatches not dropdowns, undo
  and reset always at hand. The step rail + sheet + directed `Rig` is that
  shape. What the write-ups did not say and the screenshots did: the sheet
  hides the subject. Shift the *projection* (`camera.setViewOffset`) rather
  than the camera so the piece slides out from under the glass without
  changing the angle you look at it; clear the offset when the sheet closes
  and re-apply after resize (R3F rebuilds the projection). Confidence: high.
- **`ContactShadows` on an `alpha:false` canvas paints a grey plate.**
  Root cause, not a guess: drei renders the depth pass into its own render
  target with `scene.background = null`, expecting a transparent clear; on
  an opaque context three's `WebGLBackground` has `clearAlpha = 1`, so the
  cleared target is opaque and the blurred "shadow" is the whole 8×8 plane.
  Bisected by removing the shadows (plate gone), then by tier (`?quality=low`
  = ContactShadows, `high` = shadowMaterial plane — no plate). Fix:
  `gl.setClearAlpha(0)` in `onCreated` for opaque canvases — the visible
  buffer has no alpha channel so nothing else changes. Also keep the sky
  dome on **layer 1** so it never enters any secondary pass. Applicability:
  any drei helper that renders the scene to a target (SoftShadows,
  AccumulativeShadows, Reflector) on a canvas created with `alpha:false`.
- **Move the test summary to the end of the file.** `design-tests.mjs`
  printed "N passed" and `process.exit`ed in the middle; 30 new tests
  appended below "passed" by never running. Test files should end with
  the summary and nothing should follow it — same lesson as CI steps.
- **A portable file needs a strict reader more than a rich writer.**
  `parseDesignFile` refuses > 64 KB, requires `format`/`config`, runs the
  same `sanitizeDesign` as the URL path, and reports per-field *warnings*
  rather than failing — the maker still opens an old or hand-edited file
  and sees what was normalised. Share links diff against the default so
  a blank design is `?design=` of ~10 chars and a full one stays ~200.
- **Continuity beats novelty, again.** The door's lid was already opening;
  the user still read it as broken because it left the frame and the hero
  showed a *closed* box. Hinge the lid on its back edge, cap the rotation,
  let the ribbon slacken, and put the *same* box open on the blanket. One
  `open` prop on `GiftBox` was the entire hero change.
- **Anchor mobile drawers to a measured bar, not a rem guess.** The bottom
  bar wraps differently per viewport (the summary alone is 1–2 lines); a
  `ResizeObserver` → CSS variable (`--bar-h`) keeps the tabs and sheet
  sitting exactly above it. Also clamp the phone summary to one line —
  the studio stage is the product on a phone, not the sentence.
- **Environment note:** a stale `next start` that predates new routes keeps
  answering 404 after a rebuild (`EADDRINUSE` in the new server's log);
  background `setsid nohup` from the bash tool does not survive the call.
  Use the managed process tool and stop/start it around every rebuild.

## v0.13.0 — a second tool, not a bigger one; and a site that also lives on Pages

- **"Blender-like" for non-experts means Blender's *structure*, not its
  surface.** Research (the Blender manual's Object / Sculpt mode split,
  hotkey sheets, the sculpt falloff/symmetry pages; Womp, Tinkercad,
  SculptGL, Spline for what browsers actually ship) converged on: two
  modes with different pointer semantics, a small vocabulary of soft
  primitives, a gizmo *and* the G/R/S keys, brushes with radius / strength
  / falloff / mirror, and export. Nobody needs dyntopo or booleans to
  describe a crochet bear; everybody needs undo and a clear "what did I
  make" sentence. The Maker is a *separate page* from the guided studio
  because the two answer different questions ("which flower?" vs "what
  shape?") — merging them would have made both worse. Confidence: high.
- **Sculpting on fixed topology is what makes a portable file possible.**
  Primitives are built once, *welded on position only* (`mergeVertices`
  hashes every attribute, so UV seams and hard-edge normals survive unless
  you delete them first — an unwelded sphere tears at the seam under a
  brush). With a fixed vertex count per kind, sculpt detail is just "offset
  per vertex" and the document stays a few KB. Verified: a stroke on the
  bear's head → 674 verts × sparse int16 → 1.1 KB, reopens identically.
- **Store sculpt offsets sparsely.** The first codec wrote every vertex
  (757 × 6 B = 4.5 KB → 6 KB base64 per part) and the very first sculpt
  overflowed the 6000-char share-link budget. Brushes touch a few percent
  of a mesh: (uint16 index, 3 × int16) records made the same stroke 1.1 KB
  and links carry sculpt again. The test suite had encoded the wrong
  assumption ("one sculpted part cannot fit") — tests should encode the
  *design goal* (a typical sculpt fits), not the current implementation.
- **drei `<Outlines>` prop names lie.** `screenspace={false}` is the
  pixel-constant branch and divides by a `size` uniform that was (0,0) in
  this scene → infinite offsets → a spiky halo (seen in QA, not reasoned
  out). `screenspace` pushes vertices along the normal in *object units*,
  deterministic; divide the thickness by the part's mean scale for an even
  rim. Applicability: any drei helper with a `size` uniform on a canvas
  whose context is created before the helper mounts.
- **Stroke spacing along the path, not per event.** Dabbing N times at the
  last sample (the first version) made fast flicks pile up into a blob at
  the end and slow drags draw nothing in between. Blender's spacing model
  — interpolate the pointer in screen space, re-project each step onto the
  surface — costs a few raycasts and makes speed irrelevant to the result.
- **Unicode glyphs are not icons.** ✥ ⟳ ⤢ ▦ ◈ ↶ ← rendered as tofu in the
  site's fonts (Quicksand/Caveat have no dingbats) — every rail button was
  a box in the first screenshot. Inline SVG, always; screenshots before
  reasoning.
- **Two deployment shapes from one config.** `output: "export"` gated by
  `NEXT_EXPORT=1` keeps the Node deployment untouched (per-link OG metadata
  on `/studio`). What the docs say and what breaks: `next/link`, the router
  and the metadata API honour `basePath`; **`next/image` with
  `unoptimized` does not**, nor do raw `<img>`, hand-built share URLs,
  JSON-LD, or sitemap/robots — 12 render sites + 5 helpers needed
  `withBasePath()`. `generateMetadata` may exist in export mode as long as
  it never *awaits* `searchParams`. Verified by serving `out/` under
  `/3Dwebsite/` with a 404 fallback and walking home / studio / maker in a
  real browser (33 images, 0 failed requests) — the only trustworthy check
  for a sub-path deploy.
- **Phones get the tools in the sheet, not on the edges.** A left rail and
  a right drawer both open on a 390 px screen buried the model behind
  glass. The phone layout keeps the table clear: tool strip + add grid
  inside the bottom sheet, properties drawer closed until asked (N), the
  WhatsApp button full-width and never inside a horizontal scroll row.
- **Not verified in this round:** real-GPU frame rate for sculpting
  (SwiftShader makes every stroke ~5 s; the per-dab work is O(touched
  vertices) with `computeVertexNormals` over the whole part, ~750–1700
  verts, which should be far under a frame on a phone GPU but was not
  measured), touch sculpting with a finger (the pointer code path is
  shared, but pinch-vs-stroke arbitration on real devices is untested),
  and `.glb` files opened in Blender (the exporter output is standard
  `GLTFExporter` binary; only its download was observed).

## v0.14.0 — the engine: measure the stall, then move it, don't hide it

- **Problem / context.** "Runs anywhere without a single lag, without
  modifying the website's code." The site had 7 canvases, each with its own
  R3F loop, each compiling shaders on its first rendered frame. The user's
  perception of lag was the *entry hitch* of each section, not steady-state
  fps.
- **Hypothesis.** The studio teaser's mount was the worst offender.
  **Evidence:** a CDP CPU profile attributed ~6.5 s self time to
  `WebGLRenderer.setSize` — misleading; instrumenting `canvas.width` setters
  vs `getProgramParameter`/`getShaderInfoLog` showed the stall is three's
  *deferred link* (`onFirstUse` → `getUniforms`) executing on the first
  draw, plus `checkShaderErrors` round-trips. `setSize` only looked
  expensive because the profile lumped the first frame under it. **Lesson:
  attribute by instrumenting the GL calls themselves, not by the top of the
  JS stack.**
- **Root cause.** `compile()`/`compileAsync()` create programs but three
  still pays link status + uniform reflection on the first draw
  (`WebGLProgram.onFirstUse`). `compileAsync` alone doesn't help on drivers
  without `KHR_parallel_shader_compile` (SwiftShader, several mobile GPUs)
  — and worse, its readiness poll dereferences `currentProgram` on each
  material it saw and **throws if React swapped a material meanwhile**
  (seen: `Cannot read properties of undefined (reading 'isReady')`). Own
  guarded poll, same algorithm.
- **What worked.** (1) Warm-up in idle slices: `renderer.compile()` →
  poll `isReady()` → call `program.getUniforms()` one program per
  `requestIdleCallback` → one off-screen priming frame. (2) A pre-mount
  ring 1100 px ahead so warm-up has time. (3) One scheduler for all roots
  with visibility gating and a frame budget. A/B on the same build
  (`?engine=off`): link/reflection time inside rAF 26.1 s → 5.3 s, worst
  single call 1.9 s → 0.7 s (SwiftShader, relative). **Confidence: high**
  that the mechanism moves the cost off the visible path; **medium** on
  real-device magnitude (not measured on a GPU here).
- **Trap: never gate a *visible* scene on warm-up.** First version held
  every root paused until warm — a section the user was already looking
  at stayed blank for seconds. A hitch beats a blank: warm-up only helps
  scenes mounted ahead of time; visible ones render immediately.
- **Trap: R3F `advance(t)` timestamps are seconds.** In `frameloop="never"`
  R3F writes the timestamp straight into `clock.elapsedTime`, which every
  `useFrame(({clock}))` reads as seconds. Passing rAF milliseconds made
  every idle animation run 1000× fast. Divide first; on the first frame
  and after any >250 ms gap set `elapsedTime = t − 1/60` so deltas stay
  sane (springs/lerps/intros continue instead of snapping).
- **Trap: SVG `className` is an `SVGAnimatedString`.** The animation
  pauser matched nothing on the doodles until it used
  `getAttribute("class")`. Verify with `document.getAnimations()` →
  `playState` per element, not by eye.
- **Design rule honoured: instrument the seams, not the scenes.** The whole
  engine attaches through `AdaptiveCanvas`, `useInViewport` and the root
  layout; scene files are byte-identical except the hero's
  `enginePriority`. Their existing `frameloop` props are still the source
  of truth (mapped to run/pause hints), so any future scene written the old
  way is automatically governed.
- **Server side reality.** `output: "standalone"` + `engine/pack.sh` was
  verified end-to-end (extract to a clean dir, `node server.js`, 200s,
  cache headers, gzip). Docker/Caddy/systemd files are authored and
  reviewed against current docs but **not executed** — no daemon in the
  sandbox. Said so in the README rather than implying otherwise.

## v0.19.0 — "attack-proof" isn't a feature, it's a posture; scope it to the host

**Problem.** Owner asked to make the site "attack proof" and add sign-in +
an advanced admin panel. The trap: promising "attack proof" (no such thing)
and bolting auth onto a host that can't support it.

**Findings (evidence).**
- `npm audit` on v0.18.2 reported **1 high + 1 moderate**, both the `postcss`
  bundled inside Next 15.5.25 (8.4.31): an attacker-controlled
  `sourceMappingURL` arbitrary-file-read family (CVE-2026-45623 /
  GHSA-6g55-p6wh-862q + incomplete-fix follow-ups) and a stringify XSS
  (CVE-2026-41305). Both are **build-time only** for this repo (Tailwind runs
  at build; no user CSS is parsed at runtime) — real, but non-breaking to fix
  with one `overrides: { "postcss": "8.5.23" }`. Do NOT reach for
  `npm audit fix --force` (downgrades/can break Next).
- Next 15.5.25 was a patch behind **15.5.26** (the final 15.5.x), which
  carries the RSC cache-poisoning, image-DoS and Windows-RCE (CVE-2026-75604)
  fixes — a non-breaking `next@15.5.26` pin was the right sized move (no 16.x
  major migration during a feature push).
- **GitHub Pages cannot set HTTP response headers** (long-standing, confirmed
  by GitHub staff in community threads and by their own docs): no CSP, HSTS,
  X-Frame-Options. The legitimate mitigations are (a) a **meta CSP + meta
  referrer** in the exported HTML (weaker — no frame-ancestors/report-uri —
  but non-zero) and (b) full header-grade policy at the *edge* (the Caddyfile
  in the VPS engine), not (c) pretending a `_headers`/`next.config.headers()`
  file will be honored by Pages.
- App layer was already clean: all 11 `target="_blank"` links have
  `rel="noopener noreferrer"`; the only `dangerouslySetInnerHTML` is the
  JSON-LD block; no secrets/`.env` tracked; `.gitignore` covers `.env*.local`.

**Mechanism (reusable).** Treat "attack proof" as: pin deps to *verified
patched* versions (check the npm registry dist-tags, not the advisory page
alone), add an **automated gate** (`npm audit --audit-level=high` in CI) so it
*stays* fixed, ship the strongest CSP the *host* actually supports, and
never invent client-side "security" (localStorage passwords) as a substitute
for a real auth backend.

**Also learned (architecture).** Auth + an admin panel on a *static* Pages
site only has two honest paths: a browser-callable BaaS (**Supabase** —
anon key is designed to ship in the browser, protection comes from RLS not
secrecy) or **adding a Node server** (the engine VPS already exists, or
Vercel). Any "sign-in" written purely in client JS against localStorage is
obfuscation, not security.

**Confidence.** High on the postcss/next facts (registry + advisory DB +
lockfile verified); high that meta-CSP is the correct Pages posture (GitHub
official); medium on real-device CSP interactions (not measurable here).

## v0.18.2 — the whole word writes, not a single clip

**Problem.** The v0.18.1 write-on was honest but a little flat: one clip
edge sweeping across the whole word, so the eye saw "a reveal" rather than
"a signature". Want per-letter hand-feel without the usual costs.

**Fix (mechanism, reusable).** One `@keyframes` pop over transform +
opacity, parameterised per letter by custom properties (`--amp` travel
amplitude, `--rot` entrance rotation, `--pop` from-scale), staggered by a
single `animation-delay: calc(base + i * step)`. The letter "travels" the
line because its translate is `calc(-1 * var(--ravel) * var(--amp) * 1em)`
— the amount is a fraction of *the letter's own* em box, so it needs no
measurement and no per-glyph keyframes. Add a back-out ease so scale and
rotation overshoot past identity and settle, which is what reads as the
pen's flourish. Cost is O(7) elements for a static word — 0 KB of extra CSS.

**Verify per-letter state precisely.** Pause `document.getAnimations()`
(which includes JS and CSS animations) and scrub `currentTime`, then read
each glyph's `getComputedStyle(el).opacity` and parsed matrix — this gives
exact per-letter posture at any timestamp even when the emulator's rAF is
~1 Hz and real time sampling would be meaningless. (Gotcha: framer's
variant-driven children don't scrub the same way through `getAnimations()`;
the letters are plain CSS animations so they do — verify those with real-time
sampling instead.)

**Fonts.** Splitting a cursive/connected-script word into per-letter
inline-blocks is a known trap (GPOS cursive joins + pair kerning break). In
Chromium the rendered widths matched to < 0.1 px, so joining this Latin
subset costs nothing — but always spot-check the split vs. unsplit width
before committing to per-letter spans, and be ready to fall back to the
clip reveal for a script font.

**Confidence.** High on the mechanism (measured), medium on the real-device
feel — still no ability to capture actual device frames here.

## v0.18.1 — a loader must not depend on the thread it is covering for

**Problem.** The owner reported the boot-sequence animations "not coming
properly". In the emulator every state was correct, so the state machine
was not the bug.

**Hypothesis → evidence.** The loader's job is to entertain while the main
thread is at its busiest (first React commit, R3F canvas creation, shader
compilation). The v0.18.0 write-on was a CSS `clip-path` transition armed
from a `requestAnimationFrame` inside an effect, and the stitch was eased
from a rAF loop. `clip-path` and `width` animations run on the main thread
in Blink (only transform / opacity / filter / backdrop-filter are
compositor properties — chromium `core/animation` README), and rAF simply
does not fire while the thread is blocked. So on a real cold start the rAF
fired *after* the block, the transition-delay chain started late or was
skipped when the state had already advanced, and the beats collapsed. The
emulator hid it because SwiftShader's rAF runs at ~1 Hz and the loader was
judged by end states.

**Fix (mechanism, reusable).** Put every visual beat on the compositor:
- Write-on without `clip-path`: an `overflow:hidden` box translating one
  way while its child translates the other by the same amount. The glyphs
  stay still, the visible edge moves, and it is two `transform` animations.
- Progress bar the same way, driven by a CSS `transition` on a custom
  property (`--stitch`) — React only writes the target; the compositor
  tweens it. The percentage number is the one JS-ticked value, deliberately
  decoupled so a hitch there never freezes the visual.
- Sequencing by *fixed delays from one parent timeline* (framer variants
  with per-child `delay`), never by state flips + `transition-delay`.

**Verification method.** Pause `document.getAnimations()` inside the loader
and scrub `currentTime` to 250…2600 ms, screenshot each — this shows the
choreography regardless of how slow the emulator's rAF is. `CSSTransition`s
and `CSSAnimation`s both surface there; framer's WAAPI-backed opacity
animations too.

**Also.** Font subsets are a glyph budget: check the woff2 `cmap` before
using a decorative character (✿ ↻ ↶ ↷ are absent from the Latin subsets
of Quicksand/Caveat/Parisienne); draw the icon instead. And any
scroll-linked 3D tilt (the Beat peel) projects wider than the viewport —
contain it with `overflow-x: clip` on an ancestor that is *not* the
sticky element's scroll container.

**Confidence.** High on the mechanism (spec + measured), medium on the
exact device symptom since real-device frames could not be captured here.

## v0.18.0 — the loading page: a signature, not a gate

**Problem.** The gift-unwrap door was the "surprise on entry", but it asked
the visitor to *do* something before seeing the site, shipped a second R3F
scene before the hero's own, and on slow Android the box itself was the thing
loading. The owner asked for something simpler and more attractive.

**Research (what the evidence says a loader should be).**
- Match the indicator to the wait: < 1 s nothing, 1–3 s a light indicator,
  3–10 s a *determinate* bar; uncertainty is what makes waiting hurt
  (Smart Interface Design Patterns, citing Nah 2004 and Buell & Norton 2011).
- Waits with feedback feel 11–15 % shorter (NN/g via flowwies); a bar that
  moves fast first and slows near the end is perceived as quicker than a
  linear one.
- What wins on Awwwards-class sites in 2024–26: a brand signature (logo /
  wordmark reveal), a 0→100 counter tied to real load where possible, and a
  single directed exit (wipe/lift) — not interactive gates or mini-scenes
  (Framer marketplace survey, svgator round-up, Codrops "page preloading").

**Design.** Wordmark write-on (Parisienne script, left→right clip-path — the
handwriting reads as a signature without needing glyph paths), a heart as the
full stop, a dashed *running stitch* as the progress bar (craft vocabulary),
real stages (window load → hero first frame), status copy that never runs
ahead of the number, and a straight-up curtain with the site's scalloped hem
so the last thing seen is the trim the sections share.

**Verification (emulator).** Desktop, Pixel-8 emulation, reduced motion,
no-WebGL and the skip path all lift; the hero's headline stagger starts after
the lift; `sessionStorage` quick mode 0.55 s; 0 console errors; frozen
write-on frames at 15/45/75/100 % look like a pen stroke, not a wipe.

**Lessons.**
- A "surprise" that blocks entry is a cost, not a gift. Put the surprise
  *after* the door (the meadow growing in) and make the door itself fast,
  honest and brand-shaped.
- With SwiftShader every `requestAnimationFrame` is ~1 s; a progress
  animation that creeps toward a ceiling will *look* stuck at 38 % in the
  emulator. Judge such loaders by their state machine (stages, timers,
  caps), not by emulator screenshots.
- `clip-path: inset()` transitions are compositor-cheap and give a
  convincing handwriting reveal for script fonts — no SVG tracing needed.
- Keep status text derived from the *displayed* number; a line that says
  "ready!" next to "93 %" is a small lie the eye catches instantly.

## v0.17.1 — audit lessons: transforms own your "fixed" overlays; don't double-apply scroll padding

**Method.** Section-by-section screenshot sweep on both viewports plus
flows (intro → door → hero, nav, modal, lightbox, menu), with rect logging
around every overlay and `scrollWidth` at three scroll positions.

**Findings.**
- `Beat` (perspective peel) turns every section into a containing block for
  `position: fixed` descendants. The modal and lightbox had been "working"
  only while the section they lived in happened to be near the top of the
  viewport. Rule: overlays are portaled to `<body>`; never trust `fixed`
  inside a transformed ancestor.
- Lenis 1.3 resolves element targets with `scroll-padding-top` and
  `scroll-margin` already applied. Our extra `offset: −96` doubled it and
  every anchor landed 96 px low — on both platforms, for months, because
  the section eyebrow still looked "roughly right". Check a library's
  offset math before adding your own.
- A `w-max` track translated with `x` inside a pinned section widened
  `document.scrollWidth` on desktop (`body { overflow-x: hidden }` hides the
  bar but not the width; the page could still be dragged sideways on
  trackpads). `overflow-x: clip` on the section fixes it without breaking
  `position: sticky` — `hidden` would have.
- Under SwiftShader a heading photographed at 1.5 s looks cut mid-word;
  that is the reveal in flight at 2 fps, not a bug. Re-shoot at 6 s before
  filing anything about text reveals.

## v0.17.0 — "Android engine": the wins were in the compositor and the monitor, not the scenes

**Problem.** Android felt heavier than desktop and the Process section's 3D
stage was missing while scrolling the steps on phones.

**Evidence.** Pixel 8 emulation (`/tmp/pw/proc.mjs`): the canvas mounted
fine (`canvas:true`), but the stage was only `lg:sticky` — stageTop went
515 → 15 → −584 → −1184 across the six steps. The "missing 3D" was layout, not
WebGL. For performance, the engine already had a scheduler and tier
demotion; the remaining suspects were (a) ~90 elements with
`backdrop-filter: blur(18–22px)` plus an SVG `feDisplacementMap` on every
button (w3c/svgwg#1142, mozilla bug 1731965: GPU-bound in eglSwapBuffers on
Android), and (b) drei's `PerformanceMonitor` default bounds `[40, 60]` /
`[60, 100]` (hz>100), which read a steady 55 fps on a 120 Hz phone as a
decline and demoted flagships.

**Root cause / fix.** Three engine-layer knobs, zero scene edits: a
tier-gated glass budget (`html.glass-frosted|glass-lite` from
`glassLevel(coarse, tier)`), refresh-aware monitor bounds (`monitorBounds`),
and fling-aware frame alternation for secondary scenes (`isFlinging`). The
Process stage is now sticky below `lg` too, and the process camera backs off
for wide aspect ratios (frames were authored for 4:5).

**Lessons.**
- On phones, the compositor cost of glass (blur + SVG displacement under
  many elements) rivals the WebGL cost. Budget it per tier like DPR.
- Any fps-threshold heuristic must know the refresh rate; a fixed 60 target
  on a 120 Hz screen is a false-negative machine.
- When a "3D not showing" report arrives, check the *layout* rects before
  the GL: `useInViewport` gates and sticky breakpoints hide more scenes than
  context loss does.
- Camera frames are authored for an aspect ratio; when the stage's aspect
  changes per breakpoint, compensate in the rig (back off along the line of
  sight), don't re-author the frames.

**Confidence.** Structural (emulator) for the Process fix and glass classes;
performance effect on real Android is reasoned from the cited bugs, not
measured here (SwiftShader ≈ 10 fps, no real device).

## v0.16.1 — Studio layout: measure the band, don't assume the centre

- **`top-1/2` is only the centre of the *viewport*.** Overlays that live on
  top of a full-page stage (bar, sheet, tabs) shrink the usable band; the
  rail and the camera framing must centre in *that* band, measured from
  the real elements (ResizeObserver + getBoundingClientRect), not from the
  viewport. Fixing it as "fit" (camera backs off along its line of sight)
  + "shift" (view offset) keeps the composition instead of squashing it.
- **A collapsible bar needs a default per form factor** and a remembered
  choice — phones fold, desktops open — and the framing must follow it
  (put `barOpen`/`barH` in the measurement effect's deps, plus a 400 ms
  re-measure for the sheet's enter animation).
- **Horizontal scroll rows hide options.** On a 390 px screen a row of five
  glass chips scrolled; wrapping into centred rows costs ~40 px of height
  and makes every group visible — pay the height.

## v0.16.0 — Touch parity: the phone is not a lesser device

- **"Works on mobile" hid a lesser site.** Grep the gates before believing
  the audit: `useDesktopPointer`, `finePointer`, `!isMobile`, `hover:hover`
  fenced off six choreographies, the 3D desk and *every* pointer-driven
  motion (R3F's `pointer` never moves without a mouse). The v0.15 audit
  checked layout and errors; it did not ask "what is missing".
- **Tier from the GPU string, not the UA.** `/Android/ → −1` treated a
  Snapdragon 8 Gen 3 like a Helio G35. `WEBGL_debug_renderer_info` gives
  the IP block (Adreno 750, Mali-G715…) with no prompt; bucket it as a
  prior and let PerformanceMonitor correct it. Core count is meaningless on
  phones (budget chips have eight); memory is the only other honest signal.
- **Runtime demotion must be one-way, once per canvas, session-scoped.**
  Stepping the *tier* (not just DPR) changes particle counts, post stack and
  shadow maps; do it when DPR is already 1 and still declining, or when the
  monitor gives up (`onFallback`) — on SwiftShader the hero took ~40 s to
  get there via `onDecline` alone. Lock shadow-map on/off at first measured
  tier: flipping it on a live context leaves compiled programs sampling a
  stale map.
- **Parity is decided once per page.** Layout that reflows under a thumb
  (grid → sticky stack) is worse than a slightly heavy page; the demotion
  is remembered in `sessionStorage` for the *next* page instead.
- **Feed the pointer, don't fork the scenes.** Writing the tilt into
  `state.pointer` inside `EngineRoot` right before `advance()` made every
  scene's parallax/nudge/Breeze work on touch with zero scene edits. Rest
  pose follows the hand (exponential, τ 3.2 s) so any grip is centre; a
  real finger owns the pointer for 800 ms.
- **Research the permission before shipping a sensor.** Chrome 151 (2026)
  added `DeviceOrientationEvent.requestPermission()` (Safari since iOS 13);
  listeners stay silent until it resolves. Ask silently when the Permissions
  API already says granted, else from a deliberate tap on a canvas — never
  the welcome door, never an ambush on load. Remember refusals per session.
- **Trap: headless synthetic taps aren't user gestures** for permission
  APIs — the gesture path can only be armed-and-inspected here, not proven.
- **Trap: choreography offsets are viewport-sized.** The card fan's
  `−k·150 px` was designed for a 1024 px row; on 390 px it produced a 446 px
  scroll width. Redraw the *same gesture* for the phone grid (per column)
  rather than scaling numbers down until nothing overflows.
- **Trap: don't call side effects inside a React state updater** (the first
  `onDecline` did `demoteTier()` inside `setDpr(d => …)`); mirror state to a
  ref and decide outside.

## v0.15.0 — Android without touching the components

- **Audit before assuming.** A Pixel-class emulated walk (390 px, touch,
  Android UA, DPR 3) of every section + `/studio` + `/maker` showed the
  layout already held: no horizontal overflow, 3D scenes gated and
  low-tier, glass sheets stacked for phones. What was *missing* was the
  platform layer: manifest/icons, safe areas, hardware Back, keyboard
  handling, tap/overscroll hygiene. That is where the work went.
- **Hardware Back is the one behaviour Android users notice.** Every
  overlay already closed on `Escape` via a window listener, so the shim
  pushes a history entry per open `[role=dialog][aria-modal]` and turns
  `popstate` into a synthetic `Escape` — zero component edits. Verified:
  menu, product sheet and lightbox close on Back and the page stays;
  closing with × consumes the entry (`history.back()` from the observer).
  Exclude the welcome door: Back there must still leave.
- **Trap: the Next app router rewrites `history.state` on popstate**
  (`replaceState` right after our pop), so never rely on reading our flag
  *after* navigation — decide from the pop event's own `state` and from the
  live set of open dialogs. A first version that read `history.state`
  afterwards was flaky (closed on 1 of 3 runs).
- **Trap: `history.length` never shrinks** — test the flag in `state`, not
  the length.
- **Trap: SVG `className` again** (see v0.14.0) — the same
  `getAttribute("class")` rule applies to any DOM scan.
- **Hit areas via pseudo-elements, but not on the glass buttons.**
  `.btn-glass` already spends `::before/::after` on bevel and specular; a
  generic `button::before` hit-area rule would have replaced the bevel.
  Scope the rule to the small controls (`button[aria-pressed]:not(.btn)`)
  and verify the glass still renders.
- **Android compositing:** a `mix-blend-mode` fixed layer over the page
  forces a full re-composite per scroll on mobile GPUs; at 3–5 % alpha a
  plain layer is visually identical. Also switch off `text-size-adjust`
  or Chrome's font boosting inflates paragraph copy in narrow columns.
- **Manifest via the metadata route, not a static file:** `manifest.ts`
  can call `withBasePath()`, so the same source serves `/` on the VPS and
  `/3Dwebsite/` on Pages (verified in `out/`). `.well-known/assetlinks.json`
  must be at the *origin* root — a project Pages site can't host it for a
  TWA; the README says so instead of pretending.
- **Skipped a service worker deliberately.** Chrome's install criteria no
  longer need one, and a cached WebGL bundle that outlives a deploy is a
  support nightmare (chunk-load errors we already met in dev). Revisit only
  with a network-first, hash-scoped strategy and a kill switch.
- **Not verified:** the real install prompt, TWA build, and any real-device
  GPU behaviour — no Android toolchain or device here; emulation only.
