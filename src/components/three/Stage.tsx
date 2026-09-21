"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type CanvasProps } from "@react-three/fiber";
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
  keyIntensity = 0.95,
  shadowSize = 3,
  outdoor = false,
}: {
  target?: [number, number, number];
  keyIntensity?: number;
  /** half-extent (world units) of the key light's shadow frustum — keep it
   *  as tight as the scene allows; every unit wider costs shadow resolution */
  shadowSize?: number;
  /** meadow variant: the key becomes a low afternoon sun from the back-right
   *  (rim-lit, long shadows toward the camera), fill is sky blue from above
   *  and the bounce is warm grass green from below */
  outdoor?: boolean;
}) {
  const shadows = useShadowsEnabled();
  const { res } = useContext(ShadowContext);
  if (outdoor) {
    return (
      <>
        <ambientLight intensity={0.22} color="#EAF4FF" />
        <hemisphereLight args={["#BFDCF7", "#8FBF62", 0.75]} />
        <directionalLight
          position={[3.5, 3.75, -7]}
          intensity={keyIntensity * 1.35}
          color="#FFF1D6"
          castShadow={shadows}
          shadow-mapSize={[res, res]}
          shadow-camera-near={1}
          shadow-camera-far={20}
          shadow-camera-left={-shadowSize}
          shadow-camera-right={shadowSize}
          shadow-camera-top={shadowSize}
          shadow-camera-bottom={-shadowSize}
          shadow-radius={5}
          shadow-bias={-0.0004}
          shadow-normalBias={0.06}
        />
        {/* soft front fill so the camera-facing side of the gift is never mud */}
        <directionalLight position={[-2, 3, 5]} intensity={0.55} color="#FFF7FA" />
        <Environment resolution={64} frames={1}>
          <Lightformer form="rect" intensity={1.6} color="#DDEEFF" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
          <Lightformer form="rect" intensity={0.6} color="#9CCF6A" position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[20, 20, 1]} />
          <Lightformer form="circle" intensity={1.6} color="#FFE9B8" position={[7, 7.5, -14]} scale={[5, 5, 1]} target={target} />
        </Environment>
      </>
    );
  }
  return (
    <>
      <ambientLight intensity={shadows ? 0.42 : 0.5} color="#FFF4F7" />
      {/* hemisphere: sky-white above, blush bounce from the table below —
          undersides go pink instead of grey, the way pastel toys are lit */}
      <hemisphereLight args={["#FFFBFD", "#F7C9D8", shadows ? 0.5 : 0.55]} />
      {/* key: warm window light, top-right. It is the ONE shadow caster —
          real cast shadows are what make petals sit *on* each other and
          props sit *on* the table instead of floating over a blurred blob. */}
      <directionalLight
        position={[3, 5, 2.5]}
        intensity={shadows ? keyIntensity * 1.18 : keyIntensity}
        color="#FFFDFB"
        castShadow={shadows}
        shadow-mapSize={[res, res]}
        shadow-camera-near={0.5}
        shadow-camera-far={16}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
        shadow-radius={4}
        shadow-bias={-0.0005}
        shadow-normalBias={0.05}
      />
      {/* fill: cool lilac from the left/back so shadows go lavender, not grey */}
      <directionalLight position={[-4, 2.5, -2]} intensity={0.42} color="#E4D6FF" />
      {/* rim: candy-pink kicker from behind separates plump forms from the page */}
      <directionalLight position={[0, 2.2, -4]} intensity={0.35} color="#FFC2D4" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.1} color="#FFF5F0" position={[0, 3, 4]} scale={[7, 3, 1]} target={target} />
        <Lightformer form="rect" intensity={0.55} color="#FFD6E2" position={[-5, 1.5, -3]} scale={[6, 2.5, 1]} target={target} />
        <Lightformer form="rect" intensity={0.4} color="#E6DAFF" position={[5, 2, 2]} scale={[5, 2, 1]} target={target} />
        <Lightformer form="circle" intensity={0.3} color="#D8F3EA" position={[0, -2, 3]} scale={[4, 4, 1]} target={target} />
      </Environment>
    </>
  );
}

/* ================================================================
   Shadows — one policy for every scene.

   With real shadow maps on (mid/high tiers) the key light casts onto a
   hue-tinted ShadowMaterial plane: petals shade the stems, the bow shades
   the box, the yarn ball has a contact edge. That is ONE extra depth pass
   per frame. The low tier (and any scene that opts out) keeps the old
   blurred ContactShadows blob, which is itself a depth pass + two blur
   passes — so the realistic option is not the expensive one.
   ================================================================ */

type ShadowInfo = { enabled: boolean; res: number };
const ShadowContext = createContext<ShadowInfo>({ enabled: false, res: 512 });

export function useShadowsEnabled(): boolean {
  return useContext(ShadowContext).enabled;
}

/** Marks every mesh mounted under the canvas as a shadow caster/receiver.
 *  Objects arrive late (Entrance beats, pops), so a throttled traversal is
 *  the honest way to catch them without touching 60 call sites. Anything
 *  see-through (particles, glows, sparkles, tissue) is skipped so shadows
 *  come only from solid yarn, clay and satin. */
