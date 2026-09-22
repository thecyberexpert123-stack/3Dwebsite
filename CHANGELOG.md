# Changelog

All notable changes to the Whimlet website are documented here.

## [0.1.0] — 2026-09-20

Initial release. Full single-page boutique experience for Whimlet (handmade
crochet), built with Next.js 15 · React 19 · Tailwind v4 · React Three Fiber ·
Framer Motion.

### Added — experience & sections
- Signature **hero**: editorial copy ("Little Stitches. Big Feelings.") beside
  an interactive **3D crochet studio scene** (bouquet, yarn balls, hook, loose
  thread, floating heart, gift box, tiny daisies) with cursor parallax, scroll
  drift and handwritten floating annotations.
- Story beat ("Made Slowly. Made Specially.") with soft parallax imagery.
- Editorial category showcase ("Find Your Little Something") — organic rounded
  cards, tilts, hover depth.
- Featured products grid ("Made To Make You Smile") with category filters,
  hover hearts, and a **product detail modal** (focus management, Escape,
  scroll lock) whose "Ask About This Piece" CTA opens WhatsApp with the
  product name prefilled.
- **Custom-order wizard** ("Dream It. We'll Crochet It.") — 5 guided steps +
  review, validation, and a composed WhatsApp enquiry; decorative 3D
  "customization desk" still life (frameloop-on-demand) with image fallback.
- **Colour customizer** ("Imagine it your way.") — live 3D blossom that lerps
  between Pink / Cream / Red / Lavender / Sage / any custom hex, with an
  "Enquire in This Colour" WhatsApp CTA.
- Occasions grid, "Why Handmade?" principles, "The Whimlet Story",
  scroll-animated **process timeline** (Yarn → You), masonry **gallery** with
  filters + accessible lightbox, testimonial carousel (placeholder copy),
  FAQ accordion, closing CTA ("Let's Make Something Lovely."), social strip,
  bark-coloured footer.
- Floating translucent **navbar** (compacts on scroll down, expands on scroll
  up) with full-screen animated mobile menu.
- **Floating WhatsApp button** with tooltip and gentle entrance.
- Brief **loading screen** (yarn heart drawing) capped at ~1.2s, client-only.

### Added — engineering
- Tailwind v4 design-token system (palette, fonts, shadows, motion) + subtle
  gingham fabric backgrounds and film grain.
- Data-driven content layer (`src/data/*`) ready for future CMS integration.
- Self-hosted fonts via `next/font/local` (builds need no network).
- Accessibility: semantic landmarks, skip link, single H1, aria labelling on
  all interactive widgets, keyboard support (Esc/arrows), focus-visible
  states, and `prefers-reduced-motion` honoured in both DOM and 3D motion.
- SEO: metadata + Open Graph/Twitter cards, Organization + FAQPage JSON-LD,
  SVG favicon with stitch-heart motif.
- Performance: 3D lazy-loaded via dynamic import with static fallbacks;
  WebGL capability detection; reduced scene complexity on mobile; capped DPR;
  local (non-fetched) environment lighting; images pre-optimized via
  `npm run optimize:images` (ImageMagick) — ~668 KB total imagery.

### Honesty guarantees
- No prices, stock, policies, founders, locations or social handles invented.
- Product/gallery images are AI-generated placeholders (documented in README).
- Testimonials are unattributed sample copy, clearly marked in data files.

### Known limitations
- Interactions verified via production build + served HTML checks; not yet
  exercised in a real browser (see AGENT-EXPERIENCE.md).
- A few planned photos (yarn basket, sketchbook, wrapped parcel, desk still
  life) were not generated due to tool limits — current build uses tasteful
  reuse and SVG doodles; slots are ready for real photography.

## [0.2.0] — 2026-09-20

The "more 3D, more motion" release: a real 3D Design Studio, an interactive
gift scene, and richer animation across the page.

### Added — 3D Design Studio (`#studio`, replaces the colour demo)
- Full product configurator: flower/bouquet · rounded/pointed petals · petal
  count 4–8 · petal, centre & ribbon colours with custom hex pickers ·
  mix-pastel mode · stem length · leaves · bouquet size 3/5/7 · wrap toggle.
- Live animated 3D preview: colour lerps, petal/stem pop-ins with a soft
  overshoot, framing glide between flower and bouquet, gentle idle turn.
- **Drag-to-spin** implemented manually with `touch-action: pan-y`, so
  horizontal drags rotate the design while vertical swipes still scroll the
  page on mobile (OrbitControls was rejected — it traps page scroll).
- Presets (Blush Rose · Sunny Day · Lavender Cloud · Sage Garden), Surprise Me
  randomizer, Reset.
- **Shareable design links** (`?design=…` base64url, strictly sanitized on
  read) with clipboard copy + manual-copy fallback.
- Live plain-language design summary (aria-live) reused as the WhatsApp
  enquiry message — the design the customer built is exactly what the business
  receives.
- Domain logic isolated in `src/lib/design.ts`; verified with 16 passing
  unit checks (round-trips, tamper rejection, business rules, 5,000 random
  configs).

### Added — more 3D & animation
- Interactive **3D gift box** in the closing CTA: tap to swing the lid open
  and release five little hearts (canvas click + accessible HTML toggle).
- Hero scene: two more floating hearts, three twinkling sparkles, slowly
  spinning yarn balls, subtle idle drift; word-by-word staggered headline;
  annotations now float with staggered timing.
- **Viewport gating**: the hero canvas flips to frameloop "never" when
  off-screen; accent scenes mount only near the viewport — more canvases
  without more cost.
- Pointer-tracked **3D tilt** on product and occasion cards (direct DOM
  writes, no re-renders; disabled for touch/reduced-motion).
- Soft **stitch marquee** band between the shop and custom-order sections.
- **Scroll-progress stitch bar** at the top of the page.
- Cross-links: the custom-order wizard ↔ the 3D design studio.

### Fixed / hardened
- Bouquet flowers now lean inward (real bouquet geometry) so stems stay
  inside the wrap cone — previously vertical stems would pierce it.
- Design link state is computed post-mount, eliminating an input-value
  hydration mismatch.
- Gift scene resets the pointer cursor on unmount (no stuck cursor).
- Removed the now-unused `colourCustom` WhatsApp helper.

### Performance
- First-load JS grew only 176 kB → 181 kB; all 3D remains in lazy chunks.
- Three of four canvases are viewport-gated; the desk scene is still
  frameloop-on-demand.

## [0.2.1] — 2026-09-20

### Added — GitHub CI verification
- `.github/workflows/ci.yml`: on every push to the work branch, GitHub Actions
  verifies the project on a clean runner — `npm ci` (lockfile-exact install) →
  design-domain tests → production build (which includes full TypeScript
  checking). Also triggerable manually via `workflow_dispatch`.
- `scripts/design-tests.mjs` + `npm run test:design`: the 16-check suite for
  `src/lib/design.ts` (URL round-trips, tamper/garbage rejection, bouquet
  business rules, hex normalization, 5,000-random-config stability, preset
  round-trips, WhatsApp message shape) — previously run ad-hoc, now committed
  and repeatable anywhere.

### Maintenance
- Restored the local clone after the sandbox reset `.git` to its initial
  state between sessions (work was safe on GitHub; branch pointer re-fetched
  and verified byte-identical via tree-SHA comparison before resetting).

## [0.3.0] — 2026-09-20

### Added — the sketch pad (draw your own petal, for real)
- New studio control: "✏️ Draw". Draw one petal in one stroke and a geometry
  pipeline cleans it into a bloomable outline: arc-length resampling →
  Laplacian smoothing → polar resampling (closes gaps, removes double-backs,
  guarantees a simple polygon) → mirror symmetrization → normalization.
- The smoothed outline is extruded into real 3D crochet-petal geometry
  (beveled, gently cupped, hand-wobbled like the built-in petals) and used by
  every flower in the studio — single blooms and bouquets alike.
- Live feedback: smoothing runs while you draw; a radial SVG preview shows
  exactly how the petals will arrange; a "mirror it evenly" toggle re-smooths
  instantly; existing sketches can be re-opened and refined.
- Hand-drawn designs are first-class: the outline rides in the `?design=`
  share link (strictly validated — tampered data falls back safely) and the
  WhatsApp message says the petal shape is your own sketch.
- Two new presets built on sketched outlines: **Tulip Sketch** and
  **Wildflower Mix**. "Surprise me" now occasionally cuts a fresh organic
  petal (15%).

