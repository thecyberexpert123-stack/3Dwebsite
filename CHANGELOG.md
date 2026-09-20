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
