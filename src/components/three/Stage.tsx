"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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
   Studio Lights 2.0 — CINEMATIC LIGHTING UPGRADE
   Research: Best 3D sites use one key light with character, not 3 flat fills
   - Oryzo: single object with weight = one strong key + soft fill + rim
   - Real crochet studio: window light from top-right, warm bounce from table
   - Outdoor: low sun = long shadows toward camera (rim-lit, dramatic)
   - New: area light simulation via Lightformers, better shadow softness
   ================================================================ */

export function StudioLights({
  target = [0, 0.8, 0],
  keyIntensity = 1.0,
  shadowSize = 3,
  outdoor = false,
  timeOfDay = 0.5, // 0 morning, 0.5 noon, 1 evening
}: {
  target?: [number, number, number];
  keyIntensity?: number;
  shadowSize?: number;
  outdoor?: boolean;
  timeOfDay?: number;
}) {
  const shadows = useShadowsEnabled();
  const { res } = useContext(ShadowContext);
  
  if (outdoor) {
    // Time-of-day affects sun color and intensity
    const sunColor = new THREE.Color().lerpColors(
      new THREE.Color("#FFE4B5"), // Morning warm
      new THREE.Color("#FFF1D6"), // Noon neutral
      timeOfDay < 0.5 ? timeOfDay * 2 : (1 - timeOfDay) * 2
    );
    if (timeOfDay > 0.7) {
      sunColor.lerp(new THREE.Color("#FFB088"), (timeOfDay - 0.7) / 0.3); // Evening orange
    }
    
    return (
      <>
        <ambientLight intensity={0.24} color="#EAF4FF" />
        <hemisphereLight args={["#BFDCF7", "#8FBF62", 0.8]} />
        <directionalLight
          position={[3.5, 3.75, -7]}
          intensity={keyIntensity * 1.45}
          color={sunColor}
          castShadow={shadows}
          shadow-mapSize={[res, res]}
          shadow-camera-near={1}
          shadow-camera-far={22}
          shadow-camera-left={-shadowSize * 1.1}
          shadow-camera-right={shadowSize * 1.1}
          shadow-camera-top={shadowSize * 1.1}
          shadow-camera-bottom={-shadowSize * 1.1}
          shadow-radius={6}
          shadow-bias={-0.00035}
          shadow-normalBias={0.07}
        />
        {/* Soft front fill — never mud, always dimensional */}
        <directionalLight position={[-2.2, 3.2, 5.5]} intensity={0.6} color="#FFF7FA" />
        {/* Extra rim for depth separation */}
        <directionalLight position={[2, 1.5, -5]} intensity={0.25} color="#FFC2D4" />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={1.8} color="#DDEEFF" position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[24, 24, 1]} />
          <Lightformer form="rect" intensity={0.7} color="#9CCF6A" position={[0, -3.5, 0]} rotation-x={-Math.PI / 2} scale={[24, 24, 1]} />
          <Lightformer form="circle" intensity={1.8} color={sunColor} position={[7, 7.5, -14]} scale={[6, 6, 1]} target={target} />
          <Lightformer form="rect" intensity={0.4} color="#E8D9FF" position={[-6, 2, -2]} scale={[8, 4, 1]} target={target} />
        </Environment>
      </>
    );
  }
  
  // Indoor studio — window light with character
  return (
    <>
      <ambientLight intensity={shadows ? 0.44 : 0.52} color="#FFF4F7" />
      <hemisphereLight args={["#FFFBFD", "#F7C9D8", shadows ? 0.52 : 0.58]} />
      {/* Key: warm window, top-right, soft shadows */}
      <directionalLight
        position={[3.2, 5.2, 2.8]}
        intensity={shadows ? keyIntensity * 1.22 : keyIntensity}
        color="#FFFDFB"
        castShadow={shadows}
        shadow-mapSize={[res, res]}
        shadow-camera-near={0.5}
        shadow-camera-far={18}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
        shadow-radius={5}
        shadow-bias={-0.00045}
        shadow-normalBias={0.055}
      />
      {/* Fill: cool lavender from left/back — shadows go lavender, not grey */}
      <directionalLight position={[-4.2, 2.8, -2.2]} intensity={0.46} color="#E4D6FF" />
      {/* Rim: pink kicker from behind */}
      <directionalLight position={[0.2, 2.4, -4.5]} intensity={0.38} color="#FFC2D4" />
      {/* Extra soft fill from below (table bounce) */}
      <directionalLight position={[0, -1, 2]} intensity={0.15} color="#FFD6E2" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={1.3} color="#FFF5F0" position={[0, 3.5, 4.5]} scale={[8, 3.5, 1]} target={target} />
        <Lightformer form="rect" intensity={0.6} color="#FFD6E2" position={[-5.5, 1.8, -3.5]} scale={[7, 3, 1]} target={target} />
        <Lightformer form="rect" intensity={0.45} color="#E6DAFF" position={[5.5, 2.2, 2.2]} scale={[6, 2.5, 1]} target={target} />
        <Lightformer form="circle" intensity={0.35} color="#D8F3EA" position={[0, -2.5, 3.5]} scale={[5, 5, 1]} target={target} />
      </Environment>
    </>
  );
}

