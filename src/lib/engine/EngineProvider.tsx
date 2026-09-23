"use client";

import { useEffect } from "react";
import { engineEnabled } from "./EngineRoot";
import { engine, scrollerRunning } from "./scheduler";
import { installAndroidShim } from "./android";
import { acquireTilt } from "./tilt";
import { glassLevel } from "./capability";
import { detectTier, onTierChange, applyStrain, sessionTier } from "@/lib/quality";
import { installPressureObserver, strainFromPressure } from "./pressure";

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
 *  - The Android shim (`android.ts`): hardware Back closes overlays, visual
 *    viewport → `--vvh` for keyboard-safe sheets, `html.pwa` when installed.
 *
 *  - Tilt (`tilt.ts`): on touch devices the phone's orientation becomes the
 *    pointer the 3D scenes read (via EngineRoot) and the light position the
 *    card sheen / glass specular follow (CSS vars on <html>).
 *
 *  - Glass budget (`capability.glassLevel`): `html.glass-frosted` /
 *    `html.glass-lite` on mid / low-tier touch devices trim the liquid-glass
 *    recipe (globals.css) — the displacement filter and the wide blur are
 *    the two most expensive compositor items on a phone. Follows runtime
 *    demotions.
 *
 * `?engine=off` disables it along with the rest of the engine, for A/B.
 */

const DECORATIVE = /\banimate-(?:float|float-slow|sway|heartbeat|bounce-soft|twinkle|wiggle|marquee)\b/;

export function EngineProvider() {
  useEffect(() => {
    if (!engineEnabled()) return;
    const offShim = installAndroidShim();
    const offTilt = acquireTilt();
    const html = document.documentElement;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    // Device strain (Compute Pressure) → governor. Two responses, both paced
    // as the platform recommends (demote immediately, relax only on calm):
    //   1. the scheduler hard-clamps secondary scenes to half rate the moment
    //      the device reports `serious`/`critical` (no scroll needed);
    //   2. the tier governor drops the whole session one preset on `critical`
    //      and eases it back only once pressure reads nominal AND the page's
    //      inertial scroller has settled (so the quality bump never lands on
    //      a frame the visitor is still watching).
    let lastStrain: ReturnType<typeof strainFromPressure> = "idle";
    let relaxTimer = 0;
    const clearRelax = () => {
      if (relaxTimer) {
        window.clearTimeout(relaxTimer);
        relaxTimer = 0;
      }
    };

    const offPressure = installPressureObserver((state) => {
      // 1. scheduler clamp — instant, cheap, reversible. `serious`/`critical`
      //    halves every secondary scene this frame; `nominal` lifts it.
      engine().setPressure(state);
      const strain = strainFromPressure(state, false);
      if (strain === "busy" || strain === "hot") {
        // 2. layered shed: "busy" (serious) keeps the clamp only; "hot"
        //    (critical, needs cooling) also drops the session one preset.
        clearRelax();
        if (strain === "hot") applyStrain(1);
      } else {
        // 3. nominal/idle: ease back up only once the page has settled
        const relax = () => {
          relaxTimer = 0;
          if (strainFromPressure(state, false) !== lastStrain) return; // moved on
          if (!scrollerRunning()) applyStrain(0);
        };
        clearRelax();
        relaxTimer = window.setTimeout(relax, 600);
      }
      lastStrain = strain;
    });

    const applyGlass = () => {
      const level = glassLevel(coarse, sessionTier());
      html.classList.toggle("glass-frosted", level === "frosted");
      html.classList.toggle("glass-lite", level === "lite");
    };
    applyGlass();
    const offTier = onTierChange(applyGlass);
    return () => {
      offShim();
      offTilt();
      offTier();
      offPressure();
      clearRelax();
      html.classList.remove("glass-frosted", "glass-lite");
    };
  }, []);

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
