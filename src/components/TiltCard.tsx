"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useMediaQuery } from "@/lib/hooks";

/**
 * Pointer-tracked 3D tilt. Writes transforms directly to the DOM node —
 * no re-renders per pointermove. Enabled only on fine pointers (mouse)
 * and disabled for prefers-reduced-motion.
 */
export function TiltCard({
  children,
  className,
  max = 6,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduce = useReducedMotion();
  const enabled = finePointer && !reduce;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.transition = "transform 0.15s ease-out";
    ref.current.style.transform =
      `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-3px)`;
  };

  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.transition = "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)";
    ref.current.style.transform = "";
  };

  return (
    <div ref={ref} className={className} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </div>
  );
}
