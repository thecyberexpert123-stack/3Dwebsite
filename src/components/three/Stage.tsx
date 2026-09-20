"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, type CanvasProps } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  PerformanceMonitor,
} from "@react-three/drei";
import * as THREE from "three";
import type { Quality } from "@/lib/quality";

/* ================================================================
   Shared lighting rig — ONE visual language for every scene.
   Warm key from the top-right (a window), a blush fill from the
   left/back, and a local Lightformer environment (no HDRI fetch).
   ================================================================ */

export function StudioLights({
  target = [0, 0.8, 0],
  keyIntensity = 1.1,
}: {
  target?: [number, number, number];
  keyIntensity?: number;
}) {
  return (
    <>
      <ambientLight intensity={0.95} color="#FFF6EC" />
      <directionalLight position={[3, 5, 2.5]} intensity={keyIntensity} color="#FFFFFF" />
      <directionalLight position={[-4, 2.5, -2]} intensity={0.35} color="#FFDCE4" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.0} color="#FFF3E4" position={[0, 3, 4]} scale={[7, 3, 1]} target={target} />
        <Lightformer form="rect" intensity={0.5} color="#FFDEE7" position={[-5, 1.5, -3]} scale={[6, 2.5, 1]} target={target} />
        <Lightformer form="rect" intensity={0.35} color="#EAF2E4" position={[5, 2, 2]} scale={[5, 2, 1]} target={target} />
      </Environment>
    </>
  );
}

/** Soft, colour-tinted contact shadow shared by all still lifes. */
export function StudioShadows({
  scale = 10,
  far = 2.4,
  opacity = 0.35,
  resolution = 512,
  position = [0, 0.001, 0] as [number, number, number],
}: {
  scale?: number;
  far?: number;
  opacity?: number;
  resolution?: number;
  position?: [number, number, number];
}) {
  return (
    <ContactShadows
      position={position}
      opacity={opacity}
      scale={scale}
      blur={2.6}
      far={far}
      resolution={resolution}
      color="#96566A"
      frames={Infinity}
    />
  );
}

/* ================================================================
   Adaptive canvas — device-tier DPR that is *corrected at runtime*.
   PerformanceMonitor watches measured fps; on decline we step DPR
   down (never below 1), on incline back up to the tier cap.
   ================================================================ */

type AdaptiveCanvasProps = Omit<CanvasProps, "dpr"> & {
  quality: Quality;
  /** rendered instead of the canvas if the GPU context is lost and not restored */
  fallback?: React.ReactNode;
};

export function AdaptiveCanvas({ quality, children, gl, fallback = null, onCreated, ...rest }: AdaptiveCanvasProps) {
  const [dpr, setDpr] = useState<number>(quality.dpr[1]);
  const [lost, setLost] = useState(false);

  // if the tier is measured after mount, adopt its cap
  useEffect(() => setDpr(quality.dpr[1]), [quality]);

  if (lost) return <>{fallback}</>;

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", ...gl }}
      onCreated={(state) => {
        // Context loss (GPU reset, too many contexts, background tab on mobile):
        // let the browser try to restore; if it doesn't within 3s, show the
        // static fallback instead of a blank rectangle.
        const canvas = state.gl.domElement;
        let timer: ReturnType<typeof setTimeout> | null = null;
        canvas.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          timer = setTimeout(() => setLost(true), 3000);
        });
        canvas.addEventListener("webglcontextrestored", () => {
          if (timer) clearTimeout(timer);
          setDpr(1); // come back conservatively; PerformanceMonitor may raise it again
        });
        onCreated?.(state);
      }}
      {...rest}
    >
      <PerformanceMonitor
        ms={250}
        iterations={6}
        threshold={0.7}
        flipflops={3}
        onDecline={() => setDpr((d) => Math.max(1, +(d - 0.25).toFixed(2)))}
        onIncline={() => setDpr((d) => Math.min(quality.dpr[1], +(d + 0.25).toFixed(2)))}
        onFallback={() => setDpr(1)}
      >
        {children}
      </PerformanceMonitor>
    </Canvas>
  );
}

