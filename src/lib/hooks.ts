"use client";

import { useEffect, useState } from "react";

/** Reactive media-query hook (SSR-safe: false until mounted + measured). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** "Desktop with a mouse": the gate for scroll-linked choreography that
 *  would only cost frames on touch (pinned strips, card stacks, section
 *  peel). QA override `?pointer=fine` lets headless runs (which report
 *  hover:none) exercise the desktop path. */
export function useDesktopPointer(minWidth = 1024): boolean {
  const mq = useMediaQuery(`(min-width: ${minWidth}px) and (hover: hover) and (pointer: fine)`);
  const [forced, setForced] = useState(false);
  useEffect(() => {
    setForced(new URLSearchParams(window.location.search).get("pointer") === "fine" && window.innerWidth >= minWidth);
  }, [minWidth]);
  return mq || forced;
}

/** Simplify the 3D scene on small screens. */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/**
 * WebGL capability detection.
 * - null: not checked yet (during SSR / first paint)
 * - true/false: result after mount
 */
export function useWebGL(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let ok = false;
    try {
      const canvas = document.createElement("canvas");
      ok = !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      ok = false;
    }
    setSupported(ok);
  }, []);

  return supported;
}

/** Normalized scroll progress (0 → 1) of a section, written into a ref (no re-renders). */
export function useSectionScrollProgress(
  id: string,
  ref: React.RefObject<number>
): void {
  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height + window.scrollY;
      const progress = window.scrollY / Math.max(total, 1);
      ref.current = Math.min(1, Math.max(0, progress));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [id, ref]);
}

/**
 * Tracks whether an element is (near) the viewport.
 * - Acccent 3D scenes mount only when `near`, so off-screen canvases cost nothing.
 * - Always-on scenes (hero) can flip R3F's frameloop to "never" while off-screen.
 */
export function useInViewport<T extends Element>(
  ref: React.RefObject<T | null>,
  margin = "300px"
): boolean {
  const [inView, setInView] = useState(ref.current === null ? false : true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let idle = 0;
    let nearIn = false;
    let warmIn = false;
    const cancelIdle = () => {
      if (!idle) return;
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(idle);
      else clearTimeout(idle);
      idle = 0;
    };
    const sync = () => setInView(nearIn || warmIn);
    // Near: the section's own margin — mount/activate right away.
    const near = new IntersectionObserver(
      ([entry]) => {
        nearIn = entry.isIntersecting;
        if (nearIn) cancelIdle();
        sync();
      },
      { rootMargin: margin }
    );
    // Warm-up ring (engine): one viewport further out, mount during an idle
    // slice so the scene's shaders compile *before* it scrolls in. The engine
    // scheduler keeps an off-screen canvas from rendering, so this only costs
    // the compile — exactly the cost we want off the visible path. Leaving the
    // ring unmounts again (memory), same as before.
    const engineOn = new URLSearchParams(window.location.search).get("engine") !== "off";
    const warm = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          cancelIdle();
          warmIn = false;
          sync();
          return;
        }
        if (idle || warmIn) return;
        const fire = () => {
          idle = 0;
          warmIn = true;
          sync();
        };
        idle = "requestIdleCallback" in window ? window.requestIdleCallback(fire, { timeout: 2500 }) : (setTimeout(fire, 400) as unknown as number);
      },
      { rootMargin: WARM_MARGIN }
    );
    near.observe(el);
    if (engineOn) warm.observe(el);
    return () => {
      cancelIdle();
      near.disconnect();
      warm.disconnect();
    };
  }, [ref, margin]);

  return inView;
}

/** How far ahead (px) the engine pre-mounts a scene to warm its shaders. */
const WARM_MARGIN = "1100px 0px";
