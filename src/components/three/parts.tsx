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
  // A real ball is wound in *bands*: several parallel strands laid side by
  // side at one orientation, then the ball is turned and another band goes
  // over the top. So each "ring" here is a band of 3 thin strands, spaced
  // one strand apart, all hugging the sphere surface; successive bands rotate
  // through the golden angle so they cross each other the way hand-wound
  // yarn does. Everything merges into ONE geometry (2 draw calls per ball).
  const ringGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const strand = radius * 0.028;
    const bands = Math.max(4, Math.round(rings * 0.6));
    for (let b = 0; b < bands; b++) {
      const rx = rnd(seed + b * 5.3) * Math.PI;
      const ry = b * 2.399963 + rnd(seed + b * 8.1 + 2) * 0.4; // golden angle
      const rz = rnd(seed + b * 3.2 + 5) * Math.PI;
      const offset = (rnd(seed + b * 1.7) - 0.5) * radius * 0.5; // band sits off the equator
      for (let k = -1; k <= 1; k++) {
        const lift = offset + k * strand * 2.4;
        // circle radius on the sphere at this height (the strand hugs the surface)
        const rr = Math.sqrt(Math.max(0.05 * radius * radius, radius * radius * 1.02 - lift * lift));
        const g = new THREE.TorusGeometry(rr, strand, 5, 48);
        g.translate(0, 0, lift);
        g.rotateX(rx);
        g.rotateY(ry);
        g.rotateZ(rz);
        parts.push(g);
      }
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
        <sphereGeometry args={[radius * 0.975, 24, 20]} />
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
      {/* bow — lying flat on the lid */}
      <SatinBow position={[0, 0.455, 0]} rotation={[-Math.PI / 2 + 0.25, 0, 0.3]} scale={0.7} color={PALETTE.rose} />
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
            scale={[1, 0.42, 0.55]}
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
    <mesh ref={ref} position={position} userData={{ noShadow: true }}>
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
/** One bow loop as a flat ribbon swept along a teardrop curve (in the XY
 *  plane, opening at the origin). Built once per side and cached: a strip
 *  of quads with real width and a paper-thin depth, so the loop has a
 *  visible inner face and a soft fold — unlike a torus, which reads as a
 *  rubber tyre. */
const loopCache = new Map<string, THREE.BufferGeometry>();
export function bowLoopGeometry(dir: 1 | -1, width = 0.055): THREE.BufferGeometry {
  const key = `${dir}|${width}`;
  const hit = loopCache.get(key);
  if (hit) return hit;
  const pts: THREE.Vector3[] = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    // teardrop: r shrinks to 0 at the knot (t = 0 and 2π)
    const r = 0.13 * Math.sin(t / 2);
    const x = dir * (0.02 + r * (1 + 0.35 * Math.cos(t))); // lean outward
    const y = r * Math.sin(t) * 0.75 + 0.02;
    const z = Math.sin(t) * 0.02; // gentle twist so it isn't a perfectly flat plane
    pts.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.4);
  // ribbon = extruded rectangle along the curve (width across, thin in depth)
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -0.004);
  shape.lineTo(width / 2, -0.004);
  shape.lineTo(width / 2, 0.004);
  shape.lineTo(-width / 2, 0.004);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { steps: 40, bevelEnabled: false, extrudePath: curve });
  geo.computeVertexNormals();
  loopCache.set(key, geo);
  return geo;
}

/** A ribbon tail: a slightly curved strip with a swallow-tail cut. */
const tailCache = new Map<number, THREE.BufferGeometry>();
export function bowTailGeometry(len = 0.24, width = 0.05): THREE.BufferGeometry {
  const hit = tailCache.get(len);
  if (hit) return hit;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, -len);
  shape.lineTo(0, -len + width * 0.7); // the notch
  shape.lineTo(-width / 2, -len);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.007, bevelEnabled: false, curveSegments: 2 });
  // bow the tail forward so it drapes instead of hanging like a plank
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = -pos.getY(i) / len;
    pos.setZ(i, pos.getZ(i) + Math.sin(y * Math.PI * 0.8) * 0.03);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  tailCache.set(len, geo);
  return geo;
}

