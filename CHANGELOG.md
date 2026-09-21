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
