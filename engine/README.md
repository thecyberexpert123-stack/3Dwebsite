# Whimlet Engine

The runtime that carries the site from a phone to a VPS without touching the
site's own components. Two halves:

| Half | Where | What it does |
| --- | --- | --- |
| **Client** | `src/lib/engine/` | One frame scheduler for every WebGL canvas; shader warm-up off the visible path; off-screen animations paused. |
| **Server** | `engine/` (this folder) | Standalone Node build, Docker image, Caddy edge (TLS + zstd/brotli + immutable caching), systemd unit, health endpoint. |

Neither half changes a scene, a section or a style. Scenes still declare
`frameloop`, `useInViewport` gates, quality tiers exactly as before — the
engine reads those and does the work underneath.

---

## Client engine

### The problem it solves (measured)

Before the engine, scrolling the studio teaser into view triggered a **4–7 s
synchronous stall** on a slow CPU/GPU: three.js compiles and links every shader
program on the first frame a scene renders, and each link is a blocking GPU
round-trip (`getProgramParameter`, uniform reflection). On real hardware it is
a shorter but very visible hitch — and it happens per scene (hero, desk, studio,
process, gift), i.e. five times down the page.

### What it does

`EngineRoot` (mounted automatically by `AdaptiveCanvas`, so every canvas gets it):

1. **One loop for all canvases.** R3F is switched to `frameloop="never"` and a
   single `requestAnimationFrame` drives `advance()` for each root. Per frame
   the scheduler decides who renders:
   - off-screen → **not rendered** (stays mounted: context + shaders survive),
   - the largest visible canvas is **primary** and renders every frame,
   - other visible canvases drop to **half rate when the frame budget
     (18 ms) is exceeded** — a decorative scene never steals frames from the
     one being looked at,
   - a scene's own `frameloop="never"` is honoured as a `pause` hint.
2. **Warm-up off the visible path.** On mount the scene's programs are
   compiled (`renderer.compile`, parallel where `KHR_parallel_shader_compile`
   exists), then the per-program link stalls are pulled into
   `requestIdleCallback` slices one program at a time, then a single
   off-screen **priming frame** uploads buffers/textures. When the section
   scrolls in, the first frame is a normal frame.
3. **Pre-mount ring.** `useInViewport` gains a second observer ~1100 px ahead
   of the section that mounts the scene in an idle slice, so warm-up has time
   to finish before the user arrives. Leaving the ring unmounts again.
4. **Resume without jumps.** After a pause (scrolled away, hidden tab) the
   clock is rewound to "1/60 s ago" so lerps/springs/intros continue instead
   of snapping.
5. **Production:** `renderer.debug.checkShaderErrors = false` — each
   `getShaderInfoLog` is a blocking GPU round-trip that only produces console
   text.

`EngineProvider` (root layout) pauses the decorative infinite CSS animations
(`animate-float`, `animate-twinkle`, `animate-heartbeat`, …) while their
element is off-screen and resumes them 160 px before they return.

### Evidence (same build, `?engine=off` vs on, headless SwiftShader — relative only)

GPU link/reflection calls by the context they ran in, whole-page journey:

| | inside rAF (visible jank) | inside idle callbacks | other |
| --- | --- | --- | --- |
| engine **off** | **26.1 s**, worst 1.9 s | 0 | 2.6 s |
| engine **on** | **5.3 s**, worst 0.7 s | 16.2 s | 5.1 s |

Off-screen decorative animations while at the gallery: 23 paused, 2 running
(before: all 25 running). Scheduler state during the journey showed at most
one canvas rendering at a time and zero frames for off-screen roots.

### QA switches

- `?engine=off` — stock R3F loop, no warm-up, no pausing (A/B on one build).
- `window.__engine.stats()` — `{ roots: [{ id, area, hint, rendering, frames, primed }], avgFrameMs, fps }`.
- User Timing marks `engine:<id>:compile`, `engine:<id>:warm`, `engine:<id>:primed` in DevTools › Performance.
- `?stats=1` (existing) — per-canvas draw calls / programs.
- `?parity=on|off` — force / suppress the desktop choreography on a touch device.
- `?quality=low|mid|high` (existing) — force the tier; `sessionStorage.whimlet-tier-cap` shows a runtime demotion.
- `window.__tilt()` — `{ active, users, pointer }` of the tilt source.

