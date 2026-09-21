"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Float, RoundedBox } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { makeHeartGeometry } from "./geometry";
import { PALETTE } from "./CrochetFlower";
import { SatinBow } from "./parts";
import { BreathingLight, DustMotes, HeartBurst, Sway } from "./anim";
import { AdaptiveCanvas, Breeze, StudioLights, StudioShadows } from "./Stage";
import { useQuality } from "@/lib/quality";
import { shared as finish } from "./materials";

const damp = THREE.MathUtils.damp;

/** One of the little hearts that appear when the gift opens. */
function GiftHeart({
  position,
  color,
  open,
  reduced,
}: {
  position: [number, number, number];
  color: string;
  open: boolean;
  reduced: boolean;
}) {
  const ref = useRef<THREE.Group>(null!);
  const geo = useMemo(() => makeHeartGeometry(), []);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const s = damp(ref.current.scale.x, open ? 1 : 0.0001, 5, dt);
    ref.current.scale.setScalar(s);
  });

  const heart = (
    <group ref={ref} position={position} scale={0.0001}>
      <mesh geometry={geo} scale={0.24}>
        <primitive object={finish("yarn", color)} attach="material" />
      </mesh>
    </group>
  );

  if (reduced) return heart;
  return (
    <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.6}>
      {heart}
    </Float>
  );
}

/** The gift box: body + a lid that swings open on its back edge. */
function OpenableGift({
  open,
  onToggle,
  reduced,
}: {
  open: boolean;
  onToggle: () => void;
  reduced: boolean;
}) {
  const lid = useRef<THREE.Group>(null!);
  const { gl } = useThree();
  // if the scene unmounts mid-hover, never leave a stuck cursor state
  useEffect(
    () => () => {
      delete gl.domElement.dataset.cursor;
    },
    [gl]
  );

  useFrame((_, dt) => {
    if (!lid.current) return;
    lid.current.rotation.x = damp(lid.current.rotation.x, open ? -1.35 : 0, 5, dt);
    lid.current.position.y = damp(lid.current.position.y, open ? 0.66 : 0.44, 5, dt);
  });

  const hover = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      gl.domElement.dataset.cursor = "pointer";
    },
    onPointerOut: () => {
      delete gl.domElement.dataset.cursor;
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onToggle();
    },
  };

  return (
    <Sway amp={0.02} bob={0.014} speed={0.8} phase={0.4} reduced={reduced}>
    <group position={[0, -0.35, 0]}>
      {/* body */}
      <RoundedBox args={[0.62, 0.42, 0.52]} radius={0.05} smoothness={4} position={[0, 0.21, 0]} {...hover}>
        <primitive object={finish("clay", PALETTE.blush)} attach="material" />
      </RoundedBox>
      {/* body ribbons */}
      <mesh position={[0, 0.22, 0]} {...hover}>
        <boxGeometry args={[0.07, 0.44, 0.545]} />
        <primitive object={finish("satin", PALETTE.strawberry)} attach="material" />
      </mesh>
      <mesh position={[0, 0.22, 0]} {...hover}>
        <boxGeometry args={[0.645, 0.44, 0.07]} />
        <primitive object={finish("satin", PALETTE.strawberry)} attach="material" />
      </mesh>

      {/* lid — pivots on its back edge */}
      <group ref={lid} position={[0, 0.44, -0.26]}>
        <group position={[0, 0, 0.26]}>
          <RoundedBox args={[0.68, 0.14, 0.58]} radius={0.05} smoothness={4} {...hover}>
            <primitive object={finish("clay", PALETTE.rose)} attach="material" />
          </RoundedBox>
          <mesh {...hover}>
            <boxGeometry args={[0.075, 0.15, 0.605]} />
            <primitive object={finish("satin", PALETTE.strawberry)} attach="material" />
          </mesh>
          <mesh {...hover}>
            <boxGeometry args={[0.705, 0.15, 0.075]} />
            <primitive object={finish("satin", PALETTE.strawberry)} attach="material" />
          </mesh>
          {/* bow */}
          <group position={[0, 0.1, 0]} {...hover}>
            <SatinBow position={[0, 0.03, 0]} scale={1.15} />
          </group>
        </group>
      </group>

      {/* hearts that escape when the lid opens */}
      <GiftHeart position={[-0.3, 0.78, 0.05]} color="#D8849C" open={open} reduced={reduced} />
      <GiftHeart position={[0.02, 1.0, -0.08]} color="#CBB6EA" open={open} reduced={reduced} />
      <GiftHeart position={[0.32, 0.85, 0.08]} color="#F2C4CE" open={open} reduced={reduced} />
      <GiftHeart position={[-0.08, 0.68, 0.22]} color="#C96A5E" open={open} reduced={reduced} />
      <GiftHeart position={[0.18, 1.12, 0.15]} color="#FFF3E2" open={open} reduced={reduced} />
    </group>
    </Sway>
  );
}

/**
 * The closing-CTA gift: tap the box (or the HTML button beside it) and the
 * lid swings open, releasing five little crochet hearts.
 */
export default function GiftScene({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const reduce = useReducedMotion();
  const quality = useQuality();
  // every *opening* releases a burst of hearts (closing does not)
  const burst = useRef(0);
  const [burstId, setBurstId] = useState(0);
  useEffect(() => {
    if (open) {
      burst.current += 1;
      setBurstId(burst.current);
    }
  }, [open]);

  return (
    <AdaptiveCanvas
      statsLabel="gift"
      quality={quality}
      className="!absolute inset-0"
      camera={{ position: [0.15, 0.95, 2.75], fov: 36 }}
      aria-hidden="true"
    >
      <StudioLights target={[0, 0.4, 0]} keyIntensity={1.05} />
      <Breeze reduced={!!reduce}>
        <OpenableGift open={open} onToggle={onToggle} reduced={!!reduce} />
        <HeartBurst origin={[0, 0.25, 0]} burstId={burstId} count={quality.simple ? 8 : 12} reduced={!!reduce} />
        <DustMotes count={Math.round(14 * quality.density)} area={[2.4, 1.9, 1.6]} size={0.035} reduced={!!reduce} />
      </Breeze>
      <BreathingLight position={[0.9, 1.0, 0.9]} intensity={0.42} reduced={!!reduce} />
      <StudioShadows position={[0, -0.45, 0]} opacity={0.3} scale={6} far={1.8} resolution={Math.min(256, quality.shadowRes)} />
    </AdaptiveCanvas>
  );
}