type ShadowInfo = { enabled: boolean; res: number };
const ShadowContext = createContext<ShadowInfo>({ enabled: false, res: 512 });

export function useShadowsEnabled(): boolean {
  return useContext(ShadowContext).enabled;
}

function AutoShadowCasters() {
  const { scene } = useThree();
  const frame = useRef(0);
  useFrame(() => {
    if (frame.current++ % 12 !== 0) return;
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
        <shadowMaterial color="#B4607E" opacity={opacity * 1.2} transparent depthWrite={false} />
      </mesh>
    );
  }
  return (
    <ContactShadows
      position={position}
      opacity={opacity}
      scale={scale}
      blur={2.8}
      far={far}
      resolution={resolution}
      color="#B4607E"
      frames={Infinity}
    />
  );
}

type AdaptiveCanvasProps = Omit<CanvasProps, "dpr"> & {
  quality: Quality;
  statsLabel?: string;
  fallback?: React.ReactNode;
};

type StatsBag = Record<string, { calls: number; triangles: number; programs: number; geometries: number; textures: number; dpr: number; fps: number }>;

function StatsProbe({ label }: { label: string }) {
  const { gl, viewport } = useThree();
  const acc = useRef({ frames: 0, last: 0 });
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

  useEffect(() => setDpr(quality.dpr[1]), [quality]);

  if (lost) return <>{fallback}</>;

  const shadowInfo: ShadowInfo = { enabled: !quality.simple, res: quality.shadowRes * 2 };

  return (
    <Canvas
      dpr={dpr}
      shadows={shadowInfo.enabled ? { type: THREE.PCFSoftShadowMap } : false}
      flat
      gl={{ 
        antialias: true, 
        alpha: true, 
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
        ...gl 
      }}
      onCreated={(state) => {
        state.gl.toneMappingExposure = 1.0;
        const canvas = state.gl.domElement;
        let timer: ReturnType<typeof setTimeout> | null = null;
        canvas.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          timer = setTimeout(() => setLost(true), 3000);
        });
        canvas.addEventListener("webglcontextrestored", () => {
          if (timer) clearTimeout(timer);
          setDpr(1);
        });
        onCreated?.(state);
      }}
      {...rest}
    >
      <ShadowContext.Provider value={shadowInfo}>
        <PerformanceMonitor
          ms={300}
          iterations={8}
          threshold={0.65}
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
    if (started) t.current += Math.min(dt, 0.05);
  });

  return <IntroContext.Provider value={value.current}>{children}</IntroContext.Provider>;
}

export function useIntroClock(): IntroClock {
  return useContext(IntroContext);
}

let groundAlpha: THREE.Texture | null = null;
function groundAlphaMap(): THREE.Texture {
  if (groundAlpha) return groundAlpha;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.38, "#fff");
  g.addColorStop(0.72, "rgba(255,255,255,0.4)");
  g.addColorStop(1, "#000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  groundAlpha = new THREE.CanvasTexture(c);
  return groundAlpha;
}