function AutoShadowCasters() {
  const { scene } = useThree();
  const frame = useRef(0);
  useFrame(() => {
    if (frame.current++ % 15 !== 0) return;
    scene.traverse((o) => {
      if (o.userData.shadowed || !(o as THREE.Mesh).isMesh) return;
      const m = o as THREE.Mesh;
      o.userData.shadowed = true;
      const mat = Array.isArray(m.material) ? m.material[0] : m.material;
      if (!mat || (mat as THREE.Material).transparent || !(mat as THREE.Material).depthWrite || m.userData.noShadow) return;
      m.castShadow = true;
      m.receiveShadow = true;
    });
  });
  return null;
}

/** Soft, colour-tinted ground shadow shared by all still lifes. */
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
  const shadows = useShadowsEnabled();
  if (shadows) {
    return (
      <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{ shadowed: true }}>
        <planeGeometry args={[scale, scale]} />
        <shadowMaterial color="#B4607E" opacity={opacity * 1.15} transparent depthWrite={false} />
      </mesh>
    );
  }
  return (
    <ContactShadows
      position={position}
      opacity={opacity}
      scale={scale}
      blur={2.6}
      far={far}
      resolution={resolution}
      color="#B4607E"
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
  /** name under which `?stats=1` publishes this canvas's renderer counters */
  statsLabel?: string;
  /** rendered instead of the canvas if the GPU context is lost and not restored */
  fallback?: React.ReactNode;
};

/* QA hook: with `?stats=1` every canvas publishes its renderer counters to
   `window.__whimletStats[label]` once a second (draw calls, triangles,
   programs, dpr). Zero cost otherwise — the component returns null. */
type StatsBag = Record<string, { calls: number; triangles: number; programs: number; geometries: number; textures: number; dpr: number; fps: number }>;

function StatsProbe({ label }: { label: string }) {
  const { gl, viewport } = useThree();
  const acc = useRef({ frames: 0, last: 0 });
  // counters accumulate across every render pass (main + contact-shadow
  // passes) and are averaged per frame — the honest "calls/frame" number
  useEffect(() => {
    gl.info.autoReset = false;
    gl.info.reset();
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl]);
  useFrame(({ clock }) => {
    const a = acc.current;
    a.frames++;
    const t = clock.elapsedTime;
    if (t - a.last < 1) return;
    const w = window as Window & { __whimletStats?: StatsBag };
    w.__whimletStats ??= {};
    w.__whimletStats[label] = {
      calls: Math.round(gl.info.render.calls / a.frames),
      triangles: Math.round(gl.info.render.triangles / a.frames),
      programs: gl.info.programs?.length ?? 0,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      dpr: viewport.dpr,
      fps: Math.round(a.frames / (t - a.last)),
    };
    gl.info.reset();
    a.frames = 0;
    a.last = t;
  });
  return null;
}

function statsEnabled(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("stats") === "1";
}

export function AdaptiveCanvas({ quality, children, gl, fallback = null, onCreated, statsLabel, ...rest }: AdaptiveCanvasProps) {
  const [dpr, setDpr] = useState<number>(quality.dpr[1]);
  const [lost, setLost] = useState(false);

  // if the tier is measured after mount, adopt its cap
  useEffect(() => setDpr(quality.dpr[1]), [quality]);

  if (lost) return <>{fallback}</>;

  // PCF (not PCFSoft) so `shadow.radius` can feather the edge — crochet is
  // lit by a window, not a laser. The low tier keeps shadow maps off.
  const shadowInfo: ShadowInfo = { enabled: !quality.simple, res: quality.shadowRes * 2 };

  return (
    <Canvas
      dpr={dpr}
      shadows={shadowInfo.enabled ? { type: THREE.PCFShadowMap } : false}
      // `flat` = no tone mapping. ACES (the default) compresses and greys out
      // light pastels — the exact colours this brand lives on. With flat
      // output a #FFE3EA material really reads as #FFE3EA.
      flat
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
      <ShadowContext.Provider value={shadowInfo}>
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
          {shadowInfo.enabled && <AutoShadowCasters />}
          {statsLabel && statsEnabled() && <StatsProbe label={statsLabel} />}
        </PerformanceMonitor>
      </ShadowContext.Provider>
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

/** A soft linen weave for the table: fine warp/weft lines with a faint
 *  slub, tiled small. It is what the props sit ON — without it the
 *  ground reads as a printed disc rather than a cloth. */
let linenTex: THREE.CanvasTexture | null = null;
function linenTexture(): THREE.CanvasTexture {
  if (linenTex) return linenTex;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, S, S);
  const n = 32; // threads per tile
  const w = S / n;
  for (let i = 0; i < n; i++) {
    const slub = 0.06 + ((i * 7919) % 13) / 13 * 0.05; // deterministic thread-to-thread variation
    ctx.fillStyle = `rgba(120,80,95,${slub})`;
    ctx.fillRect(i * w, 0, w * 0.45, S); // warp
    ctx.fillStyle = `rgba(120,80,95,${slub * 0.8})`;
    ctx.fillRect(0, i * w, S, w * 0.45); // weft
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  linenTex = tex;
  return tex;
}

export function SoftGround({
  radius = 3.0,
  color = "#FFE9F0",
  opacity = 1,
}: {
  radius?: number;
  color?: string;
  opacity?: number;
}) {
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
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
      <meshBasicMaterial
        ref={mat}
        color={color}
        map={linenTexture()}
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
