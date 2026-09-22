# Whimlet — Handmade Crochet Boutique Website

A premium, 3D-accented marketing website for **Whimlet**, a handmade crochet
business. Built to guide visitors from *discover → fall in love → explore →
enquire → customize → order*, with **WhatsApp (+91 74397 48279)** as the
primary conversion channel.

## Tech stack

- **Next.js 15** (App Router, static export of `/`) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first design tokens in `src/app/globals.css`)
- **Three.js + React Three Fiber + Drei** — the hero crochet-studio scene, the
  interactive **3D Design Studio** (a real product configurator), the
  opening-gift scene in the closing CTA, and the custom-order desk still life
  (all lazy-loaded, viewport-gated, with beautiful static fallbacks)
- **Framer Motion** — reveals, parallax, modals, carousel
- **Lenis** (MIT) — inertial page scroll; `src/lib/scroll.ts` owns the instance (scroll locks, anchor travel). QA overrides: `?intro=skip|hold|gift`, `?quality=low|mid|high`, `?pointer=fine`.
- Self-hosted fonts (Parisienne · Caveat · Quicksand) — no external font CDN

## Getting started

```bash
npm install
npm run dev                # develop at http://localhost:3000
npm run build              # production build
npm run start              # serve the production build
npm run optimize:images    # resize/compress images in public/images (ImageMagick)
```

## Project structure

```
src/
├─ app/               root layout (SEO, fonts, JSON-LD); (site)/ homepage with
│                     marketing chrome; (app)/ bare shell for /studio, /maker, /admin
├─ components/        one file per section + shared UI (Reveal, Decorations…)
│  ├─ studio/         full studio + admin viewer (shared controls, hooks, panels)
│  ├─ maker/          the free-form Maker (MakerApp + document/history hook)
│  └─ three/          R3F scenes: HeroScene3D, GiftIntroScene, DesignScene, DeskScene…
├─ data/              ALL editable content lives here (see below)
├─ fonts/             self-hosted woff2 files
└─ lib/               design.ts (studio domain + file format), sketch.ts,
│                     maker.ts + sculpt.ts (Maker document, brushes, codecs),
│                     paths.ts (basePath helpers), WhatsApp helpers, hooks
scripts/              image optimization utility + design-tests.mjs + maker-tests.mjs
public/images/        product & scene imagery
```

## Editing content (no code required)

| What | Where |
| --- | --- |
| Products (shop grid + modal) | `src/data/products.ts` |
| Category showcase cards | `src/data/categories.ts` |
| Gallery items & filters | `src/data/gallery.ts` |
| Occasion cards | `src/data/occasions.ts` |
| FAQ | `src/data/faqs.ts` |
| Process timeline steps | `src/data/process.ts` |
| Nav links, tagline, socials | `src/data/site.ts` |
| WhatsApp number & prefilled messages | `src/lib/whatsapp.ts` |
| 3D Design Studio options, presets & message | `src/lib/design.ts` |

> **Honest-content policy (important):**
> - Product/gallery images are **AI-generated placeholders** — replace the files
>   in `public/images/` with real photography when available (then run
>   `npm run optimize:images`).
> - Testimonials in `src/data/testimonials.ts` are **sample placeholder copy**,
>   shown without attribution. Replace with genuine customer words (with
>   permission) before treating them as reviews.
> - No prices, stock levels, shipping/return policies, founders, locations or
>   social handles are invented anywhere. Social links are deliberate
>   "coming soon" placeholders until real accounts exist.
> - The custom-order wizard composes a WhatsApp message — reference photos are
>   intentionally shared in the chat afterwards (no fake upload pipeline).

## The 3D Design Studio

Three surfaces share one engine (`src/lib/design.ts` + `src/components/three/DesignScene.tsx`):

- **`/#studio`** — the homepage teaser: presets and the eight quick controls,
  with **Open full studio** carrying the exact design across.
- **`/studio`** — the full-page studio. Step rail (The piece → The bloom →
  Stem & leaves → The bouquet → Little extras → For you), a glass sheet with
  the active group's controls, presets + live palette on the right, and the
  bottom bar (summary, undo/redo, Surprise me, Draw a petal, Reset,
  Save/Open file, Snapshot, Copy link, Send to Whimlet). The camera glides to
  the part being edited. Keyboard: ⌘/Ctrl+Z undo, ⇧⌘Z redo, Esc closes the sheet.
- **`/admin`** — the maker's viewer. Drop, pick or paste a customer's
  `*.whimlet.json` (or share link) → spec sheet (petal/leaf counts, size in
  cm, rough yarn grams, palette with hex), parts view (show/hide, exploded
  slider, x-ray, 1 cm grid, turntable, backdrops, full orbit), raw JSON, PNG
  export, "Edit in studio". It is a static viewer — nothing is stored
  server-side and there is no login; if you ever need customer data kept on a
  server, that is a separate (backend) piece of work.

**Options (format v2):** flower vs bouquet · finished size · yarn
(cotton / velvet / fuzzy) + glitter thread · rounded / pointed /
**hand-drawn** petals · 4–8 petals × 1–3 rings · petal size · openness ·
patterns (solid / ombré / dipped / striped) with accent colour · centre
style · petal, centre, stem, leaf, wrap, inner paper, ribbon, butterfly and
base colours · stem length & curve · leaf count & shape · bouquets of
3/5/7/9 in dome / loose / tight arrangements · mix palettes · fillers ·
fairy lights · wrap styles · ribbon styles · gift tag with text · butterflies
· charms · jar / vase / pot · occasion + note for the maker.

