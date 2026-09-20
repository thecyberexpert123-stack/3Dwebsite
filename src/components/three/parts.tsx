"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { makeHeartGeometry, makePetalGeometry, makeThreadGeometry, rnd } from "./geometry";
import { PALETTE } from "./CrochetFlower";
import { shared as finish } from "./materials";

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

/** A yarn ball: matte core + randomly-oriented wrap rings that read as wound
 *  yarn. All rings are merged into ONE geometry (they share a material), so a
 *  ball costs 2 draw calls instead of `rings + 1`. */
export function YarnBall({
  position,
  radius = 0.28,
  color = PALETTE.blush,
  rings = 14,
  seed = 2,
  spin = 0,
}: YarnBallProps) {
  const ball = useRef<THREE.Group>(null!);
  const ringGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < rings; i++) {
      const g = new THREE.TorusGeometry(radius * (0.99 + rnd(seed + i) * 0.06), radius * 0.055, 6, 40);
      g.rotateX(rnd(seed + i * 5.3) * Math.PI);
      g.rotateY(rnd(seed + i * 8.1 + 2) * Math.PI);
      g.rotateZ(rnd(seed + i * 3.2 + 5) * Math.PI);
      parts.push(g);
    }
    const merged = mergeGeometries(parts, false)!;
    parts.forEach((g) => g.dispose());
    return merged;
  }, [rings, radius, seed]);
  useEffect(() => () => ringGeo.dispose(), [ringGeo]);

  useFrame((_, dt) => {
    if (spin !== 0 && ball.current) ball.current.rotation.y += dt * spin;
  });

  return (
    <group ref={ball} position={position}>
      <mesh material={finish("yarn", color)}>
        <sphereGeometry args={[radius * 0.965, 18, 18]} />
      </mesh>
      <mesh geometry={ringGeo} material={finish("yarn", color)} />
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
        <primitive object={finish("wood", PALETTE.wood)} attach="material" />
      </mesh>
      {/* thumb rest */}
      <mesh position={[0, length / 2 - 0.07, 0]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[0.019, 10, 10]} />
        <primitive object={finish("wood", PALETTE.wood)} attach="material" />
      </mesh>
      {/* the hook itself: a small open arc at the working end */}
      <group position={[0, -length / 2 + 0.03, 0]} rotation={[Math.PI / 2, 0, 1.1]}>
        <mesh>
          <torusGeometry args={[0.042, 0.011, 8, 14, Math.PI * 1.35]} />
          <primitive object={finish("wood", PALETTE.wood)} attach="material" />
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
        <primitive object={finish("clay", "#FFF6EC")} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.54, 0.12, 0.46]} radius={0.05} smoothness={4} position={[0, 0.38, 0]}>
        <primitive object={finish("clay", PALETTE.blush)} attach="material" />
      </RoundedBox>
      {/* ribbons wrapping the box */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.06, 0.52, 0.435]} />
        <primitive object={finish("satin", PALETTE.rose)} attach="material" />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.515, 0.52, 0.06]} />
        <primitive object={finish("satin", PALETTE.rose)} attach="material" />
      </mesh>
      {/* bow */}
      <group position={[0, 0.46, 0]}>
        <mesh position={[-0.055, 0.01, 0]} rotation={[Math.PI / 2, 0, 0.5]}>
          <torusGeometry args={[0.05, 0.015, 8, 16, Math.PI * 1.4]} />
          <primitive object={finish("satin", PALETTE.rose)} attach="material" />
        </mesh>
        <mesh position={[0.055, 0.01, 0]} rotation={[Math.PI / 2, 0, Math.PI - 0.5]}>
          <torusGeometry args={[0.05, 0.015, 8, 16, Math.PI * 1.4]} />
          <primitive object={finish("satin", PALETTE.rose)} attach="material" />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.024, 8, 8]} />
          <primitive object={finish("pearl", PALETTE.white)} attach="material" />
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
        <primitive object={finish("yarn", color)} attach="material" />
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
      <primitive object={finish("yarn", color)} attach="material" />
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
            <primitive object={finish("yarn", petalColor)} attach="material" />
          </mesh>
        </group>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <primitive object={finish("yarn", PALETTE.butter)} attach="material" />
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
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

/* ---------------- satin bow ---------------- */

type BowProps = {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  color?: string;
  knotColor?: string;
};

/** A plump satin bow — two fat loops, a knot and two tails. The coquette
 *  signature, reused on the wrap, the gift and as a loose charm. */