Unit tests for the decision logic: `npm run test:engine`.

### Touch parity (v0.16.0)

The site was desktop-first: the section peel, card fan, sticky stack, the 3D
desk and every pointer-driven motion were gated on "has a mouse". The engine
now decides per device instead (`src/lib/engine/capability.ts`):

1. **Tier from the GPU, not the UA.** `gpuScore()` reads the unmasked WebGL
   renderer (Adreno / Mali / Immortalis / Xclipse / Apple / PowerVR buckets);
   a recognised GPU decides the tier with `deviceMemory` as the correction.
   Unknown strings fall back to the old cores + memory heuristic; software
   renderers are always low.
2. **Runtime correction.** drei's `PerformanceMonitor` still steps the DPR;
   when a canvas is *still* declining at DPR 1 (or the monitor gives up) the
   session tier is demoted once (`demoteTier()`), every mounted scene
   re-reads its preset, and `sessionStorage` carries it to the next page.
3. **Parity.** `useTouchParity()` = coarse pointer ∧ tier ≠ low ∧ no
   reduced-motion. `useDesktopPointer()` passes for it, so the existing
   components take their desktop path unchanged; a component whose layout is
   breakpoint-bound opts out (`OccasionSection`).
4. **Tilt as the pointer** (`tilt.ts`). One `deviceorientation` listener;
   `EngineRoot` writes the tilt into each canvas's R3F `pointer` before
   `advance()`, so the scenes' existing parallax / nudge / Breeze code runs.
   The rest pose follows the hand (τ 3.2 s) — a phone on a table is still. A
   finger on the canvas owns the pointer for 800 ms. `--tilt-sx/sy/o` on
   `<html>` move the card sheen and glass specular (CSS only).
   Permission: Chrome ≥ 151 and Safari expose
   `DeviceOrientationEvent.requestPermission()`; it is called silently when
   the Permissions API already reports the sensors granted, otherwise from
   the visitor's first tap on a 3D canvas. Never on the welcome door, never
   under reduced motion, HTTPS only.

---

## Server engine

### Docker (any VPS with Docker)

```sh
# plain HTTP on :80 (behind Cloudflare / another TLS proxy)
docker compose -f engine/compose.yml up -d --build

# with a domain → automatic HTTPS (Let's Encrypt) + HTTP/3
SITE_ADDRESS=whimlet.example.com docker compose -f engine/compose.yml up -d --build
```

- `web`: `engine/Dockerfile` — multi-stage, `output: "standalone"`, non-root,
  `HEALTHCHECK` on `/api/health`, ~150 MB image, no `node_modules` at runtime.
- `caddy`: `engine/Caddyfile` — `encode zstd br gzip`, `/_next/static/*`
  immutable for a year, `/images/*` a day + stale-while-revalidate, sane
  security headers, upstream health checks.

### Bare VPS (no Docker)

```sh
npm run engine:pack                           # → whimlet-standalone.tar.gz (~26 MB)
scp whimlet-standalone.tar.gz user@vps:/srv/
ssh user@vps 'cd /srv && rm -rf whimlet && mkdir whimlet && tar xzf whimlet-standalone.tar.gz -C whimlet'
sudo cp engine/whimlet.service /etc/systemd/system/ && sudo systemctl enable --now whimlet
```

Requires only Node ≥ 20 on the server. Put Caddy (`engine/Caddyfile` with
`UPSTREAM=127.0.0.1:3000`) or nginx in front for TLS and compression.

### Other targets

- **Node PaaS (Render, Railway, Fly, …):** `npm run build && npm start` as
  before; `/api/health` for their health checks.
- **GitHub Pages / any static host:** unchanged — `npm run build:pages`. The
  client engine is inside the bundle, so the static site gets it too.

### Verified here

`npm run engine:pack` → archive extracted to a clean directory → `node
server.js` served `/`, `/studio`, `/api/health` (200), `/images/*` with the
day/SWR cache header, gzip-encoded HTML (233 KB → 28 KB). Docker/Caddy files
are syntax-reviewed but **not** executed in this sandbox (no Docker daemon).
