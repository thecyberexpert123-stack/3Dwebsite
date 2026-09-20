#!/usr/bin/env node
/**
 * Image optimization for Whimlet (run: npm run optimize:images)
 *
 * Resizes any image wider than MAX_WIDTH down to MAX_WIDTH, strips metadata
 * and recompresses as quality-80 JPEGs. Uses ImageMagick — supports both
 * ImageMagick 7 (`magick`) and ImageMagick 6 (`convert` + `identify`) —
 * no runtime dependencies are added to the site.
 *
 * Run this after dropping new photos into public/images/.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "public/images";
const MAX_WIDTH = 1000;
const QUALITY = 80;

function has(cmd) {
  try {
    execFileSync("which", [cmd], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/** Returns { identify, convert } shell command prefixes. */
function findTools() {
  if (has("magick")) return { identify: "magick identify", convert: "magick" }; // IM7
  if (has("identify") && has("convert")) return { identify: "identify", convert: "convert" }; // IM6
  throw new Error("ImageMagick not found. Install it, or optimize images manually.");
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(jpe?g)$/i.test(entry)) yield full;
  }
}

const { identify, convert } = findTools();
let changed = 0;
let kept = 0;

for (const file of walk(ROOT)) {
  const width = parseInt(
    execFileSync("sh", ["-c", `${identify} -format "%w" "${file}"`])
      .toString()
      .trim(),
    10
  );
  if (Number.isNaN(width)) {
    console.warn(`  ? could not read ${file} — skipped`);
    continue;
  }
  if (width > MAX_WIDTH) {
    execFileSync("sh", [
      "-c",
      `${convert} "${file}" -resize ${MAX_WIDTH}x -strip -interlace Plane -quality ${QUALITY} "${file}"`,
    ]);
    console.log(`  ↓ ${file} (${width}px → ${MAX_WIDTH}px)`);
    changed++;
  } else {
    kept++;
  }
}

console.log(`\nDone: ${changed} optimized, ${kept} already fine.`);