let linenTex: THREE.CanvasTexture | null = null;
function linenTexture(): THREE.CanvasTexture {
  if (linenTex) return linenTex;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, S, S);
  const n = 32;
  const w = S / n;
  for (let i = 0; i < n; i++) {
    const slub = 0.06 + ((i * 7919) % 13) / 13 * 0.05;
    ctx.fillStyle = `rgba(120,80,95,${slub})`;
    ctx.fillRect(i * w, 0, w * 0.45, S);
    ctx.fillStyle = `rgba(120,80,95,${slub * 0.8})`;
    ctx.fillRect(0, i * w, S, w * 0.45);
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
  blanket = false,
}: {
  radius?: number;
  color?: string;
  opacity?: number;
  blanket?: boolean;
}) {
  const mat = useRef<THREE.MeshBasicMaterial | THREE.MeshStandardMaterial>(null!);
  const { t, reduced } = useIntroClock();
  
  useFrame(() => {
    if (!mat.current) return;
    const k = reduced ? 1 : Math.min(1, t.current / 0.9);
    mat.current.opacity = opacity * k;
  });
  
  const hem = useMemo(() => {
    if (!blanket) return null;
    const shape = new THREE.Shape();
    const n = 96;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const r = radius / Math.pow(Math.pow(Math.abs(c), 3.2) + Math.pow(Math.abs(sn), 3.2), 1 / 3.2);
      const ripple = 1 + Math.sin(a * 22) * 0.012 + Math.sin(a * 8) * 0.008;
      const x = c * r * ripple;
      const y = sn * r * ripple;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    const g = new THREE.ShapeGeometry(shape, 4);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) / radius + 1) * 0.5, (pos.getY(i) / radius + 1) * 0.5);
    return g;
  }, [blanket, radius]);
  
  useEffect(() => () => hem?.dispose(), [hem]);

  if (blanket) {
    return (
      <mesh geometry={hem!} rotation={[-Math.PI / 2, 0, 0.18]} position={[0, 0.004, 0]} receiveShadow>
        <meshStandardMaterial
          ref={mat as React.RefObject<THREE.MeshStandardMaterial>}
          color="#FFFFFF"
          map={ginghamTexture()}
          roughness={0.92}
          metalness={0.02}
          transparent
          opacity={0}
        />
      </mesh>
    );
  }
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} renderOrder={-1}>
      <circleGeometry args={[radius, 56]} />
      <meshBasicMaterial
        ref={mat as React.RefObject<THREE.MeshBasicMaterial>}
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

let ginghamTex: THREE.CanvasTexture | null = null;
function ginghamTexture(): THREE.CanvasTexture {
  if (ginghamTex) return ginghamTex;
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff7f9";
  ctx.fillRect(0, 0, S, S);
  const n = 12;
  const w = S / n;
  ctx.fillStyle = "rgba(243,168,191,0.5)";
  for (let i = 0; i < n; i += 2) ctx.fillRect(i * w, 0, w, S);
  for (let j = 0; j < n; j += 2) ctx.fillRect(0, j * w, S, w);
  ctx.fillStyle = "rgba(120,80,95,0.045)";
  for (let i = 0; i < S; i += 4) ctx.fillRect(i, 0, 1, S);
  for (let j = 0; j < S; j += 4) ctx.fillRect(0, j, S, 1);
  // Add subtle highlight for fabric sheen
  const grad = ctx.createLinearGradient(0, 0, S, S);
  grad.addColorStop(0, "rgba(255,255,255,0.08)");
  grad.addColorStop(0.5, "rgba(255,255,255,0)");
  grad.addColorStop(1, "rgba(255,255,255,0.05)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  ginghamTex = tex;
  return tex;
}

const WindContext = createContext<React.RefObject<number>>({ current: 0 });

export function Breeze({ children, reduced, gust: gustScale = 1 }: { children: React.ReactNode; reduced: boolean; gust?: number }) {
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
    const speed = Math.hypot(dx, dy) / Math.max(dt, 1e-3);
    const gust = THREE.MathUtils.clamp(speed * 0.5, 0, 1.2) * Math.sign(dx || 1) * gustScale;
    const rising = Math.abs(gust) > Math.abs(wind.current);
    wind.current = THREE.MathUtils.damp(wind.current, gust, rising ? 11 : 1.5, dt);
  });

  return <WindContext.Provider value={wind}>{children}</WindContext.Provider>;
}

export function useWind(): React.RefObject<number> {
  return useContext(WindContext);
}

export function LowTierToneMapping({ enabled }: { enabled: boolean }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    gl.toneMapping = enabled ? THREE.NeutralToneMapping : THREE.NoToneMapping;
    gl.toneMappingExposure = 1;
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((x) => (x.needsUpdate = true));
      else if (m) m.needsUpdate = true;
    });
    return () => {
      gl.toneMapping = THREE.NoToneMapping;
    };
  }, [gl, scene, enabled]);
  return null;
}
