# Whimlet — Handmade Crochet Boutique Website

A premium, 3D-accented marketing website for **Whimlet**, a handmade crochet
business. Built to guide visitors from *discover → fall in love → explore →
enquire → customize → order*, with **WhatsApp (+91 74397 48279)** as the
primary conversion channel.

## Tech stack

- **Next.js 15** (App Router, static export of `/`) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first design tokens in `src/app/globals.css`)
- **Three.js + React Three Fiber + Drei** — hero crochet-studio scene, custom-order
  desk still life, and the colour-customizer blossom (all lazy-loaded, with
  beautiful static fallbacks)
- **Framer Motion** — reveals, parallax, modals, carousel
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
├─ app/               layout (SEO, fonts, JSON-LD), page (section order), styles
├─ components/        one file per section + shared UI (Reveal, Decorations…)
│  └─ three/          R3F scenes: HeroScene3D, DeskScene, CustomFlowerScene
├─ data/              ALL editable content lives here (see below)
├─ fonts/             self-hosted woff2 files
└─ lib/               WhatsApp helpers + hooks (WebGL/mobile/reduced-motion)
scripts/              image optimization utility
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

## Images

Drop new photos into `public/images/` (keep names, or update the data files),
then run `npm run optimize:images`. Guidance for real photography:
- Products: landscape or square, subject centered (cards crop to 4:3)
- Categories / occasions: prefer portrait 4:5
- Optimizer caps width at 1000px, quality 80 — total page imagery stays light

## Deployment

- Set `NEXT_PUBLIC_SITE_URL` (e.g. `https://whimlet.in`) so Open Graph/Twitter
  metadata resolves to absolute URLs.
- `next.config.ts` disables runtime image optimization (`images.unoptimized`)
  because images are pre-optimized at authoring time. On platforms with
  built-in optimization (e.g. Vercel) you may remove that flag.

## Verification status

See `CHANGELOG.md` for what shipped and `AGENT-EXPERIENCE.md` for engineering
notes and known limitations (e.g. untested-in-browser behaviours).
