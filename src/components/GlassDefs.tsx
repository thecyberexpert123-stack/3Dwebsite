"use client";

import { useEffect } from "react";

/**
 * Liquid-glass support layer for every `.btn` (see `globals.css` → "liquid glass").
 *
 * 1. An SVG filter, `#glass-bend`, that bends the backdrop like a convex lens:
 *    a displacement map whose red/green channels ramp only near the edges, so
 *    the middle of the button stays flat and the rim refracts what's behind it.
 *    It is referenced through `backdrop-filter: url(#glass-bend)` — Chromium
 *    only; other engines keep the frosted (non-bent) glass, so we gate the
 *    class on a UA check rather than `@supports` (Safari claims support and
 *    renders nothing).
 * 2. A delegated pointer listener that writes `--mx/--my` on the hovered button
 *    so its specular highlight follows the viewer — direct DOM writes, no React
 *    state per move, fine pointers only.
 */
export function GlassDefs() {
  useEffect(() => {
    const ua = navigator.userAgent;
    const chromium =
      (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands.some((b) =>
        /Chromium/i.test(b.brand),
      ) ?? /Chrome\/|CriOS\/|Edg\//.test(ua);
    if (chromium) document.documentElement.classList.add("glass-bend");

    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let last: HTMLElement | null = null;
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(".btn") as HTMLElement | null;
      if (last && last !== el) {
        last.style.removeProperty("--mx");
        last.style.removeProperty("--my");
      }
      last = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);

  // Map: R ramps 0→0.5 over the left 22% and 0.5→1 over the right 22%
  // (flat 0.5 in between); G the same vertically. Encoded as two feImages
  // (one per channel) added together, so the SVG needs no blend modes.
  const gx = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' preserveAspectRatio='none'><defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='#000'/><stop offset='0.22' stop-color='#800000'/><stop offset='0.78' stop-color='#800000'/><stop offset='1' stop-color='#f00'/></linearGradient></defs><rect width='64' height='64' fill='url(#g)'/></svg>`,
  );
  const gy = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' preserveAspectRatio='none'><defs><linearGradient id='g' x1='0' x2='0' y1='0' y2='1'><stop offset='0' stop-color='#000'/><stop offset='0.3' stop-color='#008000'/><stop offset='0.7' stop-color='#008000'/><stop offset='1' stop-color='#0f0'/></linearGradient></defs><rect width='64' height='64' fill='url(#g)'/></svg>`,
  );

  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id="glass-bend" x="0" y="0" width="100%" height="100%" filterUnits="objectBoundingBox" primitiveUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
          <feImage href={`data:image/svg+xml,${gx}`} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="rx" />
          <feImage href={`data:image/svg+xml,${gy}`} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="gy" />
          <feComposite in="rx" in2="gy" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="map" />
          {/* scale is in bbox units: 0.16 ⇒ the rim pulls in up to 8% of the width */}
          <feDisplacementMap in="SourceGraphic" in2="map" scale="0.16" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
