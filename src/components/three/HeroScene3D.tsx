"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { useIsMobile, useSectionScrollProgress, useWebGL } from "@/lib/hooks";
import { HeroStatic } from "@/components/HeroStatic";
import { CrochetFlower, PALETTE } from "./CrochetFlower";
import {
  FloatingHeart,
  GiftBox,
  GroundDisk,
  Hook,
  ThreadTube,
  TinyDaisy,
  YarnBall,
} from "./parts";

const damp = THREE.MathUtils.damp;

type FlowerConfig = {
  position: [number, number, number];
  height: number;
  color: string;
  seed: number;
  tilt: [number, number, number];
};

const FLOWERS_FULL: FlowerConfig[] = [
  { position: [-0.3, 0, 0.12], height: 1.55, color: PALETTE.blush, seed: 1, tilt: [0.05, 0, -0.08] },
  { position: [0.12, 0, -0.22], height: 1.32, color: PALETTE.cream, seed: 2, tilt: [-0.04, 0, 0.1] },
  { position: [0.3, 0, 0.24], height: 1.14, color: PALETTE.rose, seed: 3, tilt: [0.1, 0, 0.06] },
  { position: [-0.08, 0, 0.32], height: 0.98, color: PALETTE.lavender, seed: 4, tilt: [0.14, 0, 0] },
  { position: [0.02, 0, -0.34], height: 1.42, color: PALETTE.white, seed: 5, tilt: [-0.06, 0, -0.06] },
];

const FLOWERS_SIMPLE: FlowerConfig[] = [FLOWERS_FULL[0], FLOWERS_FULL[2], FLOWERS_FULL[1]];

/** The loose rose thread snaking from the yarn ball across the surface. */
const THREAD_POINTS: [number, number, number][] = [
  [1.55, 0.12, 0.55],
  [1.35, 0.05, 0.95],
  [0.9, 0.035, 1.35],
  [0.3, 0.03, 1.55],
  [-0.4, 0.04, 1.45],
  [-1.05, 0.03, 1.3],
  [-1.6, 0.05, 1.05],
  [-2.25, 0.03, 0.9],
];

function Scene({ simple, reduced }: { simple: boolean; reduced: boolean }) {
  const world = useRef<THREE.Group>(null!);
  const scroll = useRef(0);
  useSectionScrollProgress("home", scroll);

  useFrame((state, dt) => {
    const g = world.current;
    if (!g) return;
    // gentle cursor parallax + a slow scroll-driven turn — cinematic, never dizzy
    const motion = reduced ? 0 : 1;
    const px = state.pointer.x * motion;
    const py = state.pointer.y * motion;
    const scrollMotion = scroll.current * 0.42 * motion;
    g.rotation.y = damp(g.rotation.y, px * 0.13 + scrollMotion, 2.5, dt);
    g.rotation.x = damp(g.rotation.x, -py * 0.045, 2.5, dt);
    state.camera.position.y = damp(state.camera.position.y, 1.85 + scrollMotion * 1.2, 2.5, dt);
    state.camera.lookAt(0, 0.9, 0);
  });

  const flowers = simple ? FLOWERS_SIMPLE : FLOWERS_FULL;

  return (
    <>
      {/* soft, warm studio lighting (fully local — no external HDRI fetch) */}
      <ambientLight intensity={0.95} color="#FFF6EC" />
      <directionalLight position={[3, 5, 2.5]} intensity={1.1} color="#FFFFFF" />
      <directionalLight position={[-4, 2.5, -2]} intensity={0.35} color="#FFDCE4" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.0} color="#FFF3E4" position={[0, 3, 4]} scale={[7, 3, 1]} target={[0, 0.8, 0]} />
        <Lightformer form="rect" intensity={0.5} color="#FFDEE7" position={[-5, 1.5, -3]} scale={[6, 2.5, 1]} target={[0, 0.8, 0]} />
        <Lightformer form="rect" intensity={0.35} color="#EAF2E4" position={[5, 2, 2]} scale={[5, 2, 1]} target={[0, 0.8, 0]} />
      </Environment>

      <group ref={world}>
        <GroundDisk />

        {/* the bouquet */}
        <group position={[-0.25, 0, 0.05]}>
          {flowers.map((f) => (
            <CrochetFlower key={f.seed} {...f} sway={!reduced} />
          ))}
          {/* cream paper wrap + rose ribbon band */}
          <mesh position={[0, 0.38, 0]}>
            <cylinderGeometry args={[0.4, 0.17, 0.75, 18, 1, true]} />
            <meshStandardMaterial color="#F6EBDA" roughness={0.95} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.46, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.31, 0.035, 10, 28]} />
            <meshStandardMaterial color={PALETTE.rose} roughness={0.85} />
          </mesh>
        </group>

        <YarnBall position={[1.55, 0.3, 0.55]} radius={0.3} color={PALETTE.blush} rings={simple ? 9 : 15} seed={2} />
        {!simple && (
          <YarnBall position={[2.05, 0.19, -0.85]} radius={0.19} color={PALETTE.sage} rings={8} seed={6} />
        )}

        <Hook position={[1.1, 0.03, 1.4]} />
        <ThreadTube points={THREAD_POINTS} />

        {!simple && <GiftBox position={[-1.8, 0.02, 0.75]} />}
        <FloatingHeart position={[0.95, 0.42, 1.15]} scale={0.3} color={PALETTE.dusty} />

        {!simple && (
          <>
            <TinyDaisy position={[-1.15, 0.03, 1.5]} seed={11} />
            <TinyDaisy position={[2.3, 0.03, 1.2]} seed={12} petalColor={PALETTE.blush} />
          </>
        )}
      </group>

      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.35}
        scale={11}
        blur={2.6}
        far={2.4}
        resolution={simple ? 256 : 512}
        color="#96566A"
      />
    </>
  );
}

/**
 * The signature hero scene: a crochet bouquet at rest on a cream surface with
 * yarn, hook, thread, heart and a little gift box. Falls back to a static
 * composition when WebGL is unavailable; simplifies on mobile.
 */
export default function HeroScene3D() {
  const webgl = useWebGL();
  const isMobile = useIsMobile();
  const reduced = useReducedMotion();

  if (webgl === false) return <HeroStatic />;

  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, isMobile ? 1.5 : 1.75]}
      camera={{ position: [0.35, 1.85, 7.1], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      aria-hidden="true"
    >
      <Scene simple={isMobile} reduced={!!reduced} />
    </Canvas>
  );
}
