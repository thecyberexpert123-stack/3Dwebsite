"use client";

import { useEffect } from "react";
import { engineEnabled } from "./EngineRoot";

/**
 * Whimlet Engine — page-level governor. Mounted once in the root layout.
 *
 * The 3D side of the engine lives in `EngineRoot` (per canvas). This part
 * looks after the *DOM* animations without touching any component:
 *
 *  - Decorative infinite CSS animations (`animate-float`, `animate-twinkle`,
 *    `animate-heartbeat`, …) are paused while their element is off-screen and
 *    resumed just before it scrolls back in. Measured on the home page: ~25
 *    such animations tick at once and at most 2–3 are ever visible.
 *    They are all transform/opacity (compositor-only), so this mostly saves
 *    compositor work and battery on low-end/mobile — but it is free.
 *
 *  - New elements (modals, lazy sections) are picked up by a MutationObserver,
 *    batched per animation frame.
 *
 * `?engine=off` disables it along with the rest of the engine, for A/B.
 */

const DECORATIVE = /\banimate-(?:float|float-slow|sway|heartbeat|bounce-soft|twinkle|wiggle|marquee)\b/;

export function EngineProvider() {
  useEffect(() => {
    if (!engineEnabled()) return;
    if (typeof IntersectionObserver === "undefined") return;

    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          el.style.animationPlayState = e.isIntersecting ? "" : "paused";
        }
      },
      { rootMargin: "160px 0px" }
    );

    const watch = (el: Element) => {
      // getAttribute, not .className: on SVG doodles (most of the twinkles and
      // hearts) className is an SVGAnimatedString, not a string
      if (seen.has(el) || !DECORATIVE.test(el.getAttribute("class") ?? "")) return;
      seen.add(el);
      io.observe(el);
    };
    const scan = (root: Element | Document) => {
      if (root instanceof Element) watch(root);
      for (const el of root.querySelectorAll('[class*="animate-"]')) watch(el);
    };
    scan(document);

    let raf = 0;
    const pending = new Set<Element>();
    const mo = new MutationObserver((records) => {
      for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1) pending.add(n as Element);
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        for (const n of pending) if (n.isConnected) scan(n);
        pending.clear();
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      io.disconnect();
    };
  }, []);

  return null;
}
