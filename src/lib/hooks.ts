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
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: margin,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);

  return inView;
}
