"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useMediaQuery } from "@/lib/hooks";

/**
 * Magnetic wrapper for primary calls-to-action: within `radius` px the child
 * eases a little toward the pointer, and springs back on leave. Feedback
 * that says "this is the thing to press" without shouting.
 *
 * Direct DOM writes (no re-renders). Fine pointers only; off for
 * prefers-reduced-motion. Layout is untouched — only `transform` moves.
 */
export function Magnetic({
  children,
  strength = 0.28,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduce = useReducedMotion();
  const enabled = finePointer && !reduce;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transition = "transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transform = `translate(${(dx * strength).toFixed(1)}px, ${(dy * strength).toFixed(1)}px)`;
  };

  const onLeave = () => {
    if (!ref.current) return;
    const el = ref.current;
    el.style.transition = "transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)";
    el.style.transform = "";
  };

  return (
    <div ref={ref} className={`inline-block ${className ?? ""}`} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </div>
  );
}
