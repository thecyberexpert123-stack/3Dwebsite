"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer, RoundedBox } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { makeHeartGeometry } from "./geometry";
import { BreathingLight, DustMotes, Sway } from "./anim";

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
        <meshStandardMaterial color={color} roughness={0.85} />
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

  useFrame((_, dt) => {
    if (!lid.current) return;
    lid.current.rotation.x = damp(lid.current.rotation.x, open ? -1.35 : 0, 5, dt);
    lid.current.position.y = damp(lid.current.position.y, open ? 0.66 : 0.44, 5, dt);
  });

  const hover = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "auto";
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
        <meshStandardMaterial color="#FFF6EC" roughness={0.9} />
      </RoundedBox>
      {/* body ribbons */}
      <mesh position={[0, 0.22, 0]} {...hover}>
        <boxGeometry args={[0.07, 0.44, 0.545]} />
        <meshStandardMaterial color="#D8849C" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.22, 0]} {...hover}>
        <boxGeometry args={[0.645, 0.44, 0.07]} />
        <meshStandardMaterial color="#D8849C" roughness={0.8} />
      </mesh>

      {/* lid — pivots on its back edge */}
      <group ref={lid} position={[0, 0.44, -0.26]}>
        <group position={[0, 0, 0.26]}>
          <RoundedBox args={[0.68, 0.14, 0.58]} radius={0.05} smoothness={4} {...hover}>
            <meshStandardMaterial color="#F2C4CE" roughness={0.9} />
          </RoundedBox>
          <mesh {...hover}>
            <boxGeometry args={[0.075, 0.15, 0.605]} />
            <meshStandardMaterial color="#D8849C" roughness={0.8} />
          </mesh>
          <mesh {...hover}>
            <boxGeometry args={[0.705, 0.15, 0.075]} />
            <meshStandardMaterial color="#D8849C" roughness={0.8} />
          </mesh>
          {/* bow */}
          <group position={[0, 0.1, 0]} {...hover}>
            <mesh position={[-0.055, 0.01, 0]} rotation={[Math.PI / 2, 0, 0.5]}>
              <torusGeometry args={[0.05, 0.015, 8, 16, Math.PI * 1.4]} />
              <meshStandardMaterial color="#D8849C" roughness={0.8} />
            </mesh>
            <mesh position={[0.055, 0.01, 0]} rotation={[Math.PI / 2, 0, Math.PI - 0.5]}>
              <torusGeometry args={[0.05, 0.015, 8, 16, Math.PI * 1.4]} />
              <meshStandardMaterial color="#D8849C" roughness={0.8} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.024, 8, 8]} />
              <meshStandardMaterial color="#C96A5E" roughness={0.8} />
            </mesh>
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

  // if the scene unmounts mid-hover, never leave a stuck pointer cursor
  useEffect(() => () => {
    document.body.style.cursor = "auto";
  }, []);

  return (
    <Canvas
      className="!absolute inset-0 cursor-pointer"
      dpr={[1, 1.6]}
      camera={{ position: [0.15, 0.95, 2.75], fov: 36 }}
      gl={{ antialias: true, alpha: true }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.95} color="#FFF6EC" />
      <directionalLight position={[2.5, 4, 3]} intensity={1.05} color="#FFFFFF" />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} color="#FFDCE4" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.0} color="#FFF3E4" position={[0, 3, 4]} scale={[6, 3, 1]} target={[0, 0.4, 0]} />
        <Lightformer form="rect" intensity={0.45} color="#FFDEE7" position={[-4, 1.5, -3]} scale={[5, 2, 1]} target={[0, 0.4, 0]} />
      </Environment>
      <OpenableGift open={open} onToggle={onToggle} reduced={!!reduce} />
      <DustMotes count={14} area={[2.4, 1.9, 1.6]} size={0.035} reduced={!!reduce} />
      <BreathingLight position={[0.9, 1.0, 0.9]} intensity={0.42} reduced={!!reduce} />
      <ContactShadows
        position={[0, -0.45, 0]}
        opacity={0.3}
        scale={6}
        blur={2.6}
        far={1.8}
        resolution={256}
        color="#96566A"
      />
    </Canvas>
  );
}
