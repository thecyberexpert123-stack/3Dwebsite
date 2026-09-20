"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { makeHeartGeometry, makePetalGeometry, makeThreadGeometry, rnd } from "./geometry";
import { PALETTE } from "./CrochetFlower";

/* ---------------- yarn ball ---------------- */

type YarnBallProps = {
  position: [number, number, number];
  radius?: number;
  color?: string;
  rings?: number;
  seed?: number;
  /** radians/sec — slow spin makes the wound rings feel alive (0 = still). */
  spin?: number;
};

/** A yarn ball: matte core + randomly-oriented wrap rings that read as wound yarn. */
export function YarnBall({
  position,
  radius = 0.28,
  color = PALETTE.blush,
  rings = 14,
  seed = 2,
  spin = 0,
}: YarnBallProps) {
  const ball = useRef<THREE.Group>(null!);
  const ringData = useMemo(
    () =>
      Array.from({ length: rings }, (_, i) => ({
        key: i,
        rotation: [
          rnd(seed + i * 5.3) * Math.PI,
          rnd(seed + i * 8.1 + 2) * Math.PI,
          rnd(seed + i * 3.2 + 5) * Math.PI,
        ] as [number, number, number],
        radius: radius * (0.99 + rnd(seed + i) * 0.06),
      })),
    [rings, radius, seed]
  );

  useFrame((_, dt) => {
    if (spin !== 0 && ball.current) ball.current.rotation.y += dt * spin;
  });

  return (
    <group ref={ball} position={position}>
      <mesh>
        <sphereGeometry args={[radius * 0.965, 18, 18]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      {ringData.map((r) => (
        <mesh key={r.key} rotation={r.rotation}>
          <torusGeometry args={[r.radius, radius * 0.055, 6, 40]} />
          <meshStandardMaterial color={color} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------- crochet hook ---------------- */

type HookProps = {
  position: [number, number, number];
  rotation?: [number, number, number];
  length?: number;
};

/** A wooden crochet hook lying at rest. */
export function Hook({ position, rotation = [0, 0.35, Math.PI / 2 - 0.12], length = 1.15 }: HookProps) {
  return (
    <group position={position} rotation={rotation}>
      {/* tapered shaft */}
      <mesh>
        <cylinderGeometry args={[0.009, 0.016, length, 10]} />
        <meshStandardMaterial color={PALETTE.wood} roughness={0.7} />
      </mesh>
      {/* thumb rest */}
      <mesh position={[0, length / 2 - 0.07, 0]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[0.019, 10, 10]} />
        <meshStandardMaterial color={PALETTE.wood} roughness={0.7} />
      </mesh>
      {/* the hook itself: a small open arc at the working end */}
      <group position={[0, -length / 2 + 0.03, 0]} rotation={[Math.PI / 2, 0, 1.1]}>
        <mesh>
          <torusGeometry args={[0.042, 0.011, 8, 14, Math.PI * 1.35]} />
          <meshStandardMaterial color={PALETTE.wood} roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------------- gift box ---------------- */

/** A little gift box with ribbon and a soft bow. */
export function GiftBox({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.5, 0.34, 0.42]} radius={0.05} smoothness={4} position={[0, 0.17, 0]}>
        <meshStandardMaterial color="#FFF6EC" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[0.54, 0.12, 0.46]} radius={0.05} smoothness={4} position={[0, 0.38, 0]}>
        <meshStandardMaterial color={PALETTE.blush} roughness={0.9} />
      </RoundedBox>
      {/* ribbons wrapping the box */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.06, 0.52, 0.435]} />
        <meshStandardMaterial color={PALETTE.rose} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.515, 0.52, 0.06]} />
        <meshStandardMaterial color={PALETTE.rose} roughness={0.8} />
      </mesh>
      {/* bow */}
      <group position={[0, 0.46, 0]}>
        <mesh position={[-0.055, 0.01, 0]} rotation={[Math.PI / 2, 0, 0.5]}>
          <torusGeometry args={[0.05, 0.015, 8, 16, Math.PI * 1.4]} />
          <meshStandardMaterial color={PALETTE.rose} roughness={0.8} />
        </mesh>
        <mesh position={[0.055, 0.01, 0]} rotation={[Math.PI / 2, 0, Math.PI - 0.5]}>
          <torusGeometry args={[0.05, 0.015, 8, 16, Math.PI * 1.4]} />
          <meshStandardMaterial color={PALETTE.rose} roughness={0.8} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.024, 8, 8]} />
          <meshStandardMaterial color={PALETTE.dusty} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------------- floating heart ---------------- */

type FloatingHeartProps = {
  position: [number, number, number];
  scale?: number;
  color?: string;
};

/** A tiny crocheted-style heart, gently floating. */
export function FloatingHeart({ position, scale = 0.3, color = PALETTE.dusty }: FloatingHeartProps) {
  const geo = useMemo(() => makeHeartGeometry(), []);
  return (
    <Float speed={1.5} rotationIntensity={0.22} floatIntensity={0.45} floatingRange={[0.02, 0.08]}>
      <mesh geometry={geo} position={position} scale={scale} rotation={[0.1, -0.35, 0.06]}>
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </Float>
  );
}

/* ---------------- loose yarn thread ---------------- */

type ThreadTubeProps = {
  points: [number, number, number][];
  radius?: number;
  color?: string;
};

/** A loose strand of yarn draped across the scene. */
export function ThreadTube({ points, radius = 0.016, color = PALETTE.rose }: ThreadTubeProps) {
  const geo = useMemo(() => makeThreadGeometry(points, radius), [points, radius]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

/* ---------------- tiny flat daisy ---------------- */

type TinyDaisyProps = {
  position: [number, number, number];
  seed?: number;
  petalColor?: string;
};

/** A tiny flower resting on the ground — a sweet little detail. */
export function TinyDaisy({ position, seed = 11, petalColor = PALETTE.white }: TinyDaisyProps) {
  const petal = useMemo(() => makePetalGeometry(0.26, 0.8, 0.1, seed), [seed]);
  return (
    <group position={position} rotation={[-Math.PI / 2.15, 0, rnd(seed) * Math.PI * 2]}>
      {Array.from({ length: 6 }).map((_, i) => (
        <group key={i} rotation={[0, (i / 6) * Math.PI * 2, 0]}>
          <mesh
            geometry={petal}
            rotation={[1.3, 0, 0]}
            position={[0, 0, 0.035]}
            scale={[1, 0.16, 1]}
          >
            <meshStandardMaterial color={petalColor} roughness={0.9} />
          </mesh>
        </group>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color={PALETTE.butter} roughness={0.85} />
      </mesh>
    </group>
  );
}

/* ---------------- sparkle ---------------- */

type Sparkle3DProps = {
  position: [number, number, number];
  color?: string;
  phase?: number;
  size?: number;
  reduced?: boolean;
};

/** A tiny twinkling star — gentle scale pulse + slow spin. */
export function Sparkle3D({
  position,
  color = "#F6E0C2",
  phase = 0,
  size = 0.05,
  reduced = false,
}: Sparkle3DProps) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (reduced) return;
    const t = clock.elapsedTime;
    ref.current.scale.setScalar(0.55 + 0.45 * Math.sin(t * 1.8 + phase));
    ref.current.rotation.y = t * 0.6 + phase;
  });
  return (
    <mesh ref={ref} position={position}>
      <octahedronGeometry args={[size, 0]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
    </mesh>
  );
}
