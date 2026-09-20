"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useMediaQuery } from "@/lib/hooks";

/**
 * Pointer-tracked 3D tilt with a soft light sheen that follows the cursor —
 * the card behaves like a glossy print card catching the studio window.
 * Writes transforms/vars directly to the DOM node — no re-renders per
 * pointermove. Enabled only on fine pointers (mouse) and disabled for
 * prefers-reduced-motion.
 */
export function TiltCard({
  children,
  className,
  max = 6,
  sheen = true,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
  sheen?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduce = useReducedMotion();
  const enabled = finePointer && !reduce;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transition = "transform 0.15s ease-out";
    el.style.transform =
      `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-3px)`;
    el.style.setProperty("--sheen-x", `${((px + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--sheen-y", `${((py + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--sheen-o", "1");
  };

  const onLeave = () => {
    if (!ref.current) return;
    const el = ref.current;
    el.style.transition = "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transform = "";
    el.style.setProperty("--sheen-o", "0");
  };

  return (
    <div
      ref={ref}
      className={`${sheen ? "tilt-sheen" : ""} ${className ?? ""}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {children}
    </div>
  );
}