/* ================================================================
   Intro clock — a scene-wide "seconds since the curtain went up".
   Objects read `t.current` inside their own useFrame and derive
   their entrance from shared timing helpers (lib/intro.ts). One
   clock ⇒ one choreography.
   ================================================================ */

type IntroClock = { t: React.RefObject<number>; started: boolean; reduced: boolean };

const IntroContext = createContext<IntroClock>({ t: { current: 1e6 }, started: true, reduced: false });

export function IntroClockProvider({
  started,
  reduced,
  children,
}: {
  started: boolean;
  reduced: boolean;
  children: React.ReactNode;
}) {
  const t = useRef(reduced ? 1e6 : 0);
  const value = useRef<IntroClock>({ t, started, reduced });
  value.current.started = started;
  value.current.reduced = reduced;

  useFrame((_, dt) => {
    if (reduced) {
      t.current = 1e6;
      return;
    }
    if (started) t.current += Math.min(dt, 0.05); // clamp: tab-switch jumps must not skip beats
  });

  return <IntroContext.Provider value={value.current}>{children}</IntroContext.Provider>;
}

export function useIntroClock(): IntroClock {
  return useContext(IntroContext);
}

/* ================================================================
   Soft-edged ground — the scene sits *on the page*, not in a box.
   A radial alpha map fades the disc into the surrounding gingham.
   ================================================================ */

let groundAlpha: THREE.Texture | null = null;
function groundAlphaMap(): THREE.Texture {
  if (groundAlpha) return groundAlpha;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.42, "#fff");
  g.addColorStop(0.78, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "#000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  groundAlpha = new THREE.CanvasTexture(c);
  return groundAlpha;
}

export function SoftGround({
  radius = 3.0,
  color = "#FAF1E5",
  opacity = 1,
}: {
  radius?: number;
  color?: string;
  opacity?: number;
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const { t, reduced } = useIntroClock();
  useFrame(() => {
    if (!mat.current) return;
    // the surface fades up first — everything else lands on it
    const k = reduced ? 1 : Math.min(1, t.current / 0.9);
    mat.current.opacity = opacity * k;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} renderOrder={-1}>
      <circleGeometry args={[radius, 56]} />
      <meshStandardMaterial
        ref={mat}
        color={color}
        roughness={1}
        transparent
        opacity={0}
        alphaMap={groundAlphaMap()}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ================================================================
   Breeze — the pointer is the wind.
   Pointer velocity becomes a signed gust (−1…1, + = moving right)
   that flowers, petals and dust read through `useWind()`. Attack is
   fast, decay is slow, so a flick of the mouse leaves the bouquet
   swaying for a moment: the visitor *touches* the scene without
   grabbing it.
   ================================================================ */

const WindContext = createContext<React.RefObject<number>>({ current: 0 });

export function Breeze({ children, reduced }: { children: React.ReactNode; reduced: boolean }) {
  const wind = useRef(0);
  const prev = useRef(new THREE.Vector2());
  const primed = useRef(false);

  useFrame(({ pointer }, dt) => {
    if (reduced) {
      wind.current = 0;
      return;
    }
    if (!primed.current) {
      prev.current.copy(pointer);
      primed.current = true;
      return;
    }
    const dx = pointer.x - prev.current.x;
    const dy = pointer.y - prev.current.y;
    prev.current.copy(pointer);
    const speed = Math.hypot(dx, dy) / Math.max(dt, 1e-3); // NDC units / s
    const gust = THREE.MathUtils.clamp(speed * 0.45, 0, 1) * Math.sign(dx || 1);
    const rising = Math.abs(gust) > Math.abs(wind.current);
    wind.current = THREE.MathUtils.damp(wind.current, gust, rising ? 10 : 1.4, dt);
  });

  return <WindContext.Provider value={wind}>{children}</WindContext.Provider>;
}

export function useWind(): React.RefObject<number> {
  return useContext(WindContext);
}
