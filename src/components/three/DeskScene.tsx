"use client";

import { useRef } from "react";
import { Canvas, useFrame, invalidate } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { PALETTE } from "./CrochetFlower";
import { CrochetFlower } from "./CrochetFlower";
import { GiftBox, GroundDisk, Hook, YarnBall } from "./parts";

const damp = THREE.MathUtils.damp;

/**
 * The "customization desk" — a quiet still life of yarn balls, colour
 * swatches, a hook, a flower, ribbon and a gift box. Uses frameloop="demand":
 * it renders only when the pointer moves, so it costs almost nothing.
 */
function Desk({ reduced }: { reduced: boolean }) {
  const world = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (!world.current) return;
    const px = reduced ? 0 : state.pointer.x;
    const py = reduced ? 0 : state.pointer.y;
    world.current.rotation.y = damp(world.current.rotation.y, px * 0.16, 3, 0.016);
    world.current.rotation.x = damp(world.current.rotation.x, -py * 0.05, 3, 0.016);
  });

  return (
    <group ref={world}>
      <GroundDisk radius={3.2} color="#FAF1E5" />

      <CrochetFlower
        position={[-0.55, 0, 0.25]}
        height={1.15}
        color={PALETTE.blush}
        seed={41}
        tilt={[0.04, 0.3, -0.05]}
        sway={false}
      />

      <YarnBall position={[0.85, 0.24, 0.65]} radius={0.24} color={PALETTE.blush} rings={12} seed={12} />
      <YarnBall position={[1.35, 0.17, -0.35]} radius={0.17} color={PALETTE.lavender} rings={8} seed={13} />
      <YarnBall position={[0.55, 0.14, 1.15]} radius={0.14} color={PALETTE.cream} rings={7} seed={14} />

      {/* colour swatch cards fanned on the desk */}
      {[
        { c: PALETTE.blush, r: 0.5 },
        { c: PALETTE.cream, r: 0.25 },
        { c: PALETTE.sage, r: 0 },
        { c: PALETTE.lavender, r: -0.25 },
        { c: PALETTE.dusty, r: -0.5 },
      ].map((s, i) => (
        <group key={i} position={[-0.15 - i * 0.02, 0.008 + i * 0.004, 1.05 - i * 0.06]} rotation={[-Math.PI / 2, 0, s.r]}>
          <RoundedBox args={[0.42, 0.3, 0.012]} radius={0.015} smoothness={3}>
            <meshStandardMaterial color={s.c} roughness={0.85} />
          </RoundedBox>
        </group>
      ))}

      <Hook position={[-1.15, 0.03, 0.85]} rotation={[0, -0.5, Math.PI / 2 - 0.08]} length={0.95} />
      <GiftBox position={[-1.45, 0.02, -0.45]} />

      {/* ribbon spool */}
      <group position={[0.15, 0.06, -0.75]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.14, 0.045, 10, 28]} />
          <meshStandardMaterial color={PALETTE.rose} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

export default function DeskScene() {
  const reduce = useReducedMotion();
  return (
    <Canvas
      className="!absolute inset-0"
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [0.3, 1.9, 4.4], fov: 34 }}
      gl={{ antialias: true, alpha: true }}
      onPointerMove={() => invalidate()}
      aria-hidden="true"
    >
      <ambientLight intensity={0.95} color="#FFF6EC" />
      <directionalLight position={[3, 5, 2.5]} intensity={1.05} color="#FFFFFF" />
      <directionalLight position={[-4, 2.5, -2]} intensity={0.35} color="#FFDCE4" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.0} color="#FFF3E4" position={[0, 3, 4]} scale={[7, 3, 1]} target={[0, 0.7, 0]} />
        <Lightformer form="rect" intensity={0.45} color="#FFDEE7" position={[-5, 1.5, -3]} scale={[6, 2.5, 1]} target={[0, 0.7, 0]} />
      </Environment>
      <Desk reduced={!!reduce} />
      <ContactShadows position={[0, 0.001, 0]} opacity={0.32} scale={8} blur={2.4} far={2.2} resolution={256} color="#96566A" />
    </Canvas>
  );
}