### Added — cozy ambient motion everywhere
- New `three/anim.tsx` toolkit: `Sway` (multi-axis breeze), `DustMotes`
  (warm fibres drifting through the light, one draw call), `FallingPetals`
  (little crochet petals tumbling like snow), `BreathingLight` (soft
  candle-like pulse).
- Flowers now sway in layers — whole plant, head, and individual petal
  flutter — in the hero, the desk, the gift scene and the studio.
- The customization desk (custom-order section) went from render-on-demand
  static to a living scene: spinning yarn, swaying flower, drifting dust,
  twinkle stars — viewport-gated so it still costs nothing off-screen.
- The gift box breathes gently while closed; the studio camera drifts
  softly toward the pointer.
- All new motion respects `prefers-reduced-motion` (verified per scene).

### Changed
- Domain tests extended 16 → 46 checks: the full sketch pipeline is now
  covered in CI (resampling, smoothing, symmetry, quantization round-trips,
  URL round-trips with petal data, tamper rejection, and a 100-stroke
  extrusion-safety sweep proving outputs are always simple polygons).

## [0.18.1] — 2026-09-22

### Fixed — the boot sequence actually plays, everywhere
- **Loader choreography rebuilt on the compositor.** On a cold start the main
  thread is busy compiling the hero's shaders and running React's first
  commit — exactly the window in which the loader animates. The v0.18.0
  write-on was a `clip-path` transition armed from a `requestAnimationFrame`
  in an effect and the stitch was stepped from a rAF loop: both stall while
  the main thread is blocked, so on real devices the wordmark appeared
  already written, the stitch jumped, and several beats collapsed into one.
  Now the write-on is two **transform** animations (an `overflow:hidden` clip
  box sliding right while the ink inside slides left, so the glyphs stay put
  and the visible edge advances), the stitch is the same clip/ink pair driven
  by a CSS `transition` on `--stitch`, and every fade is opacity. Nothing in
  the sequence depends on JavaScript ticking; only the percentage number
  does, and if it hitches the visuals do not (`.sig-pen/.sig-ink/.stitch-*`
  in `globals.css`).
- **Beats no longer fire out of order.** The heart, tagline, stitch, status
  line and *skip* are framer variants under one parent timeline with fixed
  delays (0.9 / 1.05 / 1.2 / 1.3 / 1.7 s) instead of per-element
  `transition-delay`s toggled by state.
- **Stitch waits for its cue.** The progress used to start counting the
  moment the loader mounted, so a page that was already cached showed
  "73 %" under a wordmark that hadn't been written yet. The stitch now arms
  at 1.25 s (when it appears) and `MIN_SHOW_MS` is 1.9 s so the signature
  is always seen whole before the curtain lifts.
- **Horizontal wobble on phones.** Once scrolled, the page's scroll box was
  15–79 px wider than the viewport (the Beat peel projects a tilting section
  wider than 100 vw). `<main>` now has `overflow-x: clip` — clip, not
  hidden, so the desktop occasions rail keeps its `position: sticky`
  (verified: sticky child pins at 0 while the section is at −58 px).
- **Tofu glyphs.** The self-hosted Latin subsets (Quicksand, Caveat,
  Parisienne) have no ✿ ↻ ↶ ↷ — checked against each font's `cmap` — so
  those fell through to whatever the device had, or a box. Replaced with
  inline SVG doodles (`FlowerDoodle`, new `UndoDoodle` / `RedoDoodle` /
  `RotateDoodle`) in the hero sticker, contact gift toggle, quick-studio
  hint, sketch pad, admin parts list and the studio's history/turn buttons
  (which also gained `aria-label`s).
- Stale "gift-unwrap door" docblock in `(site)/layout.tsx`.

### Verified
- Emulator freeze-frames of the loader timeline at 250 / 500 / 800 / 1150 /
  1500 / 2600 ms (pausing `document.getAnimations()` and scrubbing) show the
  stroke at C → W → Whiml → Whimlet, heart landing, tagline settling,
  stitch filling, 390×844 and 1440×900; 0 console errors.
- Desktop-full / Android-parity / reduced-motion / no-WebGL / skip-click
  all lift the curtain and hand off to the hero (`startIntro`).
- Slow full-page scroll on a 390 px viewport: 0 samples with horizontal
  overflow (was 74 of 77).
- `tsc` clean, `npm test` 82 / 58 / 91 passing.

## [0.18.0] — 2026-09-22

### Changed — the loading page is now "the signature"
- **Removed the gift-unwrap door** (`three/GiftIntroScene.tsx`, −619 lines,
  a whole R3F scene + its chunk) and the tap/Enter/auto-unwrap state machine.
- **New `LoadingScreen`**: the *Whimlet* wordmark writes itself across the
  page like a name signed on a gift tag (clip-path write-on, 1.1 s), a small
  heart lands as the full stop, "one stitch at a time." settles under it, and
  a dashed running stitch fills with **real** progress — page assets
  (`window.load`) → the meadow's first frame (`markHeroReady`) — with a
  percentage and one honest status line. The curtain then lifts straight up
  with its scalloped hem, revealing the hero, whose choreography starts on
  that beat (`startIntro`). Pure DOM + CSS: paints before any 3D chunk.
- Timing: minimum 1.5 s so the signature is *seen*, hard cap 7 s so the
  loader can only delay, never trap; repeat visits in the session get a
  0.55 s curtain; reduced motion gets the mark in place and a plain fade;
  no-WebGL lifts once the static hero is painted. `skip` remains.
- QA flags: `?intro=skip | hold | force` (`force` replaces `gift`).

### Research behind the choice (see AGENT-EXPERIENCE v0.18.0)
Determinate progress for 1–10 s waits; waits with feedback feel 11–15 %
shorter and are abandoned less; fast-start/slow-finish reads quicker than
linear; and the strongest recent loaders are a brand signature + counter +
one directed exit rather than an interactive gate.

## [0.17.1] — 2026-09-22

### Fixed — animation & layout bugs found in a full desktop + Android audit
- **Anchor travel landed 96 px low** (desktop + Android, every nav link and
  the mobile menu): Lenis ≥ 1.3 already subtracts `scroll-padding-top`
  (6 rem) when it resolves an element target, and we passed `offset: −96`
  on top. Lenis now gets 0; the native fallback keeps −96.
- **Product modal / gallery lightbox positioned against the section, not the
  viewport**: every section's `Beat` wrapper carries a perspective transform,
  which makes it the containing block for `position: fixed`. Deep in the
  shop grid the modal opened above the fold; on phones the sheet's CTA hung
  below the screen. Both overlays now render through a `Portal` into
  `<body>` (new `components/Portal.tsx`).
- **Horizontal page overflow on desktop** (`scrollWidth` 2320 px at 1440):
  the pinned Occasions strip is laid out at full width and shifted by
  `x`; the section is now `overflow-x: clip` at `lg` (clip, not hidden, so
  `sticky` keeps working).
- **Process "Pack" step**: the tissue-paper plane sat at the rim of the box,
  reading as a pink slab that hid the flower being laid inside and crawled
  against the transparent walls. It now lines the floor of the box.
- **Collections cards on phones**: two per row is ~9.5 rem wide — the note,
  title and blurb overlapped. Caption sizes scale down below `sm`, blurb
  clamps to two lines.

## [0.17.0] — 2026-09-22

### Added — Android Engine (engine layer only; no scene or component rewrites)
- **Glass budget** (`engine/capability.ts` `glassLevel`): on touch devices the
  liquid-glass recipe is trimmed by GPU tier — `html.glass-frosted` (mid tier:
  blur kept, SVG `#glass-bend` displacement dropped) and `html.glass-lite` (low
  tier: narrower blur, no displacement, no tilt sheen). Applied by
  `EngineProvider`, follows runtime demotions. Same layout, same alphas.
- **Refresh-aware performance monitor** (`monitorBounds`): drei's default
  decline/incline bounds assume 60 Hz; on 90/120 Hz Android screens a steady
  55 fps was read as a decline, the DPR stepped to 1 and the tier was demoted
  for nothing. Bounds are now `[48, 80]` above 100 Hz, `[44, 66]` above 70.
- **Fling-aware scheduling** (`scheduler.ts` `isFlinging`): while the page is
  flinging (> 1.5 px/ms), secondary scenes alternate frames so the compositor
  has headroom for the scroll itself; the primary scene keeps every frame.
  Desktop and Android both benefit. `__engine.stats().flinging` exposes it.

