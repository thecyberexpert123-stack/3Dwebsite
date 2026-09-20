"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makePetalGeometry } from "./geometry";
import { PALETTE } from "./CrochetFlower";

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
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      d.y += dt * 0.045 * d.sp;
      if (d.y > area[1]) d.y -= area[1];
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

export function FallingPetals({
  count = 7,
  area = [3.8, 2.9, 2.2],
  reduced = false,
}: FallingPetalsProps) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
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
        s: 0.55 + Math.random() * 0.5,
        color: PETAL_COLORS[i % PETAL_COLORS.length],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame(({ clock }, dt) => {
    if (reduced) return;
    const t = clock.elapsedTime;
    data.forEach((d, i) => {
      const m = refs.current[i];
      if (!m) return;
      d.y -= dt * d.fall;
      if (d.y < 0.02) d.y = area[1];
      m.position.set(d.x + Math.sin(t * 0.4 * d.sway + d.ph) * 0.22, d.y, d.z);
      m.rotation.x += dt * d.spinX;
      m.rotation.z += dt * d.spinZ;
    });
  });

  return (
    <group>
      {data.map((d, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          geometry={geo}
          scale={d.s}
          position={[d.x, d.y, d.z]}
        >
          <meshStandardMaterial color={d.color} roughness={0.9} />
        </mesh>
      ))}
    </group>
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