export function SatinBow({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color = PALETTE.strawberry,
  knotColor = PALETTE.white,
}: BowProps) {
  const left = useMemo(() => bowLoopGeometry(-1), []);
  const right = useMemo(() => bowLoopGeometry(1), []);
  const tail = useMemo(() => bowTailGeometry(), []);
  const satin = finish("satin", color, { side: THREE.DoubleSide });
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={left} material={satin} rotation={[0, 0, 0.12]} />
      <mesh geometry={right} material={satin} rotation={[0, 0, -0.12]} />
      {/* the knot: a small ribbon wrap, not a marble */}
      <mesh rotation={[0, 0, 0.2]} scale={[1, 0.8, 1]}>
        <sphereGeometry args={[0.04, 12, 10]} />
        <primitive object={finish("satin", color)} attach="material" />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <sphereGeometry args={[0.014, 8, 8]} />
        <primitive object={finish("pearl", knotColor)} attach="material" />
      </mesh>
      <mesh geometry={tail} material={satin} position={[-0.02, -0.02, 0.005]} rotation={[0.15, 0, 0.42]} />
      <mesh geometry={tail} material={satin} position={[0.02, -0.02, 0.005]} rotation={[0.15, 0, -0.42]} />
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
      <mesh position={[0, 0, 0]} userData={{ noShadow: true }}>
        <sphereGeometry args={[0.22, 16, 14]} />
        <primitive object={finish("clay", color)} attach="material" />
      </mesh>
      <mesh position={[-0.22, -0.05, 0.02]} userData={{ noShadow: true }}>
        <sphereGeometry args={[0.16, 14, 12]} />
        <primitive object={finish("clay", color)} attach="material" />
      </mesh>
      <mesh position={[0.22, -0.04, 0]} userData={{ noShadow: true }}>
        <sphereGeometry args={[0.17, 14, 12]} />
        <primitive object={finish("clay", color)} attach="material" />
      </mesh>
      <mesh position={[0.02, -0.1, 0.06]} scale={[1.6, 0.6, 1]} userData={{ noShadow: true }}>
        <sphereGeometry args={[0.2, 14, 12]} />
        <primitive object={finish("clay", color)} attach="material" />
      </mesh>
    </group>
  );
}


/* ---------------- ribbon spool ---------------- */

/** A wooden spool with satin ribbon wound around it and a loose end
 *  trailing off — replaces the anonymous torus that read as a donut. */
export function RibbonSpool({
  position,
  rotation = [0, 0, 0],
  color = PALETTE.rose,
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  scale?: number;
}) {
  const tail = useMemo(() => {
    const pts = [
      new THREE.Vector3(0.15, 0.06, 0.02),
      new THREE.Vector3(0.3, 0.02, 0.1),
      new THREE.Vector3(0.48, 0.006, 0.05),
      new THREE.Vector3(0.66, 0.006, -0.08),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const shape = new THREE.Shape();
    shape.moveTo(-0.045, -0.003);
    shape.lineTo(0.045, -0.003);
    shape.lineTo(0.045, 0.003);
    shape.lineTo(-0.045, 0.003);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { steps: 24, bevelEnabled: false, extrudePath: curve });
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => tail.dispose(), [tail]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* wound ribbon: a fat, slightly flattened torus ring — the layers */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.09, 32]} />
        <primitive object={finish("satin", color)} attach="material" />
      </mesh>
      {/* wooden flanges */}
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.014, 32]} />
        <primitive object={finish("wood", PALETTE.wood)} attach="material" />
      </mesh>
      <mesh position={[0, 0.008, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.014, 32]} />
        <primitive object={finish("wood", PALETTE.wood)} attach="material" />
      </mesh>
      {/* the loose end */}
      <mesh geometry={tail} material={finish("satin", color, { side: THREE.DoubleSide })} />
    </group>
  );
}

/* ---------------- embroidery scissors ---------------- */

/** Little gold stork-style scissors — closed, resting on the desk. */
export function Scissors({
  position,
  rotation = [0, 0, 0],
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  const gold = finish("pearl", "#E7C77A");
  const handle = useMemo(() => new THREE.TorusGeometry(0.05, 0.011, 8, 20), []);
  useEffect(() => () => handle.dispose(), [handle]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {[-1, 1].map((side) => (
        <group key={side} rotation={[0, 0, side * 0.07]}>
          {/* blade: a long thin box tapering to the tip */}
          <mesh position={[0, 0.2, side * 0.004]} scale={[1, 1, 1]}>
            <boxGeometry args={[0.022, 0.42, 0.006]} />
            <primitive object={gold} attach="material" />
          </mesh>
          {/* finger loop */}
          <mesh geometry={handle} position={[side * 0.045, -0.06, side * 0.004]} rotation={[0, 0, 0]} scale={[0.9, 1.2, 1]}>
            <primitive object={gold} attach="material" />
          </mesh>
        </group>
      ))}
      {/* pivot screw */}
      <mesh position={[0, 0.0, 0.006]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <primitive object={gold} attach="material" />
      </mesh>
    </group>
  );
}
