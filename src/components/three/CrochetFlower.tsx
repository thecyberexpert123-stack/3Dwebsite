"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makePetalGeometry, rnd } from "./geometry";
import { useWind } from "./Stage";

/** Whimlet yarn palette — shared across all 3D scenes. */
export const PALETTE = {
  blush: "#F2C4CE",
  blushDeep: "#E9A9BC",
  cream: "#F6E9D8",
  rose: "#D8849C",
  dusty: "#C96A5E",
  white: "#FFF7F0",
  lavender: "#D9C7EE",
  sage: "#A9BFA3",
  sageDeep: "#7C977A",
  butter: "#F0D5A8",
  wood: "#A97E5B",
  ivory: "#FBF3E7",
} as const;

type CrochetFlowerProps = {
  position: [number, number, number];
  height: number;
  color?: string;
  centerColor?: string;
  seed?: number;
  scale?: number;
  tilt?: [number, number, number];
  sway?: boolean;
};

/**
 * A hand-crocheted flower: stem, leaves and a two-ring petal head.
 * Every petal gets a deterministic jitter so no two look identical —
 * the "handmade irregularity" the brand asks for.
 */
export function CrochetFlower({
  position,
  height,
  color = PALETTE.blush,
  centerColor = PALETTE.butter,
  seed = 1,
  scale = 1,
  tilt = [0, 0, 0],
  sway = true,
}: CrochetFlowerProps) {
  const head = useRef<THREE.Group>(null!);
  const plant = useRef<THREE.Group>(null!);
  const flutterRefs = useRef<(THREE.Mesh | null)[]>([]);
  const wind = useWind();
  // the bend responds to the wind with a little lag — stems are springy
  const bend = useRef(0);

  const petals = useMemo(
    () => ({
      outer: makePetalGeometry(0.36, 0.95, 0.17, seed),
      inner: makePetalGeometry(0.32, 0.8, 0.15, seed + 3),
    }),
    [seed]
  );
  const leaf = useMemo(() => makePetalGeometry(0.4, 1, 0.12, seed + 7), [seed]);
  const flutterBase = useMemo(
    () => Array.from({ length: 6 }, (_, i) => 1.05 + rnd(seed + i * 3.7) * 0.12),
    [seed]
  );

  const mats = useMemo(() => {
    const base = new THREE.Color(color);
    const inner = base.clone().lerp(new THREE.Color("#B98A93"), 0.22);
    return {
      outer: new THREE.MeshStandardMaterial({ color: base, roughness: 0.9 }),
      inner: new THREE.MeshStandardMaterial({ color: inner, roughness: 0.9 }),
      center: new THREE.MeshStandardMaterial({ color: centerColor, roughness: 0.85 }),
      stem: new THREE.MeshStandardMaterial({ color: PALETTE.sageDeep, roughness: 0.95 }),
      leaf: new THREE.MeshStandardMaterial({ color: PALETTE.sage, roughness: 0.95 }),
    };
  }, [color, centerColor]);

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
      petals.outer.dispose();
      petals.inner.dispose();
      leaf.dispose();
    },
    [mats, petals, leaf]
  );

  useFrame(({ clock }, dt) => {
    if (!sway) return;
    const t = clock.elapsedTime;
    // wind: taller stems bend more, each flower lags a little differently
    const w = wind.current ?? 0;
    bend.current = THREE.MathUtils.damp(bend.current, w, 3 + rnd(seed) * 2, dt);
    const gust = bend.current * (0.12 + height * 0.06);
    const flutterGain = 1 + Math.abs(bend.current) * 3;
    // the whole plant leans ever so slightly in the breeze
    if (plant.current) {
      plant.current.rotation.z = Math.sin(t * 0.35 + seed * 0.9) * 0.028 - gust;
      plant.current.rotation.x = Math.cos(t * 0.29 + seed * 0.7) * 0.02;
    }
    // the head sways on its own clock
    if (head.current) {
      head.current.rotation.z = Math.sin(t * 0.6 + seed * 2.1) * 0.035 - gust * 0.5;
      head.current.rotation.x = Math.sin(t * 0.42 + seed * 1.3) * 0.02;
    }
    // each petal flutters individually, like fabric catching air
    for (let i = 0; i < flutterRefs.current.length; i++) {
      const m = flutterRefs.current[i];
      if (m) m.rotation.x = flutterBase[i] + Math.sin(t * (0.9 + Math.abs(w) * 2) + i * 1.3 + seed) * 0.05 * flutterGain;
    }
  });

  return (
    <group position={position} rotation={tilt} scale={scale}>
      <group ref={plant}>
      {/* stem */}
      <mesh position={[0, height / 2, 0]} material={mats.stem}>
        <cylinderGeometry args={[0.02, 0.028, height, 8]} />
      </mesh>
      {/* leaves */}
      {[0.42, 0.62].map((f, i) => (
        <group
          key={i}
          position={[0, height * f, 0]}
          rotation={[0, rnd(seed + i * 9) * Math.PI * 2, 0]}
        >
          <mesh
            geometry={leaf}
            material={mats.leaf}
            rotation={[1.15, 0, 0.15]}
            scale={[0.55, 0.42, 0.55]}
            position={[0, 0.01, 0.03]}
          />
        </group>
      ))}
      {/* head */}
      <group ref={head} position={[0, height, 0]}>
        {Array.from({ length: 6 }).map((_, i) => {
          const j = rnd(seed + i * 3.7);
          return (
            <group key={`o${i}`} rotation={[0, (i / 6) * Math.PI * 2 + j * 0.4, 0]}>
              <mesh
                ref={(el) => {
                  flutterRefs.current[i] = el;
                }}
                geometry={petals.outer}
                material={mats.outer}
                rotation={[1.05 + j * 0.12, 0, 0]}
                position={[0, 0.01, 0.05]}
                scale={[0.92 + j * 0.16, 0.19, 1]}
              />
            </group>
          );
        })}
        {Array.from({ length: 5 }).map((_, i) => {
          const j = rnd(seed + 20 + i * 2.9);
          return (
            <group
              key={`i${i}`}
              rotation={[0, (i / 5) * Math.PI * 2 + 0.5 + j * 0.4, 0]}
            >
              <mesh
                geometry={petals.inner}
                material={mats.inner}
                rotation={[0.5 + j * 0.1, 0, 0]}
                position={[0, 0.02, 0.03]}
                scale={[0.8 + j * 0.1, 0.15, 0.9]}
              />
            </group>
          );
        })}
        <mesh material={mats.center}>
          <sphereGeometry args={[0.09, 12, 12]} />
        </mesh>
      </group>
      </group>
    </group>
  );
}
