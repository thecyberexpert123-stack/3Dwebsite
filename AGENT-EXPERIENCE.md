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
