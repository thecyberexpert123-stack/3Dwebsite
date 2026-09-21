"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeHeartGeometry, makePetalGeometry } from "./geometry";
import { PALETTE } from "./CrochetFlower";
import { useIntroClock, useWind } from "./Stage";
import { easeOutBack, easeOutCubic, seg } from "@/lib/intro";
import { shared as finish } from "./materials";

/* ================================================================
   Sway — layered, multi-axis breeze motion for anything alive.
   ================================================================ */

type SwayProps = {
  children: React.ReactNode;
  /** radians — swing amplitude around z */
  amp?: number;
  /** cycles/sec-ish (angular speed multiplier) */
  speed?: number;
  /** offset so siblings never move in lockstep */
  phase?: number;
  /** vertical bob amplitude */
  bob?: number;
  reduced?: boolean;
};

export function Sway({
  children,
  amp = 0.05,
  speed = 0.55,
  phase = 0,
  bob = 0.02,
  reduced = false,
}: SwayProps) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    if (reduced) {
      g.rotation.set(0, 0, 0);
      g.position.y = 0;
      return;
    }
    const t = clock.elapsedTime;
    g.rotation.z = Math.sin(t * speed + phase) * amp;
    g.rotation.x = Math.sin(t * speed * 0.63 + phase * 1.7) * amp * 0.55;
    g.position.y = Math.sin(t * speed * 0.5 + phase * 0.6) * bob;
  });
  return <group ref={ref}>{children}</group>;
}

/* ================================================================
   DustMotes — warm specks drifting through the light, like yarn
   fibres in an afternoon sunbeam. One draw call, wraps forever.
   ================================================================ */

let softDotTex: THREE.Texture | null = null;
function softDot(): THREE.Texture {
  if (softDotTex) return softDotTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  softDotTex = new THREE.CanvasTexture(c);
  return softDotTex;
}

type DustMotesProps = {
  count?: number;
  /** volume the motes live in: [width, height, depth] around the group origin */
  area?: [number, number, number];
  color?: string;
  size?: number;
  reduced?: boolean;
};

export function DustMotes({
  count = 34,
  area = [4, 2.2, 3],
  color = "#D9A86C",
  size = 0.045,
  reduced = false,
}: DustMotesProps) {
  const ref = useRef<THREE.Points>(null!);
  const wind = useWind();

  const data = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * area[0],
        y: Math.random() * area[1],
        z: (Math.random() - 0.5) * area[2],
        ph: Math.random() * Math.PI * 2,
        sp: 0.5 + Math.random() * 0.9,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    data.forEach((d, i) => {
      arr[i * 3] = d.x;
      arr[i * 3 + 1] = d.y;
      arr[i * 3 + 2] = d.z;
    });
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, [count, data]);

  useEffect(() => () => geom.dispose(), [geom]);

  useFrame(({ clock }, dt) => {
    if (reduced || !ref.current) return;
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const t = clock.elapsedTime;
    const w = wind.current ?? 0;
    const half = area[0] / 2;
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      d.y += dt * 0.045 * d.sp;
      if (d.y > area[1]) d.y -= area[1];
      // motes are carried sideways by the breeze and wrap around
      d.x += dt * w * 0.9 * d.sp;
      if (d.x > half) d.x -= area[0];
      else if (d.x < -half) d.x += area[0];
      pos.setXYZ(
        i,
        d.x + Math.sin(t * 0.3 * d.sp + d.ph) * 0.16,
        d.y,
        d.z + Math.cos(t * 0.22 * d.sp + d.ph) * 0.12
      );
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geom} frustumCulled={false}>
      <pointsMaterial
        size={size}
        sizeAttenuation
        color={color}
        transparent
        opacity={0.4}
        depthWrite={false}
        map={softDot()}
      />
    </points>
  );
}

/* ================================================================
   FallingPetals — little crochet petals tumbling down like snow.
   ================================================================ */

type FallingPetalsProps = {
  count?: number;
  area?: [number, number, number];
  reduced?: boolean;
};

const PETAL_COLORS = [PALETTE.blush, PALETTE.cream, PALETTE.rose, PALETTE.lavender, PALETTE.white];