### Fixed
- **Process section on phones/tablets**: the 3D stage was `lg:sticky` only, so
  below the desktop breakpoint it scrolled away before step 2. It is now a
  short landscape card pinned under the header (`38svh`, `42svh` on
  tablets) while the six steps scroll beneath it, and the process camera backs
  off along its line of sight for wide stages so the whole table stays in
  frame (the frames were composed for a 4:5 portrait stage).

### Tests
- `scripts/engine-tests.mjs`: 91 checks (monitor bounds, glass levels,
  fling detection + decision).

## [0.16.1] — 2026-09-22

**Studio fits the screen.** Reported: on desktop the bottom action bar hid
part of the piece and pushed the left option rail up under it; on phones the
scrollable tabs hid some option groups and the piece was cut.

### Changed — `/studio`

- **The action bar folds.** A chevron on the left of the bar collapses it to
  a slim strip (summary + Send) and back; `aria-expanded` / `aria-controls`;
  the choice is remembered for the session. Phones start folded (the stage
  is the point there), desktops open.
- **The piece fits the free band.** The studio measures the band between the
  header and the lowest panel over the stage (bar / open sheet / tabs) and
  passes `fit` + a vertical `shift` to the directed Rig, which backs the
  camera off along its line of sight (≤ 1.6×) and centres the piece in the
  band — so the whole flower is visible with the bar open, and grows back
  when it folds (damped, no jump). Free orbit (admin) ignores it.
- **Rail and sheet stay above the bar.** The left rail is centred in the
  band above the bar; the sheet is anchored above the bar with a measured
  max-height instead of a fixed `top-1/2` that could run under it.
- **Phone tabs wrap** (centred rows) instead of scrolling horizontally, so
  every option group is visible at once; the sheet is anchored above them by
  a measured `--tabs-h`.

### Verified (headless Chromium, SwiftShader)

- 1366×700 open: rail 164–394, sheet 76–490, bar from 502 → nothing overlaps;
  folded: bar from 592, piece re-centred and larger. 1280×600 unchanged
  otherwise.
- Pixel 8 emulation: five tabs visible in two rows; sheet above tabs above
  bar; bar folded by default; opening the bar re-centres the piece.
  0 page errors in all five states.

## [0.16.0] — 2026-09-22

**Touch parity.** The website on an Android phone is now the same website
as on a desktop — every choreography, every 3D scene, every light that
followed the mouse — in the browser, no app. Decided by evidence (the GPU
the phone actually has), corrected at runtime, and nothing in the scenes
changed.

### Why

Audit of what a phone browser *withheld* (all gates were "has a mouse"):
the section peel between beats, the "hand of cards" fan, the sticky card
stack, the 3D customization desk (a JPG instead), the pointer parallax /
"nudge toward the visitor" / Breeze in every scene (nothing moved the
pointer on touch), the window-light sheen on cards and the specular on the
glass buttons (hover-only). The quality tier also subtracted a point for
*being Android* regardless of the chip.

### Added — `src/lib/engine/capability.ts` (pure, tested)

- `gpuScore()` — classifies the unmasked WebGL renderer string the way a
  game launcher reads a GPU name: Adreno 6xx/7xx/8xx, Mali-G7x/Immortalis,
  Xclipse, Apple → capable; Adreno 5xx/4xx, Mali-G5x/T-series, PowerVR →
  entry; desktop/unknown → neutral. A prior, not a verdict.
- `scoreDevice()` — when the GPU is recognised it decides (×2) with memory
  as the correction; core count no longer counts on phones (a budget
  8-core Helio is not a flagship). Unknown GPUs keep the previous heuristic.
- `decideParity()` — a coarse-pointer device runs the desktop choreography
  when its tier is not low and reduced motion is off; `?parity=on|off`.
- `orientationToPointer()` / `followRest()` / `tiltMayDrive()` — device
  tilt → the same −1…1 pointer the scenes read, relative to a rest pose that
  follows the hand (τ = 3.2 s), screen-orientation aware, finger wins.

### Added — `src/lib/engine/tilt.ts`

- One `deviceorientation` listener per page; `EngineRoot` writes the tilt
  into each canvas's R3F `pointer` just before it advances → hero parallax,
  gift-box nudge, studio camera drift, desk sway and the Breeze come alive
  on a phone without any scene edit. A finger on a canvas owns the pointer
  for 800 ms after its last move.
- `--tilt-sx/--tilt-sy/--tilt-o` on `<html>` (≤30 Hz, only when the light
  moved) → the tilt-sheen on cards and the glass specular sweep with the
  phone (`html.tilt` rules in `globals.css`). Still on a table = no cost.
- Permission model researched (Chrome 151 adds `requestPermission()`, Safari
  has had it since iOS 13): asked silently when the Permissions API already
  says granted, otherwise from the first tap on a 3D canvas (never the
  welcome door); refusal remembered per session; never under reduced motion
  or off HTTPS.

### Changed — quality tier

- `detectTier()` reads the GPU (`gpuScore`) instead of penalising the
  Android UA; `demoteTier()` steps the session tier down when a canvas is
  still declining at DPR 1 or drei's monitor gives up (`onFallback`), and
  `useQuality()` re-emits to every mounted scene. Remembered in
  `sessionStorage` (`whimlet-tier-cap`) so the next page starts there.
- `AdaptiveCanvas` locks its shadow-map decision at the first measured tier
  (flipping shadow maps on a live context leaves compiled programs sampling
  a stale map).

### Changed — hooks / components (gates only)

- `useTouchParity()` (new) and `useDesktopPointer(minWidth, touchParity =
  true)` — the existing gate now also passes on capable touch devices.
  Decided once per page (layout must not reflow under a thumb).
- `OccasionSection` opts out (`useDesktopPointer(1024, false)`): its pin is
  bound to `lg:` layout and a thumb-driven snap strip is the right model.
- `CustomOrderExperience`: the 3D desk renders on capable phones.
- `CategoryShowcase` fan on phones is drawn per column (2-2-1 grid): left
  column comes from the right and vice versa, the lone last card only
  rises — the row-sized offsets threw the outer cards off a 390 px screen
  (measured: 446 px scroll width → fixed to 390).
- `WhyHandmade` stacked card: phone padding (`px-6 py-8`, `md:` restores).

### Tests

- `npm run test:engine` 29 → 74: GPU classification (14), device score →
  tier (10), parity (8), tilt → pointer incl. landscape and rest-following
  (13).

### Verified (headless Chromium, Pixel 8 emulation, SwiftShader)

- 0 console/page errors on the home page with parity on, tilt granted;
  no horizontal overflow (390/390).
- Parity traces present: `#why .sticky`, five transformed fan cards, a
  canvas in the customization desk; `Beat` peel active on every section.
- Tilt: synthetic `deviceorientation` → `html.tilt`, `--tilt-sx 28.5%`,
  `--tilt-o 0.86`; `requestPermission` paths exercised for granted / denied
  / legacy (no API) / prompt (gesture path armed; synthetic taps don't
  count as gestures in headless, so the tap itself is unverified).
- Runtime demotion: on the software renderer at `?quality=high` the hero
  stepped 1.75 → 1 over ~40 s and then wrote `whimlet-tier-cap = mid`.

### Not verified

- A real phone (GPU strings, sensor permission UI, actual frame rate). The
  GPU buckets are public tiering, not benchmarks run here.

## [0.15.0] — 2026-09-22

**Android.** The whole site as a phone experience, an installable app, and a
Play-Store-ready shell — without changing any component. Notes in
`android/README.md`.

### Added — Android / touch runtime
- `src/app/globals.css` "Android / touch runtime" block (coarse pointers
  only): safe-area insets (`--sat/--sab/--sal/--sar`) on the fixed navbar
  and bottom sheets, no tap highlight, no pull-to-refresh against the
  smoother, no long-press save sheet on canvases/decorations, text-size
  adjust off, non-blended grain (a blended fixed layer re-composites the
  page on every Android scroll), invisible 44 px hit areas on the small
  option controls, installed-mode header spacing, keyboard-safe sheets
  (`html.kbd-open` + `--vvh`).