- **Sketch pad:** pick "✏️ Draw" and draw one petal — any shape, one stroke.
  `src/lib/sketch.ts` (arc-length resampling → Laplacian smoothing → polar
  closing → mirror symmetrization → normalization) cleans the wobbles and
  extrudes the outline into real 3D geometry. The outline travels with the
  design — link, file and WhatsApp message.
- **Design file:** `{ format: "whimlet-design", version: 2, app, name,
  createdAt, summary, config }`. Older (v1) links and files still open; new
  fields default. The reader is strict (size-capped, sanitised, per-field
  warnings) and never trusts input. Share links encode only the diff from
  the default design so URLs stay short.
- **Graceful degradation:** without WebGL the preview falls back to imagery,
  but every control, the sketch pad, save/open, the summary and the WhatsApp
  handoff still work.
- `npm run test:design` runs the 82 pure-logic tests (encode/decode, v1
  compat, sanitiser, file round-trips, spec estimates, descriptions).

## The Whimlet Maker (`/maker`)

The studio describes *flowers*; the Maker describes *anything*. It is a
small, friendly Blender: soft crochet-shaped primitives you arrange, mirror
and sculpt, then hand to Whimlet.

- **Arrange** (Blender's Object Mode): add a shape (`Shift+A` or `1`–`0`),
  click to select, gizmo for **move / rotate / size** (`G` / `R` / `S`),
  snapping, duplicate (`Shift+D`), delete (`X`), hide (`H` / `Alt+H`), mirror
  twin (`M`), numeric position/rotation/size in cm and degrees, 16 yarn
  colours, five finishes, parts list with reorder, grid, wireframe, turntable.
- **Sculpt** (`Tab`): Draw, Inflate, Grab, Smooth, Flatten, Pinch on the
  selected part; radius (`F` / `Shift+F`), strength, falloff, X symmetry,
  invert (`Ctrl`), temporary smooth (`Shift`). Detail is stored as sparse
  int16 offsets per vertex — primitives have fixed topology, so a file made
  today reopens identically.
- **Document:** `{ format: "whimlet-maker", version: 1, … }` — Save / Open
  (or drop the file anywhere), `?m=` share link (sculpt included when it
  fits), autosaved local draft, six templates. **Handoff:** description,
  size / stitches / yarn estimate, palette, WhatsApp message, **.glb** export
  (Blender, iOS AR Quick Look, Windows 3D Viewer), PNG snapshot.
- Scale: 1 unit = 5 cm; estimates assume ~3 single-crochet stitches / cm².
- `npm run test:maker` runs the 58 pure-logic tests; `npm test` runs both
  suites.

## Images

Drop new photos into `public/images/` (keep names, or update the data files),
then run `npm run optimize:images`. Guidance for real photography:
- Products: landscape or square, subject centered (cards crop to 4:3)
- Categories / occasions: prefer portrait 4:5
- Optimizer caps width at 1000px, quality 80 — total page imagery stays light

## Deployment

- Set `NEXT_PUBLIC_SITE_URL` (e.g. `https://whimlet.in`) so Open Graph/Twitter
  metadata, `sitemap.xml` and `robots.txt` resolve to absolute URLs.
- `/studio` is server-rendered on demand (shared `?design=` links get their
  own preview title/description); everything else is static. `/admin` is
  `noindex` and disallowed in robots — but it is still a public URL, so don't
  treat it as private.
- `next.config.ts` disables runtime image optimization (`images.unoptimized`)
  because images are pre-optimized at authoring time. On platforms with
  built-in optimization (e.g. Vercel) you may remove that flag.

### Whimlet Engine — Docker / VPS

```bash
docker compose -f engine/compose.yml up -d --build          # HTTP :80
SITE_ADDRESS=whimlet.example.com docker compose -f engine/compose.yml up -d --build   # auto-HTTPS
npm run engine:pack                                         # bare VPS: whimlet-standalone.tar.gz + engine/whimlet.service
```

`engine/README.md` explains both halves of the engine: the client-side
scheduler/warm-up that keeps every 3D scene smooth (and how to A/B it with
`?engine=off`), and the server packaging (standalone build, Caddy edge with
zstd/brotli + immutable caching, `/api/health`).

### Android

The site is installable from Android Chrome (manifest + icons, "Add to Home
screen") and ships a Trusted Web Activity descriptor for the Play Store —
see `android/README.md`. The engine's Android shim makes the hardware Back
button close overlays instead of leaving the app.

### GitHub Pages

The whole site also builds as a static export:

```bash
NEXT_PUBLIC_BASE_PATH=/3Dwebsite NEXT_PUBLIC_SITE_URL=https://<owner>.github.io npm run build:pages
# → out/  (serve it under /3Dwebsite/ to mimic Pages)
```

`.github/workflows/deploy-pages.yml` does this on every push to `main` and
publishes with `actions/deploy-pages`. **One-time setup:** repository
*Settings → Pages → Source: GitHub Actions*. For a user site or a custom
domain, set `NEXT_PUBLIC_BASE_PATH` to empty in the workflow.

What changes in export mode: `/studio` share links lose their per-design
Open Graph preview (there is no server to read `?design=`; the page itself
still opens the design), and any future server feature must stay behind the
same `NEXT_EXPORT` gate. Raw asset URLs must go through `withBasePath()`
from `src/lib/paths.ts` — `next/image` with `unoptimized` does not add the
base path by itself.

## Verification status

See `CHANGELOG.md` for what shipped and `AGENT-EXPERIENCE.md` for engineering
notes and known limitations (e.g. untested-in-browser behaviours).
