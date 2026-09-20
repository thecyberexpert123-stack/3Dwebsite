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