- `src/lib/engine/android.ts` (mounted by `EngineProvider`): **hardware
  Back closes overlays** — product sheet, gallery lightbox, mobile menu each
  push one history entry while open; Back pops it and dispatches the
  `Escape` the component already handles; closing with × consumes the
  entry; the welcome door is excluded. Visual viewport → `--vvh`,
  `html.pwa` when running installed. Verified in Android emulation
  (menu, product sheet, lightbox: Back closes and stays on the site).
- Viewport: `viewport-fit=cover`, `interactive-widget=resizes-visual`.

### Added — installable app (PWA)
- `src/app/manifest.ts` → `/manifest.webmanifest` (basePath-aware): id,
  name, `standalone`, blush theme/background, 192/512 icons + maskable
  variants, shortcuts to Studio and Maker. `public/icons/*` generated from
  the site's own heart icon. `<link rel=manifest>`, apple-touch-icon,
  `mobile-web-app-capable` via the metadata API.
- No service worker by design (3D app that needs the network; a stale
  bundle would break it after deploys; not required for Chrome install).

### Added — Play Store (Trusted Web Activity)
- `android/twa-manifest.json` (Bubblewrap project descriptor with domain
  placeholders), `public/.well-known/assetlinks.json` (Digital Asset Links
  template), `android/.gitignore` (keys/builds never committed),
  `android/README.md` with the exact `bubblewrap init/build` steps, the
  App-signing-key vs upload-key fingerprint trap, and the origin-root
  requirement (project Pages sites need a custom domain for the TWA).
- `npm run test:engine` now also covers the Back-button decision logic
  (29 checks total).

### Changed — GitHub Pages is the app's home (no domain)
- `android/twa-manifest.json` pre-filled for
  `https://thecyberexpert123-stack.github.io/3Dwebsite/` (package id
  `io.github.thecyberexpert123_stack.whimlet`); `android/root-site/` holds
  the files for the free `thecyberexpert123-stack.github.io` repository
  that serves `assetlinks.json` at the origin root (plus a redirect to
  `/3Dwebsite/`), with its own README.

### Not verified
- No Android device, emulator or SDK in the sandbox: layers were verified
  with Chrome's Android emulation and the served manifest/icons; the
  install prompt and the TWA build were not executed.

## [0.14.0] — 2026-09-22

The **Whimlet Engine** — a runtime layer that carries the site from a phone
to a VPS without touching the site's own components: one scheduler for every
3D canvas, shader warm-up off the visible path, off-screen animations paused,
and a portable server build. Full notes in `engine/README.md`.

### Added — client engine (`src/lib/engine/`)
- `scheduler.ts` — one `requestAnimationFrame` for all canvases. Per frame:
  off-screen roots are not rendered (they stay mounted, so context and
  compiled shaders survive); the largest visible canvas is primary and
  renders every frame; other visible canvases drop to half rate when the
  measured frame time exceeds an 18 ms budget; a scene's own
  `frameloop="never"` is honoured as a pause hint. Pure decision logic,
  covered by `npm run test:engine` (21 checks).
- `EngineRoot.tsx` — mounted by `AdaptiveCanvas`, so every scene gets it
  with no per-scene edits. Compiles the scene's programs on mount
  (`renderer.compile`, parallel where `KHR_parallel_shader_compile`
  exists), pulls three's per-program **link stalls into
  `requestIdleCallback` slices** one program at a time, then renders one
  off-screen priming frame — so the first *visible* frame is a normal
  frame. Rewinds the clock on resume so lerps/springs/intros never jump
  after a pause. Disables `debug.checkShaderErrors` in production (each
  `getShaderInfoLog` is a blocking GPU round-trip).
- `useInViewport` gains a **pre-mount ring** ~1100 px ahead of each section:
  the scene mounts in an idle slice, warms up, and is ready before the user
  arrives. Leaving the ring unmounts again (unchanged memory behaviour).
- `EngineProvider.tsx` (root layout) pauses decorative infinite CSS
  animations (`animate-float/twinkle/heartbeat/…`) while off-screen and
  resumes them 160 px before they return (measured: 23 of 25 paused while
  at the gallery, previously all ticking).
- QA: `?engine=off` restores the stock R3F loop for A/B on one build;
  `window.__engine.stats()`; User Timing marks `engine:<id>:compile|warm|primed`.

### Added — server engine (`engine/`)
- `next.config.ts`: `NEXT_STANDALONE=1` → `output: "standalone"`; Node shape
  gets `Cache-Control` headers (`/_next/static` immutable 1 y, `/images`
  1 d + stale-while-revalidate 7 d).
- `engine/Dockerfile` (multi-stage, non-root, `HEALTHCHECK`),
  `engine/compose.yml` (`web` + Caddy), `engine/Caddyfile` (auto-TLS,
  HTTP/3, `encode zstd br gzip`, immutable caching, security headers,
  upstream health checks), `engine/whimlet.service` (systemd, hardened),
  `engine/pack.sh` → `npm run engine:pack` builds `whimlet-standalone.tar.gz`
  for a bare VPS (Node only, no install step). `.dockerignore`.
- `GET /api/health` liveness endpoint (`{ ok, service, version }`).
- Scripts: `engine:build`, `engine:pack`, `engine:start`, `test:engine`
  (`npm test` runs all three suites).

### Fixed — animations
- The **studio teaser / desk / process / gift scenes no longer hitch on
  entry**: before, three compiled and linked every shader on the first
  rendered frame — measured as a 4–7 s synchronous stall on a slow
  CPU/GPU, a visible hitch on real hardware, once per scene down the page.
  A/B on the same build (headless, relative): GPU link/reflection time
  inside animation frames **26.1 s → 5.3 s**, worst single call 1.9 s →
  0.7 s; the remainder now runs in idle callbacks.
- Scenes resuming after a scroll-away or a hidden tab no longer receive a
  giant delta (petal breathing, camera glides and grow-ins continued from
  where they were instead of snapping).
- Hover/scroll transitions on the navbar, gallery and occasion cards, the
  process timeline cards and the contact chips narrowed from
  `transition-all` to the properties that actually change
  (`transform`, `box-shadow`, `opacity`, navbar padding/colours), so the
  frosted navbar and the cards never animate layout-affecting properties.

### Changed
- `AdaptiveCanvas` accepts `enginePriority` (hero = 1); it now always
  renders with `frameloop="never"` and lets the engine drive it. Nothing
  else in any scene changed.
- Version 0.14.0.

## [0.13.0] — 2026-09-22

A second, very different 3D tool — the **Whimlet Maker** at `/maker`, a
small friendly Blender for crochet — plus a **GitHub Pages** build of the
whole site.

### Added — Whimlet Maker (`/maker`)
- **Free-form editor** for pieces the guided studio cannot describe: build
  from ten crochet-shaped primitives (ball, egg, tube, cone, ring, heart,
  petal, leaf, cube, disc — welded, fixed topology, 1 unit = 5 cm), up to
  40 parts per piece. Each part has a name, position/rotation/size (numeric
  fields in cm and degrees), one of 16 yarn colours, a finish (cotton /
  velvet / fuzzy / satin / pearl), visibility and a **mirror twin** across
  the centre line.
- **Arrange mode** (Blender's Object Mode): click to select (rose rim
  outline), drei `TransformControls` gizmo for move / rotate / size with
  optional snapping (0.5 cm · 15°), duplicate, delete, hide / unhide, parts
  list (outliner) with reorder, click-empty-space to deselect, turntable,
  1 cm grid, wireframe, orbit / pan / zoom with a viewport gizmo.
- **Sculpt mode** on the selected part: Draw, Inflate, Grab, Smooth,
  Flatten and Pinch brushes; radius and strength; four falloffs (smooth /
  sharp / linear / constant); **X symmetry**; invert (Ctrl) and temporary
  smooth (Shift); a brush cursor ring that hugs the surface normal; strokes
  are spaced along the path so speed doesn't change the result. Sculpt
  detail is stored per part as **sparse quantised offsets** (only touched
  vertices, int16) so a typical sculpt is a few hundred bytes.
- **Blender hotkeys** where they don't fight the browser, always mirrored by
  visible glass buttons: Tab mode toggle, G/R/S gizmo modes, Shift+A add,
  Shift+D duplicate, X/Delete, H / Alt+H, M mirror, N properties, F /
  Shift+F brush size, D/I/G/S/T/P brushes, 1–0 add a shape by number,
  Ctrl+Z / Shift+Ctrl+Z, Esc.
