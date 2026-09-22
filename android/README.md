# Whimlet on Android

Three layers, from "works in Chrome on any phone" to "an app on the Play
Store". None of them changes the site's components — the Android work lives
in the manifest route, a CSS runtime block, the engine's Android shim, and
this folder.

| Layer | What the user gets | Where |
| --- | --- | --- |
| **1. Mobile web** | The whole site (home, `/studio`, `/maker`) on Android Chrome / Samsung Internet / Firefox — touch, safe areas, keyboard-safe sheets, hardware Back that closes overlays. | `src/app/globals.css` (Android/touch runtime block), `src/lib/engine/android.ts`, `src/app/layout.tsx` viewport |
| **2. Installable (PWA)** | "Add to Home screen" / Chrome's install prompt → standalone window, own icon + splash, app shortcuts (Studio, Maker). | `src/app/manifest.ts`, `public/icons/*` |
| **3. Play Store (TWA)** | A real `.aab`/`.apk` that opens the site full-screen inside Chrome (no browser UI), updated by deploying the site. | `android/twa-manifest.json`, `public/.well-known/assetlinks.json` |

## Layer 1 — what changed for phones (and why)

Everything here was verified in Android emulation (Pixel-class viewport,
touch, Android UA, 390 px) — screenshots of every section, `/studio` and
`/maker`, no console errors, no horizontal overflow.

- **Viewport**: `viewport-fit=cover` (draw under the status/gesture bars) +
  `interactive-widget=resizes-visual` (the layout does not jump when the
  keyboard opens). Safe-area insets are exposed as `--sat/--sab/--sal/--sar`
  and applied to the fixed navbar and bottom sheets.
- **Touch**: no grey tap flash, no pull-to-refresh fighting the smoother,
  no long-press "save image" sheet on canvases/decorations, text-size
  adjust off (Android's font boosting broke the designed sizes).
- **Touch targets**: small option controls (backdrop dots, preset/tab chips)
  get an invisible 44 px hit area via a pseudo-element — pixels don't move.
- **Grain**: the blended fixed grain layer is switched to a plain low-alpha
  layer on coarse pointers — a blended fixed layer forces Android to
  re-composite the page on every scroll.
- **Hardware Back** (`src/lib/engine/android.ts`): every opened overlay
  (`[role="dialog"][aria-modal]` — product sheet, gallery lightbox, mobile
  menu) pushes one history entry; Back pops it and dispatches the `Escape`
  the component already handles. Closing with × consumes the entry. The
  welcome door is deliberately excluded (it is an entrance, not an overlay).
- **Keyboard**: visual-viewport height → `--vvh`; `html.kbd-open` lifts the
  studio/maker bottom sheets above the keyboard while naming a design.
- **Installed mode**: `html.pwa` + `(display-mode: standalone)` rules give
  the header room under the status bar.
- **3D on phones** (already in place, unchanged): device-tier quality
  (`?quality=` to force), DPR governor, the engine's one-canvas-at-a-time
  scheduler and shader warm-up, context-loss fallback, `touch-action:
  pan-y` on the studio drag surface, orbit gestures only on the app pages.

## Layer 2 — install as an app (no store)

1. Open the site in Chrome on Android → ⋮ → **Add to Home screen** (Chrome
   also offers its own install banner after ~30 s of engagement).
2. The manifest gives it: name "Whimlet", the heart icon (maskable variant
   for round/squircle launchers), blush splash, `standalone` display,
   shortcuts to Studio and Maker on long-press.

Verify after deploying: DevTools → Application → Manifest shows no
warnings; `https://<domain>/manifest.webmanifest` and the four icons return
200. Requires **HTTPS** (the engine's Caddy setup does this; GitHub Pages
does too).

No service worker is registered on purpose: the site is a 3D experience
that needs the network anyway (WhatsApp handoff, share links), and a stale
cached bundle is the fastest way to break a WebGL app after a deploy.
Chrome's current install criteria (manifest + icons + HTTPS) do not require
one.

## Layer 3 — Play Store via Trusted Web Activity

A TWA is Chrome rendering the live site full-screen inside a tiny native
shell. The shell is generated — no Android code to maintain — and the site
keeps deploying as usual.

**One-time, on a machine with Java 17 + the Android SDK** (Bubblewrap
offers to install both):

```sh
npm i -g @bubblewrap/cli
cd android
# 1. put your real domain into twa-manifest.json (host, iconUrl, webManifestUrl, fullScopeUrl)
# 2. generate the project (reads the site's manifest; creates android.keystore — keep it safe, never commit)
bubblewrap init --manifest https://<domain>/manifest.webmanifest
# 3. build → app-release-signed.apk (sideload for testing) + app-release-bundle.aab (Play Console)
bubblewrap build
```

**Digital Asset Links** (what removes the browser bar): Android must be able
to prove the app and the site belong together.

1. Get the SHA-256 of the signing certificate. For a Play upload, use the
   **App signing key** fingerprint from Play Console → Setup → App
   integrity (not the upload key); for a sideloaded test build,
   `bubblewrap fingerprint list` or
   `keytool -list -v -keystore android.keystore -alias whimlet`.
2. Paste it into `public/.well-known/assetlinks.json` and deploy. It must be
   served from the **origin root** — `https://<domain>/.well-known/assetlinks.json`,
   content-type `application/json`. (On a GitHub *project* Pages site the
   root is `<owner>.github.io/`, not `/3Dwebsite/` — use a custom domain or
   a user-site repo for the TWA.)
3. Check with `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://<domain>&relation=delegate_permission/common.handle_all_urls`.
   If the app opens with a URL bar, the fingerprint in the JSON does not
   match the certificate that signed the installed build.

Then upload the `.aab` in Play Console (internal testing first). Store
listing needs the 512 px icon (`public/icons/icon-512.png`), a feature
graphic and phone screenshots — take them from the installed app.

Updates: deploy the site. Rebuild the shell only when its own metadata
changes (name, icon, colours, start URL) — bump `appVersionCode` then.

## Not verified here

- No Android device/emulator or Android SDK exists in this sandbox: layers 1–2
  were verified with Chrome's Android emulation (viewport, touch, UA,
  display-mode) and by inspecting the served manifest/icons; the **install
  prompt and the TWA build were not executed**. `twa-manifest.json` follows
  Bubblewrap's current schema and the assetlinks file follows Google's
  documented format, both with placeholders where your domain and
  certificate go.
