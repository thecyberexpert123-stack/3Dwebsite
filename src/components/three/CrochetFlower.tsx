"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makePetalGeometry, rnd } from "./geometry";
import { useWind } from "./Stage";
import { create as createMat } from "./materials";

/** Whimlet yarn palette — shared across all 3D scenes. */
export const PALETTE = {
  blush: "#F9C6D3",
  blushDeep: "#F3A8BF",
  cream: "#FFF1E6",
  rose: "#E07A9A",
  dusty: "#D16A7C",
  white: "#FFFBFC",
  lavender: "#DCCCF5",
  lavenderDeep: "#B89BE6",
  sage: "#B7D8C4",
  sageDeep: "#7FAE92",
  mint: "#D4F1EA",
  sky: "#D8ECFB",
  butter: "#FFE9A8",
  peach: "#FFD4C2",
  wood: "#C9A27E",
  ivory: "#FFF6F8",
  strawberry: "#F07C8C",
} as const;

/** The shared "soft clay" finish: matte but with a hint of sheen so pastel
 *  forms read as plump toys rather than dusty plaster. */
export const CLAY = { roughness: 0.62, metalness: 0 } as const;

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

const OUTER = 6;
const INNER = 5;

/**
 * A hand-crocheted flower: stem, leaves and a two-ring petal head.
 * Every petal gets a deterministic jitter so no two look identical —
 * the "handmade irregularity" the brand asks for.
 *
 * Draw-call budget: each petal ring is ONE InstancedMesh (6 + 5 instances)
 * instead of eleven meshes, so a flower costs 5 draw calls (stem, two leaves
 * share a geometry but not a transform → 2, outer ring, inner ring, centre)
 * rather than 16. The per-petal flutter is kept by rewriting the instance
 * matrices each frame — 11 tiny matrix updates, no extra programs.
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
  const outerRef = useRef<THREE.InstancedMesh>(null!);
  const innerRef = useRef<THREE.InstancedMesh>(null!);
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
  // per-petal layout (deterministic per seed): ring angle, tilt, width
  const outerPetals = useMemo(
    () =>
      Array.from({ length: OUTER }, (_, i) => {
        const j = rnd(seed + i * 3.7);
        return { angle: (i / OUTER) * Math.PI * 2 + j * 0.4, tilt: 1.05 + j * 0.12, width: 0.92 + j * 0.16 };
      }),
    [seed]
  );
  const innerPetals = useMemo(
    () =>
      Array.from({ length: INNER }, (_, i) => {
        const j = rnd(seed + 20 + i * 2.9);
        return { angle: (i / INNER) * Math.PI * 2 + 0.5 + j * 0.4, tilt: 0.5 + j * 0.1, width: 0.8 + j * 0.1 };
      }),
    [seed]
  );
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), rot: new THREE.Matrix4(), m: new THREE.Matrix4() }), []);

  /** Write one ring's instance matrices. `flutter(i)` adds to the petal tilt. */
  const writeRing = (
    mesh: THREE.InstancedMesh | null,
    petals: { angle: number; tilt: number; width: number }[],
    ringScaleY: number,
    ringScaleZ: number,
    lift: number,
    flutter: (i: number) => number
  ) => {
    if (!mesh) return;
    const { o, rot, m } = tmp;
    for (let i = 0; i < petals.length; i++) {
      const p = petals[i];
      o.position.set(0, lift, 0.05);
      o.rotation.set(p.tilt + flutter(i), 0, 0);
      o.scale.set(p.width, ringScaleY, ringScaleZ);
      o.updateMatrix();
      rot.makeRotationY(p.angle);
      m.multiplyMatrices(rot, o.matrix);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  // resting pose (also the only pose when sway is off / reduced motion)
  useLayoutEffect(() => {
    writeRing(outerRef.current, outerPetals, 0.19, 1, 0.01, () => 0);
    writeRing(innerRef.current, innerPetals, 0.15, 0.9, 0.02, () => 0);
    outerRef.current?.computeBoundingSphere();
    innerRef.current?.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outerPetals, innerPetals]);

  const mats = useMemo(() => {
    const base = new THREE.Color(color);
    const inner = base.clone().lerp(new THREE.Color("#B98A93"), 0.22);
    return {
      outer: createMat("yarn", base),
      inner: createMat("yarn", inner),
      center: createMat("yarn", centerColor),
      stem: createMat("yarn", PALETTE.sageDeep),
      leaf: createMat("yarn", PALETTE.sage),
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
    const f = 0.9 + Math.abs(w) * 2;
    writeRing(outerRef.current, outerPetals, 0.19, 1, 0.01, (i) => Math.sin(t * f + i * 1.3 + seed) * 0.05 * flutterGain);
    writeRing(innerRef.current, innerPetals, 0.15, 0.9, 0.02, (i) => Math.sin(t * (f + 0.15) + i * 1.1 + seed) * 0.04 * flutterGain);
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
        <instancedMesh ref={outerRef} args={[petals.outer, mats.outer, OUTER]} frustumCulled={false} />
        <instancedMesh ref={innerRef} args={[petals.inner, mats.inner, INNER]} frustumCulled={false} />
        <mesh material={mats.center}>
          <sphereGeometry args={[0.09, 12, 12]} />
        </mesh>
      </group>
      </group>
    </group>
  );
}