- **Document**: `.whimlet-maker.json` v1 (strict, size-capped, sanitised
  reader with per-part warnings), `?m=` share links (sculpt included when it
  fits the 6000-char cap, otherwise dropped and said so), autosaved local
  draft, **six templates** (blank, bear, bunny, cactus, strawberry, donut).
- **Handoff**: plain-language description, rough spec (size, surface,
  stitches, yarn grams, palette with hex), **WhatsApp** quote message with
  the link, **.glb export** (opens in Blender / AR viewers), PNG snapshot.
- Phones: tool strip and add-shape grid inside the bottom sheet, properties
  drawer closed by default, full-width WhatsApp button.
- Links: footer, studio header ("Maker →"), homepage studio teaser sentence,
  sitemap entry.
- `npm run test:maker` — 58 pure-logic tests (falloff, adjacency, dabs,
  symmetry, grab, sparse offset codec, sanitiser, link/file round-trips,
  estimates, descriptions, templates). `npm test` runs both suites.

### Added — GitHub Pages
- `npm run build:pages` (`NEXT_EXPORT=1`) writes a static `out/`;
  `next.config.ts` gates `output: "export"`, `trailingSlash` and
  `basePath`/`assetPrefix` from `NEXT_PUBLIC_BASE_PATH` (the workflow sets
  `/3Dwebsite`). `public/.nojekyll`.
- `src/lib/paths.ts` — `withBasePath()` / `absoluteUrl()`; applied to every
  raw `/images/...` (12 render sites), the Open Graph image, JSON-LD, the
  studio and maker share links, sitemap and robots (`force-static`).
- `/studio` metadata falls back to the static description in export mode
  (no server to read `?design=`); the client still opens the link.
- `.github/workflows/deploy-pages.yml` (tests → export → `upload-pages-
  artifact` → `deploy-pages`) on pushes to `main`; `ci.yml` now runs on
  `main` + `arena/**`, runs both test suites and both build shapes.

### Changed
- `makeHeartGeometry` / `makePetalGeometry` / `makeLeafGeometry` accept a
  `wobble` amount (default unchanged) so the Maker can build clean, weldable
  topology.

### Verified (headless Chromium, SwiftShader)
- `/maker`: select → numeric edit → undo; sculpt stroke and grab persist as
  sparse offsets; add by key, duplicate, delete; share link round-trip;
  `.glb`, `.json` and PNG downloads; WhatsApp link; zero page errors on
  desktop and phone viewports.
- Pages build served under `/3Dwebsite/`: home (33 images, none broken),
  `/studio/?design=…`, `/maker/` share link, 404 page, prefixed chunks,
  OG image, robots/sitemap — zero failed requests.
- `tsc` clean · `next build` (Node) and `build:pages` (export) OK ·
  82 + 58 tests.

## [0.12.0] — 2026-09-21

The Design Studio grows up: a **full-page studio** at `/studio`, a
**maker's viewer** at `/admin`, a portable **design file**, and the gift
box that opens on the door is now the same box lying open on the hero
blanket. Research this round was product research rather than visual:
what people actually ask for when they order a custom crochet bouquet
(flower type, palette / two-colour mixes, stem count, fillers, wrap paper
colour, printed ribbon text, little gold/pearl accents), and how good 3D
configurators pace their options (one group at a time, camera glides to
the part being edited, swatches over dropdowns, undo/reset, thumb-friendly
touch).

### Added
- **`/studio` — the full 3D Design Studio** (`components/studio/*`,
  `app/(app)/studio`). A stage-first page: the piece fills the viewport,
  a glass **step rail** on the left (The piece → The bloom → Stem & leaves
  → The bouquet → Little extras → For you), a glass **sheet** with the
  active group's controls, presets + live palette card on the right, and a
  bottom bar with the plain-language summary, undo/redo, Surprise me,
  Draw a petal, Reset, Save/Open, Snapshot, Copy link and Send to Whimlet.
  The camera **glides** to the part being edited and the piece slides out
  from under the sheet (view-offset shift, not a camera jump), centred in
  the measured band between the sheet and the right-hand cards so the
  framing holds from 1000 px to 1920 px wide. Phones get
  horizontal group tabs and a bottom drawer sized from the measured bar.
  Keyboard: ⌘/Ctrl+Z / ⇧⌘Z undo/redo, Esc closes the sheet.
- **Design format v2** (`lib/design.ts`): 24+ live options — yarn (cotton /
  velvet / fuzzy) + glitter thread, finished size, petal size, openness
  (bud/half/open), 1–3 petal rings, patterns (solid / ombré / dipped /
  striped) with an accent colour, centre styles (dome / knots / button /
  pompom), stem curve, leaf shapes, bouquets of 3/5/7/9 with dome/loose/tight
  arrangements, five mix palettes, fillers (gypsophila / eucalyptus),
  fairy lights, wrap styles (cone / fold / sheer) with inner paper colour,
  ribbon styles, gift tag with text (≤ 18 chars), butterflies, charms
  (ladybird / bee / pearl pins), jar/vase/pot bases, occasion + note for
  the maker. **Every v1 link and file still opens** — new fields default.
  Two new presets: *Starlit Night* (velvet 9-flower bouquet) and
  *Strawberry Picnic*.
- **Portable design file** `*.whimlet.json` (`toDesignFile / parseDesignFile`)
  — `{format:"whimlet-design", version, app, name, createdAt, summary,
  config}`; strict parse with per-field warnings, size-capped, never trusted.
  Save from the bottom bar; open via the file picker or drag-drop onto the
  page (the admin viewer also accepts pasted text). Share links use a **diff-from-default** encoding so URLs stay short.
- **`/admin` — maker's viewer** (`AdminViewer.tsx`): drop/pick/paste a
  customer's file or link → **spec sheet** (petal / leaf counts, estimated
  size in cm, rough yarn grams, palette with hex), **parts** view (show/hide
  bloom / stem / wrap / extras, exploded slider, x-ray wireframe, 1 cm-square
  grid, turntable, four backdrops, full orbit + zoom), the raw JSON, PNG
  export, and "Edit in studio". Eight sample designs to try. Static, no
  auth — it is a viewer, not a portal (nothing is stored server-side).
- **Studio materials** (`three/studioMaterials.ts`): cotton / velvet /
  fuzzy yarn as sheen + roughness presets with a shared procedural stitch
  normal map; sparkle as a lerped emissive twinkle.
- **Homepage `#studio` teaser** (`DesignStudio.tsx`) now uses the same
  hooks/controls as the full studio (presets + the eight quick controls)
  and hands the exact design over with **Open full studio**.
- Route groups: `app/(site)` keeps the marketing chrome (loader, nav,
  footer, Lenis); `app/(app)` is a bare shell for `/studio` and `/admin`.
- `npm run test:design` grew to **82 tests** (v1 compat, diff encoding,
  sanitizer edge cases, file round-trips, spec estimates, descriptions).

### Added — discoverability
- `sitemap.xml` and `robots.txt` (`app/sitemap.ts`, `app/robots.ts`): the
  homepage and `/studio` are listed; `/admin` is disallowed and `noindex`.
- **Shared studio links preview as the design.** `/studio?design=…` now
  renders per-link metadata on the server (title "Berry bouquet of 9 — a
  Whimlet design", description = the plain-language description, OG/Twitter
  tags) so a link pasted into WhatsApp/iMessage shows what was made. Shared
  links are `noindex`; the bare `/studio` stays indexable. Bad codes fall
  back to the generic page. (`/studio` becomes a dynamic route for this.)
- Footer "Explore" gained a **3D Design Studio** link.