/** Tumbling crochet petals — ONE instanced draw call for the whole flurry. */
export function FallingPetals({
  count = 7,
  area = [3.8, 2.9, 2.2],
  reduced = false,
}: FallingPetalsProps) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const wind = useWind();
  const geo = useMemo(() => makePetalGeometry(0.16, 0.34, 0.06, 99), []);
  useEffect(() => () => geo.dispose(), [geo]);

  const data = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (Math.random() - 0.5) * area[0],
        z: (Math.random() - 0.5) * area[2],
        y: Math.random() * area[1],
        fall: 0.1 + Math.random() * 0.09,
        spinX: (Math.random() - 0.5) * 1.4,
        spinZ: (Math.random() - 0.5) * 1.2,
        sway: 0.5 + Math.random(),
        ph: Math.random() * Math.PI * 2,
        s: 0.32 + Math.random() * 0.3,
        rx: Math.random() * Math.PI * 2,
        rz: Math.random() * Math.PI * 2,
        color: new THREE.Color(PETAL_COLORS[i % PETAL_COLORS.length]),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const write = (t: number) => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      dummy.position.set(d.x + Math.sin(t * 0.4 * d.sway + d.ph) * 0.22, d.y, d.z);
      dummy.rotation.set(d.rx, 0, d.rz);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  };

  // per-instance colours once; initial pose (reduced motion keeps it)
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    data.forEach((d, i) => m.setColorAt(i, d.color));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    write(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useFrame(({ clock }, dt) => {
    if (reduced) return;
    const t = clock.elapsedTime;
    const w = wind.current ?? 0;
    const half = area[0] / 2;
    for (const d of data) {
      d.y -= dt * d.fall;
      if (d.y < 0.02) d.y = area[1];
      d.x += dt * w * 1.1 * d.sway;
      if (d.x > half) d.x -= area[0];
      else if (d.x < -half) d.x += area[0];
      d.rx += dt * (d.spinX + w * 2);
      d.rz += dt * d.spinZ;
    }
    write(t);
  });

  return (
    <instancedMesh ref={mesh} args={[geo, undefined, count]} frustumCulled={false} userData={{ noShadow: true }}>
      <primitive object={finish("yarn", "#FFFFFF")} attach="material" />
    </instancedMesh>
  );
}

/* ================================================================
   BreathingLight — a warm point light with a candle-like pulse.
   ================================================================ */

type BreathingLightProps = {
  position: [number, number, number];
  color?: string;
  intensity?: number;
  reduced?: boolean;
};

export function BreathingLight({
  position,
  color = "#FFD9A8",
  intensity = 0.5,
  reduced = false,
}: BreathingLightProps) {
  const ref = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }) => {
    const l = ref.current;
    if (!l) return;
    if (reduced) {
      l.intensity = intensity;
      return;
    }
    const t = clock.elapsedTime;
    l.intensity = intensity * (1 + Math.sin(t * 1.3) * 0.08 + Math.sin(t * 3.7 + 1) * 0.03);
  });
  return (
    <pointLight
      ref={ref}
      position={position}
      color={color}
      intensity={intensity}
      distance={6.5}
      decay={2}
    />
  );
}

/* ================================================================
   Entrance — how an object arrives during the intro choreography.
   Reads the scene-wide intro clock, so every prop lands on the beat.

   kinds:
   - "drop":  falls a little onto the surface and settles (props)
   - "grow":  scales up from the base with a soft overshoot (flowers)
   - "pop":   quick scale-in with overshoot (small charms)
   - "fade":  no transform, just present (reserved for lights via opacity)
   ================================================================ */

type EntranceProps = {
  children: React.ReactNode;
  /** seconds into the intro when this object starts arriving */
  at: number;
  duration?: number;
  kind?: "drop" | "grow" | "pop";
  /** drop height in world units (kind="drop") */
  height?: number;
};

