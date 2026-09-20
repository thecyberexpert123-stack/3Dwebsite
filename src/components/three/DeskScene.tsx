"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { PALETTE } from "./CrochetFlower";
import { CrochetFlower } from "./CrochetFlower";
import { FloatingHeart, GiftBox, Hook, Sparkle3D, YarnBall } from "./parts";
import { BreathingLight, DustMotes } from "./anim";
import { AdaptiveCanvas, Breeze, SoftGround, StudioLights, StudioShadows } from "./Stage";
import { useQuality } from "@/lib/quality";

const damp = THREE.MathUtils.damp;

/**
 * The "customization desk" — a cozy still life that never quite sits
 * still: the flower sways, yarn balls slowly turn, warm dust drifts
 * through the light and a little heart bobs. `active` flips the render
 * loop off while the desk is off-screen, so it costs nothing unseen.
 */
function Desk({ reduced, density }: { reduced: boolean; density: number }) {
  const world = useRef<THREE.Group>(null!);

  useFrame((state, dt) => {
    if (!world.current) return;
    const px = reduced ? 0 : state.pointer.x;
    const py = reduced ? 0 : state.pointer.y;
    world.current.rotation.y = damp(world.current.rotation.y, px * 0.16, 3, dt);
    world.current.rotation.x = damp(world.current.rotation.x, -py * 0.05, 3, dt);
  });

  return (
    <group ref={world}>
      <SoftGround radius={2.8} color="#FAF1E5" />

      <DustMotes count={Math.round(24 * density)} area={[3.4, 2.1, 2.4]} reduced={reduced} />
      <BreathingLight position={[-1.2, 1.1, 0.9]} intensity={0.45} reduced={reduced} />

      <CrochetFlower
        position={[-0.55, 0, 0.25]}
        height={1.15}
        color={PALETTE.blush}
        seed={41}
        tilt={[0.04, 0.3, -0.05]}
        sway={!reduced}
      />

      <YarnBall
        position={[0.85, 0.24, 0.65]}
        radius={0.24}
        color={PALETTE.blush}
        rings={12}
        seed={12}
        spin={reduced ? 0 : 0.16}
      />
      <YarnBall
        position={[1.35, 0.17, -0.35]}
        radius={0.17}
        color={PALETTE.lavender}
        rings={8}
        seed={13}
        spin={reduced ? 0 : 0.24}
      />
      <YarnBall
        position={[0.55, 0.14, 1.15]}
        radius={0.14}
        color={PALETTE.cream}
        rings={7}
        seed={14}
        spin={reduced ? 0 : 0.2}
      />

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
            <meshStandardMaterial color={s.c} roughness={0.62} />
          </RoundedBox>
        </group>
      ))}

      <Hook position={[-1.15, 0.03, 0.85]} rotation={[0, -0.5, Math.PI / 2 - 0.08]} length={0.95} />
      <GiftBox position={[-1.45, 0.02, -0.45]} />

      {/* ribbon spool */}
      <group position={[0.15, 0.06, -0.75]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.14, 0.045, 10, 28]} />
          <meshStandardMaterial color={PALETTE.rose} roughness={0.62} />
        </mesh>
      </group>

      <FloatingHeart position={[0.5, 0.85, 0.1]} scale={0.16} color={PALETTE.rose} />
      <Sparkle3D position={[-0.85, 1.35, 0.8]} phase={1.2} size={0.04} reduced={reduced} />
      <Sparkle3D position={[1.55, 1.05, -0.2]} phase={3.4} size={0.035} color="#F5DCE4" reduced={reduced} />
    </group>
  );
}

export default function DeskScene({ active = true }: { active?: boolean }) {
  const reduce = useReducedMotion();
  const quality = useQuality();
  return (
    <AdaptiveCanvas
      quality={quality}
      className="!absolute inset-0"
      frameloop={active ? "always" : "never"}
      camera={{ position: [0.3, 1.9, 4.4], fov: 34 }}
      aria-hidden="true"
    >
      <StudioLights target={[0, 0.7, 0]} keyIntensity={1.05} />
      <Breeze reduced={!!reduce}>
        <Desk reduced={!!reduce} density={quality.density} />
      </Breeze>
      <StudioShadows opacity={0.32} scale={8} far={2.2} resolution={Math.min(384, quality.shadowRes)} />
    </AdaptiveCanvas>
  );
}