### Changed
- Descriptions use the right article before vowel colours ("an ivory
  double bow", not "a ivory"), and custom hex colours no longer double up
  ("a a custom colour…"). Two tests added (82 total).
- **Gift continuity.** The door's lid is now hinged on its back edge and
  swings open *in frame* (before it flew up out of the top of the shot),
  the ribbon slackens and tissue lifts; the hero blanket's gift box is the
  **same box, open** (`GiftBox open`), so the unwrap and the first section
  are one story. The desk still-life keeps its closed box.
- Pompom centres are a core plus a shell of tufts instead of a single ball.
- Sanitizer collapses tabs/newlines in tag text and notes.

### Fixed
- **Grey plate under the studio on the low tier.** drei's `ContactShadows`
  renders its depth pass into a render target expecting a transparent clear;
  on an `alpha:false` canvas three's clear alpha defaults to 1, so the whole
  8×8 shadow plane came back opaque grey. `AdaptiveCanvas` now sets
  `clearAlpha(0)` on opaque canvases (the visible buffer ignores alpha) and
  the sky dome lives on layer 1 so it never enters shadow/depth passes.
- `scripts/design-tests.mjs` printed its summary and exited **mid-file** —
  tests appended after it never ran. Summary moved to the end.

### Verified
- `tsc` clean, `next build` OK (`/studio` 7 kB route / 564 kB first load,
  `/admin` 5.3 kB / 558 kB), 82/82 design tests, **zero page errors** in
  every headless run (studio desktop low/high tier, studio phone 390×844,
  admin empty + sample, homepage hero + teaser, door sequence).
- Studio tour through all groups and presets, admin spec sheet with the
  Starlit Night sample, phone drawer, and the door open-lid frames captured
  in `docs/qa/v0.12.0-*.jpg`.
- End-to-end flow scripted in headless Chromium: preset → bloom/extras
  edits → tag text → undo ×2 / redo → share code (≈180 chars) → Save file
  (captured JSON) → pasted into `/admin` → spec sheet + parts / exploded /
  x-ray / grid; homepage teaser → **Open full studio** reopens the exact
  design. Reduced motion: renders, no errors. **No WebGL:** studio shows the
  fallback message with all 43 controls, summary and WhatsApp working;
  admin shows the spec sheet without a canvas.
- Accessibility pass on `/studio`: every icon/swatch button labelled, 32
  `aria-pressed` states, one `aria-live` summary, landmarks
  header/nav/main/footer/aside, a page `h1`, hidden file input labelled;
  tab order starts Back → backdrops → turning → step rail.
- Renderer counters (`?stats=1`, SwiftShader, 1440×900): default flower on
  the low tier 63 calls / 11.4k tris / 14 programs; the 9-flower *Starlit
  Night* bouquet 256 calls / 193k tris — that includes the contact-shadow
  depth pass, so ≈128 / 96k per pass (the v0.10 hero was ~105k). High-tier
  numbers were not trustworthy here (< 1 fps at dpr 1.75 on a CPU
  rasteriser) and are left unmeasured.
- Not verified in a real browser: pinch/orbit feel on touch, drag-drop of
  files on iOS/Android, and real-GPU frame rates (SwiftShader only here).

## [0.11.0] — 2026-09-21

"Not the same all over" pass. Researched how the current best scroll-driven
3D sites keep a long page feeling like one piece (Shopify Editions W'26 —
each section staged as a beat with its own axis of motion; Sleep Well
Creative / Bilal.show — scroll as narrative; Lenis showcase sites — one
inertial scroll engine driving every scroll-linked effect; the Codrops
84—24 / Treize Grammes case studies — per-section timelines). The pattern:
**one smooth scroll engine + one shared transition between sections + a
different axis of motion per section.**

### Added
- **Inertial scroll** (`SmoothScroll.tsx`, Lenis 1.3 MIT, ~9 KB gz): wheel
  scroll eases with `lerp 0.085`; touch stays native; anchors get the same
  eased travel with the nav offset; reduced motion → not created at all.
  New `lib/scroll.ts` owns the instance: modals/lightbox/menu/loading door
  now call `lockScroll()/unlockScroll()` (ref-counted) so the page and the
  smoother pause together; `data-lenis-prevent` on the product modal body.
- **Section transition — `Beat`** (`Beat.tsx`): every section peels away as
  it leaves the top (5° perspective tilt around its bottom edge, 28 px
  lift, fade to 0.65) while the next arrives flat underneath. Desktop
  pointer devices only; z-order preserved so scalloped trims still overhang.
- **A different move per section:**
  - *Story beat* — the paragraph is read by the scroll: each word inks from
    blush to cocoa as the section travels (`ScrubLine`).
  - *Collections* — the five category cards arrive as a **fanned hand of
    cards** (scroll-scrubbed with a spring), not five staggered fades.
  - *Occasions* — the page **changes axis**: the section pins and vertical
    scroll pulls six occasion cards sideways along a stitched progress
    line; phones get a native snap scroller.
  - *Why Handmade* — a **card stack**: each principle is sticky; the next
    slides up and settles on top while the one beneath shrinks back.
  - *Kind Words* — the lonely carousel card became a **pinboard**: all notes
    visible as tilted paper with coloured pins; one lifts at a time (auto,
    hover, dots, keyboard).
  - *Gallery* — the three masonry columns **drift at different speeds**.
- **The day arc** (`globals.css`): section surfaces now walk through an
  afternoon — sky (story) → mint (custom) → butter (occasions, kind words)
  → lavender (process) → dusk (contact) — with polka/gingham/ivory-bloom in
  between, so no two neighbouring sections share a surface.
- `useDesktopPointer()` hook (`lib/hooks.ts`): one gate for all
  scroll-linked choreography that would only cost frames on touch; QA
  override `?pointer=fine` because headless Chromium reports `hover: none`.

### Changed
- Process stage background matches its lavender section (was a pink candy
  block inside lavender); stage-1 camera pulled back so the yarn ball is no
  longer cropped.

### Verified
- `tsc` clean, `next build` OK, 46 design tests pass, zero page errors in
  every headless run (1440×900 desktop with/without `pointer=fine`, 390×844
  phone, reduced motion). Section tour, scroll-position series for
  collections / occasions / why / story-beat, and phone tour captured in
  `docs/qa/v0.11.0-*.jpg`.
- Lenis confirmed live (`html.lenis.lenis-on`, `isStopped=false`,
  `limit≈16.7k`); loading door and modals lock/unlock it.

## [0.10.0] — 2026-09-21

Research-led "cute, not solid" pass. Studied the current best-in-class
stylised/cozy 3D sites (Jordan Breton's floating island, WoraWork's cozy
garden, Susurrus' watercolour world, Oryzo/Hubtown "one object with weight",
Bruno Simon folio-2025, the 80.lv / halisavakis stylised-grass write-ups) and
applied the recurring patterns rather than any one look.

### Changed — hero
- The hero is now **the meadow**, full-bleed. The bouquet studio sits on a
  gingham **picnic blanket** on the same hills, sky and sun the gift door
  opens onto — the door and the first screen are one continuous place instead
  of a pink card next to a floating scene.
- Editorial copy moved into a milkier **liquid-glass panel** (`.hero-panel`)
  so type stays crisp over grass; handwritten annotations got frosted
  sticker backings for the same reason. Off-page flower/leaf doodles removed
  (the meadow is the decoration now).
- Camera framing is layout-aware: bouquet framed into the right column on
  ≥1024 px, centred in the open top half on portrait phones (panel slides in
  under it); scroll hand-off unchanged.
- Hero canvas is **opaque** with fog, so the AAA post stack (N8AO contact
  shadows, soft bloom, neutral tone mapping, vignette) now runs on the hero
  too on mid/high tiers; simple tier falls back to renderer tone mapping and
  the old baked contact shadows.
- Four **butterflies** wander the meadow behind the blanket (directed loops
  that face their travel direction, wings hinged on the body — no random
  particles); static under reduced motion.

### Changed — grass & world
- Grass blades get the four-layer stylised model: darker ground colour as
  fake AO at the root → the blade's own colour → warm sunlit tip, a large
  world-space patch tint so the lawn is not one green, a gust-facing light
  bias, ~18 % cooler blue-green blades, and sun **translucency** through the
  tips when looking toward the sun. `Meadow` is parametric (plateau radius,
  grass clear/near-z, blade scale, butterfly count) so the door and hero
  share one component.

### Changed — page surfaces
- Every section surface is now layered: `.polka`, `.candy`, `.gingham-pink`
  gained large lavender / mint / butter colour blooms under their pattern, and
  ivory sections use a new `.ivory-bloom` so consecutive sections no longer
  merge into one flat pink. A 6 % fixed **paper grain** (inline SVG
  turbulence, no image request, no blend mode) sits over the whole page.

### Fixed
- `HeroStatic` (no-WebGL / loading / no-JS) is full-bleed to match the new
  slot instead of a framed card floating in an empty column.

### Verified
- `tsc` clean, `next build` OK, 46 design tests pass, zero page errors in
  headless runs (desktop 1440×900 / 1200×750, phone 390×844, reduced motion).
- Hero draw calls 66–73 at mid (composer on), 101–117 at low; triangles
  ~103–119 k (was ~40 k) — within the budget used for the door.

## [0.9.1] — 2026-09-21

### Added
- **Loading card**: while the meadow's chunk downloads and its shaders
  compile, a liquid-glass tag hangs in the centre of the candy door with a
  stitched progress ring around a drawn heart, a real three-stage readout
  ("wrapping your gift…" → "tying the bow…" → "ready!", with a percentage
  that only moves forward and eases toward each stage's ceiling), and a
  "skip the intro" link. It blurs away the moment the first frame paints;
  the meadow fades in behind it, then the mark and the Unwrap invitation
  arrive. `role="status"` / `aria-live="polite"`.
- `.glass-panel` — the same liquid-glass optics as the buttons, for panels.
- `GiftIntroScene` reports `onMount` (chunk arrived) in addition to
  `onReady` (first frame).

### Changed
- Buttons are markedly more **translucent**: base tint alpha 0.14 (primary
  0.22, outline 0.08), a stronger bevel so the thickness reads, and the
  page/grass/gingham behind visibly shows through.
- The door background is the candy wash again during loading (the meadow
  paints over it), so the first paint is never a flat blue.
- Removed the small running-stitch loader under the mark (superseded).

## [0.9.0] — 2026-09-21

The door moves outdoors, every button becomes liquid glass, and the 3D gets
a real finishing pass (ambient occlusion, HDR bloom, filmic tone mapping,
MSAA). Two dependencies added — `postprocessing` and
`@react-three/postprocessing` (+ its `n8ao` peer) — the established R3F
post stack; nothing hand-rolled.

### Added
- **Meadow door** (`three/Meadow.tsx`): rolling hills from a two-octave
  height field with a flat "picnic spot" under the gift, vertex-coloured
  olive→yellow-green grass (never neon), ~9 000 instanced blades bent from
  the root by a two-wave wind in a tiny `onBeforeCompile` vertex patch,
  wildflower heads, drifting pollen motes, a gradient sky dome (shader,
  not a texture), an HDR sun disc that blooms, distance fog to the sky
  colour, and the existing puffy clouds placed far and large. The canvas
  is now opaque and full-screen; the mark and invitation float over it.
- **Post stack** (`three/Post.tsx`): N8AO ambient occlusion (half-res on
  mid), mipmap Bloom with a threshold of 1.0 (only emitters bloom, pastels
  never), Neutral tone mapping for outdoor scenes, a soft vignette, 2×/4×
  MSAA in the composer. Off entirely on the low tier, which instead gets
  the renderer's own Neutral tone-mapping for the meadow.
- **Outdoor lighting rig**: `StudioLights outdoor` — low afternoon sun from
  the back-right (long shadows toward the camera), sky-blue hemisphere fill
  with warm grass bounce, a soft front fill, and a Lightformer environment
  with a sky plane, a ground plane and the sun.
- **Liquid-glass buttons** (`.btn-primary`, `.btn-outline`, `.btn-whatsapp`,
  new `.btn-glass`): frosted, saturated backdrop; a bevel rim (two inset
  rims + inner shadow); a specular lens that follows the pointer (`--mx/--my`
  written by `<GlassDefs/>` on `pointermove`, fine pointers only); and on
  Chromium a real refraction through an SVG `feDisplacementMap`
  (`#glass-bend`) whose map ramps only at the edges, so the middle stays flat
  and the rim bends what's behind it. Safari/Firefox get the identical
  frosted version without the bend; engines without `backdrop-filter` get a
  solid pastel fallback.
- Portrait framing for the door camera (backs off with `1/aspect`).

### Changed
- The door canvas is opaque (`alpha: false`) with `Fog`; `SoftGround` and
  `StudioShadows` are no longer used there (real cast shadows on the hill).
- The gift's inner glow is warmer and shorter-range so it doesn't paint
  the grass lime.

## [0.8.0] — 2026-09-21

Polish pass: a heart-shaped cursor, a more *directed* first minute (gift
arrival, stitched headline, running-stitch loader) and a few finer-grained
micro-interactions. No new dependencies, no new canvases.

### Added
- **Heart cursor** — CSS-native (`cursor: url(data:image/svg+xml…)`), four
  states: blush heart (default), rose heart with a sparkle (links/buttons/
  tappable 3D), lavender heart (grab) and a squeezed heart (grabbing).
  Text fields keep the I-beam; zoom/crosshair stay native. Only applies on
  `(hover: hover) and (pointer: fine)` — touch devices never see it, and
  every value carries a keyword fallback.
- **Gift arrival beat** on the door: the box drops in, lands with a squash
  and one soft bounce, settles its rotation, and the ribbon *ties itself*
  (bow loops scale up from 0.9–1.4 s). The lid pop now gives the camera a
  short decaying kick so the lens feels it.
- **Real ribbon bow** on the door gift — flat ribbon loops swept along a
  teardrop curve (`bowLoopGeometry`/`bowTailGeometry` from `parts.tsx`),
  a satin knot and a pearl bead; the old torus loops read as a tyre.
- **Running-stitch loader** under the Whimlet mark on the door: a dashed
  seam sews across while the gift's shaders compile, then settles once the
  scene reports ready.
- **Stitched headline**: "Big Feelings." now rises letter-by-letter out of
  a clipping line, with a blush glow and blur that cool as each glyph
  settles, then a hand-drawn underline draws beneath it. The same `.u-hand`
  underline draws under every section heading's script accent when its
  `Reveal` enters view.
- **Satin sheen** sweep on `.btn-primary` hover.

### Changed
- 3D canvases signal hover through `data-cursor="pointer"` on the canvas
  element instead of writing `style.cursor` (which would override the theme
  cursor). `HeroScene3D`, `GiftIntroScene` and `GiftScene` updated;
  `GiftScene` no longer sets `cursor-pointer` on the whole canvas.
- `Reveal` adds an `is-inview` class once seen, so CSS-only flourishes
  inside it can share the reveal beat.

### Fixed
- `HeroScene3D` guards against a null canvas when attaching its
  `pointerleave` listener (context lost → fallback swapped in).

## [0.7.0] — 2026-09-21

The "realism" release — the same scenes, but the things in them are now
*made*: stitched petals, folded leaves, bent stems, wound yarn, real bows,
and real light falling on all of it.

### Added
- **Real cast shadows** (`Stage.tsx`): the key light is now a shadow caster
  (PCF, feathered `shadow.radius 4`, tight per-scene frustum) onto a
  hue-tinted `ShadowMaterial` plane. Petals shade stems, bows shade boxes,
  balls have a contact edge. `AutoShadowCasters` flags solid meshes as they
  arrive (throttled traversal); particles, glows, sparkles, clouds and
  tissue are opted out via `userData.noShadow`. The **low tier keeps the old
  ContactShadows blob** and no shadow maps — degradation is explicit.
- **Stitched yarn finish** (`materials.ts`): the knit bump map is redrawn with
  rounded-top stitches and row grooves at 256², and paired with a faint
  albedo knit map (±7 %) so rows stay readable in flat light and at grazing
  angles. Petals now visibly read as crochet at hero scale.
- **Flower anatomy** (`CrochetFlower.tsx`, `geometry.ts`):
  scalloped, cross-cupped petals (`makePetalGeometry` — 5–6 stitch bumps per
  edge, edges curl toward the face); pointed leaves with a folded midrib
  (`makeLeafGeometry`); stems are gently bent tubes (`makeStemCurve` /
  `makeStemGeometry`) with leaves and head placed *on* the curve; a ring of
  french knots on the centre dome (one instanced draw) and a 5-sepal calyx
  under the head (one instanced draw). Studio and process flowers share the
  new leaf.
- **`SatinBow` rebuilt** (`parts.tsx`): loops are flat ribbon swept along a
  teardrop curve (visible inner face and fold), swallow-tail tails that
  drape forward, ribbon knot with a small pearl. The hero `GiftBox` uses it.
- **Banded yarn balls** (`YarnBall`): each wrap is a band of three strands
  hugging the sphere, successive bands rotate through the golden angle —
  reads as hand-wound. Still 2 draw calls per ball.
- **Linen table** (`SoftGround`): fine warp/weft weave with slub, tiled
  small, under every scene.
- **Desk props** (`DeskScene.tsx`): a ribbon spool with wooden flanges and a
  trailing end (`RibbonSpool`) replaces the anonymous torus; gold
  embroidery scissors (`Scissors`) rest by the hook.

### Changed
- Gift-door camera pulled back a touch more (`CAM_IN` z 2.75) so the taller,
  fuller bouquet is not cropped by the stage.
- Shadow bias/normalBias tuned (−0.0005 / 0.05) to remove acne on the
  thin, cupped petals.

## [0.6.0] — 2026-09-21

The "one bloom" release — every crochet flower on the site now comes from the
same petal system, the entrance gift actually *blooms*, and the hero bouquet
reads as a wrapped gift. Draw calls went down while the scenes got richer.

### Added
- **`three/materials.ts` finish system** — `finish(kind, hex)` returns shared
  `yarn` / `clay` / `satin` / `paper` / `pearl` materials (knit bump map
  generated once, cached per hex); `create()`/`syncSheen()` for the few
  materials that must lerp colour per instance (Design Studio).
- **Shared `BLOOM` petal system** (`CrochetFlower.tsx`): one set of open-rose
  proportions (outer ring tilt 1.18 / inner 0.8, lens petals ~2× longer than
  wide, head leaning `face` 0.5 rad toward the viewer). Hero, gift door,
  Design Studio and Process scene all read the same numbers, so a flower
  looks like the *same* flower everywhere.
- **`SatinBow`** (`parts.tsx`): plump two-loop satin bow with pearl knot and
  tails — used on the hero wrap, Design Studio bouquet wrap and the process
  gift lid.
- **Staged bouquet reveal in the gift door** (`GiftIntroScene.tsx`): after the
  lid pops, five stems spring up on staggered beats (`BLOOM_BEATS`), each with
  its own overshoot, while the camera pushes in and holds on the full bloom
  before the curtain irises open.
- **`?stats=1` renderer probe** (`Stage.tsx`): every `AdaptiveCanvas` publishes
  averaged draw calls / triangles / programs / dpr / fps per frame to
  `window.__whimletStats[label]` — zero cost when the flag is absent.

### Changed
- **Instanced petals** — each flower's outer/inner ring is one
  `InstancedMesh`; falling petals are one instanced draw. Hero: 136 → 53
  calls/frame at the time of the change (now ~96 with the wrap, bow and
  richer bouquet — still well under the 0.5.0 figure of 175).
- Petal geometry is tapered and cupped (`geometry.ts`) instead of a flat lens;
  knit bump softened (`bumpScale` 0.12, repeat 5) so petals read as yarn, not
  corrugated card.
- Hero bouquet: stems gathered at the wrap neck and fanned outward, kraft cone
  + blush tissue collar + satin band + forward-facing bow.
- Design Studio: bouquet stems gather at the neck and fan out (was a wide ring
  leaning *inward*, which put stems outside the wrap); solo blooms framed
  larger; falling petals and a soft ground disc tie it to the hero's world.
- Process scene: the flower now lays *inside* the box in step 5 (root moved to
  the box's left wall — a −90° roll maps +y to +x, so the old right-wall root
  swung the head out of frame).
- Falling petal size 0.32–0.62; loader door lift 1.5 → 1.9 s so the bloom is
  seen before the iris.

### Fixed
- Bouquet wrap no longer intersected by stems (hero + studio).
- Gift-door bouquet was cropped by the top of the stage — camera pulled back
  (`CAM_IN` z 2.4, `LOOK_IN` y 0.72) and the stage grew to 52/56 vh.

## [0.5.0] — 2026-09-20

The "girly & cute" release — a strawberry-milk palette, clay UI chrome, a
gift-unwrap entrance and coquette details (bows, pearls, hearts) everywhere
that the eye rests. Every scene keeps its purpose; only its wardrobe changed.

### Added
- **Entrance surprise — the gift door** (`LoadingScreen.tsx`,
  `three/GiftIntroScene.tsx`): the page arrives wrapped. A 3D gift box with a
  satin bow sits on a candy-gradient curtain; the bow wiggles, tapping it (or
  the "Unwrap" button / Enter) pops the lid, confetti hearts burst, and the
  curtain irises open in a circular wipe straight into the hero's intro clock
  (`startIntro()` — no second intro system). Auto-unwraps after ~5 s if the
  visitor doesn't; repeat visits in the same tab get a 1 s curtain instead;
  reduced-motion gets the short curtain; no-WebGL gets a drawn SVG gift with
  the same button. Body scroll is locked only while the door is up.
- **Heart trail** (`HeartTrail.tsx`): tiny pastel hearts drift off the cursor.
  Pooled DOM nodes (18), distance + rate gated, compositor-only CSS animation,
  fine-pointer only, off for `prefers-reduced-motion`.
- **Clay UI system** (`globals.css`): `--shadow-clay`/`clay-sm` (hue-tinted
  outer shadow + inset top-left highlight + inset bottom-right shade),
  `.btn-primary` is now a pressable pink clay pill (`translateY(2px)
  scale(.98)` on active), `.card-clay`, `.sticker` (tilted white label with
  `--tilt`), `.gingham`, `.gingham-pink`, `.polka`, `.candy` backgrounds and
  `.scallop-bottom` edges (`--scallop` colour var). Section rhythm alternates
  candy / gingham / polka / ivory so no two neighbours share a texture.
- New 3D props (`three/parts.tsx`): `SatinBow` (round filled loops + tails —
  used on the intro gift, the contact gift and the process pack box),
  `StrawberryCharm`, `PuffyCloud`, `Sparkle3D`; hero gets pearls + bows +
  strawberry charm; `CategoryShowcase` cards became pastel polaroids with a
  bow pinned at the top (wiggles on hover).
- Palette token `--color-strawberry`, `--color-rose-ink` (text-safe rose).

### Changed
- Palette: ivory `#fff6f8`, blush/blush-soft/blush-deep, lavender, mint,
  butter, sky, cocoa text. Footer is rose-ink with near-white text (the old
  dark bark footer clashed with the pastel page).
- Rendering: `flat` (no ACES tone mapping — it greyed the pastels), hemisphere
  fill light, unlit `SoftGround` so the 3D floor matches the page colour.
- `YarnBall` wrap rings and `StrawberryCharm` seeds/leaves are merged into
  single geometries (hero draw calls 190 → 175 per frame at the high tier).
- ProcessScene "design" beat: camera pulled back so the sketch and yarn share
  the frame; sketch line is rose instead of grey-brown.
- Design-studio / product / gallery filter chips share one clay chip style.
- All rose *text* moved to `text-rose-ink` (`#b8456f`, 4.8:1 on ivory, 4.15:1
  on blush-soft); `#e07a9a` stays for fills, doodles and 3D. Footer text
  opacities raised to keep ≥4.5:1 on rose-ink.

### Verified
- `npm run build` green (`/` 35.8 kB, 189 kB first load); `tsc --noEmit`
  clean; `npm run test:design` 46/46.
- Headless Chrome (SwiftShader) passes: full-page 1440×900 and 390×844 shot
  grids; door flows for default / reduced-motion / no-WebGL / repeat-visit /
  auto-unwrap (overlay up at 3.6 s, gone at 12.3 s incl. hero settle);
  first Tab lands on the skip link; canvases mounted while scrolled to
  `#process`: 3 (gating still works).
- Contrast table for every new text/background pairing computed from the
  tokens (see AGENT-EXPERIENCE).

## [0.4.0] — 2026-09-20

The "directed" release — one shared intro clock, adaptive quality and a
scroll-scrubbed 3D sequence.

### Added
- `lib/intro.ts` + `three/Stage.tsx`: one intro clock shared by the loading
  curtain, hero copy and hero 3D choreography (ground → yarn rolls in → thread
  unspools → bouquet grows → charms land → camera settles). The curtain lifts
  the moment the hero has painted its first frame (hard cap 2.4 s).
- `lib/quality.ts`: device-tier detection (low/mid/high) → DPR caps, particle
  density, shadow resolution; corrected at runtime by drei `PerformanceMonitor`
  inside `AdaptiveCanvas` (also handles WebGL context loss with a fallback).
- Shared lighting/shadow rig (`StudioLights`, `StudioShadows`, `SoftGround`) —
  one visual language for every scene; pointer velocity becomes wind (`Breeze`).
- `three/ProcessScene.tsx`: "The making of a flower" — the process timeline is
  a scroll-scrubbed 3D timeline (yarn → sketch → stitch → bloom → pack → you).
- `Magnetic` CTAs, `TextReveal` headlines, tilt sheen on cards, section curtain
  edges, hero copy hand-off on scroll.