export function Entrance({ children, at, duration = 0.8, kind = "pop", height = 0.45 }: EntranceProps) {
  const ref = useRef<THREE.Group>(null!);
  const { t, reduced } = useIntroClock();
  const done = useRef(false);

  useFrame(() => {
    const g = ref.current;
    if (!g || done.current) return;
    if (reduced) {
      g.scale.setScalar(1);
      g.position.y = 0;
      g.visible = true;
      done.current = true;
      return;
    }
    const p = seg(t.current, at, duration);
    if (p <= 0) {
      g.visible = false;
      return;
    }
    g.visible = true;
    if (kind === "drop") {
      // ease-out fall + a single soft bounce at the end
      const fall = 1 - easeOutCubic(Math.min(1, p / 0.7));
      const bounce = p > 0.7 ? Math.sin(((p - 0.7) / 0.3) * Math.PI) * 0.06 : 0;
      g.position.y = height * fall + bounce * height;
      g.scale.setScalar(1);
    } else if (kind === "grow") {
      const s = easeOutBack(p, 1.2);
      g.scale.set(0.001 + s * 0.999, 0.001 + s * 0.999, 0.001 + s * 0.999);
    } else {
      const s = easeOutBack(p, 1.7);
      g.scale.setScalar(Math.max(0.001, s));
    }
    if (p >= 1) {
      g.scale.setScalar(1);
      g.position.y = 0;
      done.current = true;
    }
  });

  return (
    <group ref={ref} visible={false}>
      {children}
    </group>
  );
}

/* ================================================================
   HeartBurst — a one-shot celebration: hearts rise from a point,
   drift apart, spin and fade. Triggered by `burstId` changing.
   Instanced (one draw call); pooled so repeated taps are free.
   ================================================================ */

type HeartBurstProps = {
  origin: [number, number, number];
  burstId: number;
  count?: number;
  colors?: string[];
  reduced?: boolean;
};

const BURST_COLORS = [PALETTE.rose, PALETTE.blush, PALETTE.lavender, PALETTE.dusty, PALETTE.white];

export function HeartBurst({
  origin,
  burstId,
  count = 14,
  colors = BURST_COLORS,
  reduced = false,
}: HeartBurstProps) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const geo = useMemo(() => makeHeartGeometry(21), []);
  useEffect(() => () => geo.dispose(), [geo]);

  const life = useRef(-1); // <0 idle
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        dir: new THREE.Vector3((Math.random() - 0.5) * 1.6, 1.1 + Math.random() * 0.9, (Math.random() - 0.5) * 1.2),
        spin: (Math.random() - 0.5) * 6,
        size: 0.09 + Math.random() * 0.1,
        delay: Math.random() * 0.18,
        color: new THREE.Color(colors[i % colors.length]),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count]
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastBurst = useRef(burstId);

  useEffect(() => {
    if (burstId !== lastBurst.current) {
      lastBurst.current = burstId;
      life.current = 0;
    }
  }, [burstId]);

  // per-instance colours set once
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    parts.forEach((p, i) => m.setColorAt(i, p.color));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [parts]);

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    if (life.current < 0) {
      m.visible = false;
      return;
    }
    m.visible = true;
    life.current += dt;
    const DUR = reduced ? 0.6 : 1.6;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const t = Math.max(0, life.current - p.delay) / DUR;
      const e = 1 - Math.pow(1 - Math.min(1, t), 2.2);
      const g = -0.35 * t * t; // a little gravity so they arc
      dummy.position.set(
        origin[0] + p.dir.x * e,
        origin[1] + p.dir.y * e + g,
        origin[2] + p.dir.z * e
      );
      dummy.rotation.set(0.2, p.spin * t, Math.sin(t * 5 + i) * 0.4);
      const s = t <= 0 ? 0 : p.size * (t < 0.15 ? t / 0.15 : t > 0.65 ? Math.max(0, 1 - (t - 0.65) / 0.35) : 1);
      dummy.scale.setScalar(Math.max(0.0001, reduced ? p.size * (1 - t) : s));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    if (life.current > DUR + 0.25) life.current = -1;
  });

  return (
    <instancedMesh ref={mesh} args={[geo, undefined, count]} visible={false} frustumCulled={false} userData={{ noShadow: true }}>
      <meshStandardMaterial ref={mat} roughness={0.62} />
    </instancedMesh>
  );
}
