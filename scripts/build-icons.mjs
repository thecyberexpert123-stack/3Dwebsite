/**
 * Whimlet app logo — one source of truth, rendered into every size the
 * platform needs (web manifest, favicon, Apple touch icon, Google OAuth
 * consent-screen logo).
 *
 *   npm run icons
 *
 * Writes:
 *   - src/app/icon.svg          favicon + <head> shortcut (vector)
 *   - public/icons/*.png        manifest / meta icons (regular + maskable)
 *   - public/logo/*.png         square files for external consoles (OAuth app
 *                               logo, store listings, etc.)
 *
 * The design: a rounded pastel tile with a running-stitch seam and a
 * hand-crocheted heart — filled with rows of little "V" stitches (the
 * single-crochet hallmark) and finished with two yarn-sparkle dots. Same
 * brand tokens as the rest of the site (globals.css `--color-*`).
 *
 * Why a generated SVG instead of an AI raster: the mark must stay crisp at
 * 48 px and 512 px and on any background, and its palette/geometry must be
 * reviewable line-by-line — an SVG is the only honest way to guarantee all
 * three without a designer in the loop.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const HEART =
  "M32 50C22 43 13 36 13 27.5 13 21 18 16 24 16c3.2 0 6 1.6 8 4 2-2.4 4.8-4 8-4 6 0 11 5 11 11.5C51 36 42 43 32 50z";

/**
 * @param {{ maskable?: boolean }} opts  maskable = full-bleed square (no
 *   rounded corners): the OS mask system crops it, so art must sit inside
 *   the 80% safe zone (the heart does — see the 115..397 x-extent below).
 */
function logoSvg({ maskable = false } = {}) {
  // Maskable icons get a full-bleed tile with NO border and NO sparkles:
  // OS launcher masks crop the outer ring, so only the heart (kept well
  // inside the 80% safe zone) is guaranteed to survive any mask shape.
  if (maskable) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fffdfe"/>
      <stop offset="0.52" stop-color="#ffeef3"/>
      <stop offset="1" stop-color="#f9c6d3"/>
    </linearGradient>
    <linearGradient id="heart" x1="0" y1="0" x2="0.55" y2="1">
      <stop offset="0" stop-color="#f3a8bf"/>
      <stop offset="1" stop-color="#e07a9a"/>
    </linearGradient>
    <pattern id="stitch" width="23" height="18" patternUnits="userSpaceOnUse">
      <path d="M5 3.5 11.5 12.5 18 3.5" fill="none" stroke="#fffbfc"
            stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"
            opacity="0.65"/>
    </pattern>
  </defs>
  <rect width="512" height="512" fill="url(#tile)"/>
  <g transform="translate(256 260) scale(7.4) translate(-32 -34)">
    <path d="${HEART}" fill="url(#heart)" stroke="#b8456f"
          stroke-width="0.28" stroke-linejoin="round"/>
    <path d="${HEART}" fill="url(#stitch)"/>
  </g>
</svg>`;
  }
  const tile = `<rect x="16" y="16" width="480" height="480" rx="112" fill="url(#tile)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fffdfe"/>
      <stop offset="0.52" stop-color="#ffeef3"/>
      <stop offset="1" stop-color="#f9c6d3"/>
    </linearGradient>
    <linearGradient id="heart" x1="0" y1="0" x2="0.55" y2="1">
      <stop offset="0" stop-color="#f3a8bf"/>
      <stop offset="1" stop-color="#e07a9a"/>
    </linearGradient>
    <pattern id="stitch" width="23" height="18" patternUnits="userSpaceOnUse">
      <path d="M5 3.5 11.5 12.5 18 3.5" fill="none" stroke="#fffbfc"
            stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"
            opacity="0.65"/>
    </pattern>
  </defs>
  ${tile}
  <rect x="38" y="38" width="436" height="436" rx="92" fill="none"
        stroke="#e07a9a" stroke-width="5" stroke-dasharray="0.1 26"
        stroke-linecap="round" opacity="0.7"/>
  <g transform="translate(256 268) scale(7.4) translate(-32 -34)">
    <path d="${HEART}" fill="url(#heart)" stroke="#b8456f"
          stroke-width="0.28" stroke-linejoin="round"/>
    <path d="${HEART}" fill="url(#stitch)"/>
  </g>
  <g fill="#ffffff">
    <path d="M392 136 l7 17 17 7 -17 7 -7 17 -7 -17 -17 -7 17 -7 z" opacity="0.95"/>
    <path d="M118 372 l5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5 z" opacity="0.8"/>
  </g>
</svg>`;
}

const JOBS = [
  { file: "public/icons/icon-192.png", size: 192, maskable: false },
  { file: "public/icons/icon-512.png", size: 512, maskable: false },
  { file: "public/icons/maskable-192.png", size: 192, maskable: true },
  { file: "public/icons/maskable-512.png", size: 512, maskable: true },
  { file: "public/icons/apple-touch-icon.png", size: 180, maskable: false },
  { file: "public/logo/whimlet-logo-128.png", size: 128, maskable: false },
  { file: "public/logo/whimlet-logo-512.png", size: 512, maskable: false },
];

const root = new URL("..", import.meta.url).pathname;

async function main() {
  await mkdir(path.join(root, "public/icons"), { recursive: true });
  await mkdir(path.join(root, "public/logo"), { recursive: true });

  await writeFile(path.join(root, "src/app/icon.svg"), logoSvg());

  let wrote = 0;
  for (const job of JOBS) {
    const out = path.join(root, job.file);
    await sharp(Buffer.from(logoSvg({ maskable: job.maskable })))
      .resize(job.size, job.size)
      .png()
      .toFile(out);
    wrote += 1;
    console.log(`✔ ${job.file} (${job.size}×${job.size}${job.maskable ? ", maskable" : ""})`);
  }
  console.log(`✔ src/app/icon.svg (vector)`);
  console.log(`wrote ${wrote} rasters + 1 svg`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