export function SatinBow({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color = PALETTE.strawberry,
  knotColor = PALETTE.white,
}: BowProps) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[-0.11, 0.02, 0]} rotation={[Math.PI / 2, 0, 0.5]} scale={[1, 0.62, 1]}>
        <torusGeometry args={[0.09, 0.034, 10, 22]} />
        <primitive object={finish("satin", color)} attach="material" />
      </mesh>
      <mesh position={[0.11, 0.02, 0]} rotation={[Math.PI / 2, 0, -0.5]} scale={[1, 0.62, 1]}>
        <torusGeometry args={[0.09, 0.034, 10, 22]} />
        <primitive object={finish("satin", color)} attach="material" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.045, 12, 12]} />
        <primitive object={finish("pearl", knotColor)} attach="material" />
      </mesh>
      <mesh position={[-0.06, -0.12, 0.02]} rotation={[0.1, 0, 0.5]}>
        <boxGeometry args={[0.05, 0.22, 0.012]} />
        <primitive object={finish("satin", color)} attach="material" />
      </mesh>
      <mesh position={[0.06, -0.12, 0.02]} rotation={[0.1, 0, -0.5]}>
        <boxGeometry args={[0.05, 0.22, 0.012]} />
        <primitive object={finish("satin", color)} attach="material" />
      </mesh>
    </group>
  );
}

/* ---------------- strawberry charm ---------------- */

/** A crochet strawberry — the classic little keychain charm.
 *  Seeds are merged into one geometry, leaves into another (4 draw calls total). */
export function StrawberryCharm({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  seed = 3,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  seed?: number;
}) {
  const { seedGeo, leafGeo } = useMemo(() => {
    const seeds: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 12; i++) {
      const a = rnd(seed + i * 2.1) * Math.PI * 2;
      const y = -0.45 + rnd(seed + i * 4.3) * 0.7;
      const r = Math.sqrt(Math.max(0, 1 - (y / 0.62) ** 2)) * 0.42;
      const g = new THREE.SphereGeometry(0.028, 6, 6);
      g.translate(Math.cos(a) * r, y * 0.9 + 0.5, Math.sin(a) * r);
      seeds.push(g);
    }
    const leaves: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.ConeGeometry(0.11, 0.3, 5);
      g.rotateX(0.55);
      g.rotateY((i / 5) * Math.PI * 2);
      g.translate(0, 1.0, 0);
      leaves.push(g);
    }
    const seedGeo = mergeGeometries(seeds, false)!;
    const leafGeo = mergeGeometries(leaves, false)!;
    [...seeds, ...leaves].forEach((g) => g.dispose());
    return { seedGeo, leafGeo };
  }, [seed]);
  useEffect(
    () => () => {
      seedGeo.dispose();
      leafGeo.dispose();
    },
    [seedGeo, leafGeo]
  );
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* body: a squashed teardrop */}
      <mesh scale={[0.42, 0.55, 0.42]} position={[0, 0.5, 0]}>
        <sphereGeometry args={[1, 18, 16]} />
        <primitive object={finish("yarn", PALETTE.strawberry)} attach="material" />
      </mesh>
      <mesh geometry={seedGeo}>
        <primitive object={finish("yarn", PALETTE.butter)} attach="material" />
      </mesh>
      <mesh geometry={leafGeo}>
        <primitive object={finish("yarn", PALETTE.sageDeep)} attach="material" />
      </mesh>
      {/* keyring */}
      <mesh position={[0, 1.2, 0]}>
        <torusGeometry args={[0.08, 0.016, 8, 18]} />
        <meshStandardMaterial color="#E8D9B0" roughness={0.35} metalness={0.5} />
      </mesh>
    </group>
  );
}

/* ---------------- puffy cloud ---------------- */

/** Three-lobed pastel cloud — the girly-aesthetic sky prop. Floats slowly. */
export function PuffyCloud({
  position,
  scale = 1,
  color = PALETTE.white,
  reduced = false,
  phase = 0,
}: {
  position: [number, number, number];
  scale?: number;
  color?: string;
  reduced?: boolean;
  phase?: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current || reduced) return;
    const t = clock.elapsedTime;
    ref.current.position.y = position[1] + Math.sin(t * 0.5 + phase) * 0.05;
    ref.current.position.x = position[0] + Math.sin(t * 0.23 + phase) * 0.06;
  });
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.22, 16, 14]} />
        <primitive object={finish("clay", color)} attach="material" />
      </mesh>
      <mesh position={[-0.22, -0.05, 0.02]}>
        <sphereGeometry args={[0.16, 14, 12]} />
        <primitive object={finish("clay", color)} attach="material" />
      </mesh>
      <mesh position={[0.22, -0.04, 0]}>
        <sphereGeometry args={[0.17, 14, 12]} />
        <primitive object={finish("clay", color)} attach="material" />
      </mesh>
      <mesh position={[0.02, -0.1, 0.06]} scale={[1.6, 0.6, 1]}>
        <sphereGeometry args={[0.2, 14, 12]} />
        <primitive object={finish("clay", color)} attach="material" />
      </mesh>
    </group>
  );
}
