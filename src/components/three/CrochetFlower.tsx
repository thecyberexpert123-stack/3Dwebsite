"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeLeafGeometry, makePetalGeometry, makeStemCurve, makeStemGeometry, rnd } from "./geometry";
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
  /** head lean toward +z (the camera); defaults to BLOOM.face */
  face?: number;
};

const OUTER = 6;
const INNER = 5;

/**
 * The Whimlet bloom — ONE petal system shared by every scene (hero, gift
 * door, desk, studio, process). A crochet petal is a plump lens, longer than
 * it is wide, cupped upward around a round centre; an inner ring sits more
 * upright like a bud. Numbers are mesh transforms applied to
 * `makePetalGeometry(0.36, 0.95, 0.17)` (length axis = +Y, base at origin).
 *   scale   → [width, length, thickness]
 *   tilt    → radians from vertical (0 = pointing straight up)
 *   lift    → how high the ring sits above the head origin
 */
export const BLOOM = {
  // outer ring: petals ~0.26 wide × 0.32 long, opened ~68° from vertical
  outer: { tilt: 1.18, tiltJitter: 0.1, width: 0.72, widthJitter: 0.1, scaleY: 0.34, scaleZ: 0.42, lift: 0.0, out: 0.04 },
  // inner ring: a touch smaller and more upright, cupped around the centre
  inner: { tilt: 0.8, tiltJitter: 0.08, width: 0.62, widthJitter: 0.08, scaleY: 0.26, scaleZ: 0.42, lift: 0.02, out: 0.025 },
  /** the centre: a squashed yarn dome studded with a ring of french knots */
  center: { radius: 0.1, squash: 0.68, lift: 0.035, knots: 9, knotRadius: 0.024 },
  /** calyx: five small sepals cupping the head from below */
  sepals: { count: 5, tilt: 1.35, scale: 0.16 },
  /** heads lean toward the viewer (+z) so the bloom face reads from the front */
  face: 0.5,
} as const;

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
  face = BLOOM.face,
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
  const leaf = useMemo(() => makeLeafGeometry(0.34, 1, 0.1, seed + 7), [seed]);
  // the stem bends a touch and the head sits on its tip — no ruler-straight stalks
  const stemCurve = useMemo(() => makeStemCurve(height, seed, 0.04 + rnd(seed + 1.7) * 0.05), [height, seed]);
  const stemGeo = useMemo(() => makeStemGeometry(stemCurve, 0.024), [stemCurve]);
  const top = useMemo(() => stemCurve.getPoint(1), [stemCurve]);
  const leafAnchors = useMemo(
    () =>
      [0.42, 0.64].map((f, i) => ({
        p: stemCurve.getPoint(f),
        yaw: rnd(seed + i * 9) * Math.PI * 2,
        scale: 0.5 + rnd(seed + i * 4.4) * 0.14,
      })),
    [stemCurve, seed]
  );
  const knotRef = useRef<THREE.InstancedMesh>(null!);
  const sepalRef = useRef<THREE.InstancedMesh>(null!);
  // per-petal layout (deterministic per seed): ring angle, tilt, width
  const outerPetals = useMemo(
    () =>
      Array.from({ length: OUTER }, (_, i) => {
        const j = rnd(seed + i * 3.7);
        const b = BLOOM.outer;
        return { angle: (i / OUTER) * Math.PI * 2 + j * 0.4, tilt: b.tilt + j * b.tiltJitter, width: b.width + j * b.widthJitter };
      }),
    [seed]
  );
  const innerPetals = useMemo(
    () =>
      Array.from({ length: INNER }, (_, i) => {
        const j = rnd(seed + 20 + i * 2.9);
        const b = BLOOM.inner;
        return { angle: (i / INNER) * Math.PI * 2 + 0.5 + j * 0.4, tilt: b.tilt + j * b.tiltJitter, width: b.width + j * b.widthJitter };
      }),
    [seed]
  );
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), rot: new THREE.Matrix4(), m: new THREE.Matrix4() }), []);

  /** Write one ring's instance matrices. `flutter(i)` adds to the petal tilt. */
  const writeRing = (
    mesh: THREE.InstancedMesh | null,
    petals: { angle: number; tilt: number; width: number }[],
    ring: typeof BLOOM.outer | typeof BLOOM.inner,
    flutter: (i: number) => number
  ) => {
    if (!mesh) return;
    const { o, rot, m } = tmp;
    for (let i = 0; i < petals.length; i++) {
      const p = petals[i];
      o.position.set(0, ring.lift, ring.out);
      o.rotation.set(p.tilt + flutter(i), 0, 0);
      o.scale.set(p.width, ring.scaleY, ring.scaleZ);
      o.updateMatrix();
      rot.makeRotationY(p.angle);
      m.multiplyMatrices(rot, o.matrix);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  // resting pose (also the only pose when sway is off / reduced motion)
  useLayoutEffect(() => {
    writeRing(outerRef.current, outerPetals, BLOOM.outer, () => 0);
    writeRing(innerRef.current, innerPetals, BLOOM.inner, () => 0);
    outerRef.current?.computeBoundingSphere();
    innerRef.current?.computeBoundingSphere();
    // french knots: a ring around the dome plus one on top, each a little off
    const { o } = tmp;
    const c = BLOOM.center;
    if (knotRef.current) {
      for (let i = 0; i < c.knots; i++) {
        const last = i === c.knots - 1;
        const a = (i / (c.knots - 1)) * Math.PI * 2 + rnd(seed + i) * 0.3;
        const r = last ? 0 : c.radius * 0.62;
        o.position.set(Math.cos(a) * r, c.lift + c.radius * c.squash * (last ? 0.95 : 0.7) + rnd(seed + i * 2) * 0.008, Math.sin(a) * r);
        o.rotation.set(0, 0, 0);
        o.scale.setScalar(0.85 + rnd(seed + i * 5) * 0.3);
        o.updateMatrix();
        knotRef.current.setMatrixAt(i, o.matrix);
      }
      knotRef.current.instanceMatrix.needsUpdate = true;
      knotRef.current.computeBoundingSphere();
    }
    // sepals hug the underside of the head
    if (sepalRef.current) {
      const sp = BLOOM.sepals;
      for (let i = 0; i < sp.count; i++) {
        const a = (i / sp.count) * Math.PI * 2 + 0.3;
        o.position.set(0, -0.02, 0);
        o.rotation.set(sp.tilt + rnd(seed + 40 + i) * 0.15, 0, 0);
        o.scale.set(sp.scale * 1.2, sp.scale, sp.scale);
        o.updateMatrix();
        tmp.rot.makeRotationY(a);
        tmp.m.multiplyMatrices(tmp.rot, o.matrix);
        sepalRef.current.setMatrixAt(i, tmp.m);
      }
      sepalRef.current.instanceMatrix.needsUpdate = true;
      sepalRef.current.computeBoundingSphere();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outerPetals, innerPetals]);

  const mats = useMemo(() => {
    const base = new THREE.Color(color);
    const inner = base.clone().lerp(new THREE.Color("#B98A93"), 0.22);
    return {
      outer: createMat("yarn", base),
      inner: createMat("yarn", inner),
      center: createMat("yarn", centerColor),
      // knots are a shade deeper than the dome so they read as bumps, not spots
      knot: createMat("yarn", new THREE.Color(centerColor).lerp(new THREE.Color("#9A6B3A"), 0.28)),
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
      stemGeo.dispose();
    },
    [mats, petals, leaf, stemGeo]
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
      head.current.rotation.x = face + Math.sin(t * 0.42 + seed * 1.3) * 0.02;
    }
    // each petal flutters individually, like fabric catching air
    const f = 0.9 + Math.abs(w) * 2;
    writeRing(outerRef.current, outerPetals, BLOOM.outer, (i) => Math.sin(t * f + i * 1.3 + seed) * 0.05 * flutterGain);
    writeRing(innerRef.current, innerPetals, BLOOM.inner, (i) => Math.sin(t * (f + 0.15) + i * 1.1 + seed) * 0.04 * flutterGain);
  });

  return (
    <group position={position} rotation={tilt} scale={scale}>
      <group ref={plant}>
      {/* stem — a gently bent tube */}
      <mesh geometry={stemGeo} material={mats.stem} />
      {/* leaves, folded along the midrib, growing from the stem's actual curve */}
      {leafAnchors.map((l, i) => (
        <group key={i} position={l.p} rotation={[0, l.yaw, 0]}>
          <mesh
            geometry={leaf}
            material={mats.leaf}
            rotation={[1.05 + i * 0.1, 0, 0.12]}
            scale={[l.scale, l.scale * 0.8, l.scale]}
            position={[0, 0.01, 0.02]}
          />
        </group>
      ))}
      {/* head */}
      <group ref={head} position={top} rotation={[face, 0, 0]}>
        <instancedMesh ref={sepalRef} args={[leaf, mats.leaf, BLOOM.sepals.count]} frustumCulled={false} />
        <instancedMesh ref={outerRef} args={[petals.outer, mats.outer, OUTER]} frustumCulled={false} />
        <instancedMesh ref={innerRef} args={[petals.inner, mats.inner, INNER]} frustumCulled={false} />
        <mesh material={mats.center} position={[0, BLOOM.center.lift, 0]} scale={[1, BLOOM.center.squash, 1]}>
          <sphereGeometry args={[BLOOM.center.radius, 14, 12]} />
        </mesh>
        <instancedMesh ref={knotRef} args={[undefined, mats.knot, BLOOM.center.knots]} frustumCulled={false}>
          <sphereGeometry args={[BLOOM.center.knotRadius, 8, 8]} />
        </instancedMesh>
      </group>
      </group>
    </group>
  );
}
