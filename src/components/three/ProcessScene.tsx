"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { useQuality } from "@/lib/quality";
import { clamp01, easeOutBack, easeOutCubic, seg, smoothstep } from "@/lib/intro";
import { makePetalGeometry, makeThreadGeometry, rnd } from "./geometry";
import { BLOOM, PALETTE } from "./CrochetFlower";
import { Hook, SatinBow, YarnBall } from "./parts";
import { DustMotes } from "./anim";
import { AdaptiveCanvas, SoftGround, StudioLights, StudioShadows } from "./Stage";
import { shared as finish } from "./materials";

const damp = THREE.MathUtils.damp;

/**
 * THE MAKING OF A FLOWER — a scroll-driven sequence.
 *
 * `progress` (0…1, from the section's scroll position) is the timeline.
 * Six stages, each owning a sixth of it:
 *   0 Yarn    — a yarn ball rests alone on the table
 *   1 Design  — a pencil-sketch outline of the flower draws in the air
 *   2 Stitch  — the thread unspools from the ball and the stem rises
 *   3 Detail  — petals bloom one by one, leaves unfurl, the centre appears
 *   4 Pack    — a gift box slides in and the flower settles into it
 *   5 You     — the box closes with its bow; the camera pulls back and smiles
 *
 * Everything is driven from ONE number, so scrubbing backwards is exact —
 * it's a timeline, not a set of triggered animations.
 */

type P = React.RefObject<number>;

const STAGES = 6;
const stage = (p: number, i: number) => clamp01(p * STAGES - i);

/* ---------- sketch outline: a flower drawn with a single stroke ---------- */

function useSketchCurve() {
  return useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const n = 160;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      // rose-curve petals (k = 5) plus a stem
      const r = 0.34 + 0.18 * Math.cos(5 * a);
      pts.push(new THREE.Vector3(Math.cos(a) * r, 1.3 + Math.sin(a) * r, 0));
    }
    // then the stem down to the ground
    for (let i = 1; i <= 24; i++) {
      const y = 1.3 - 0.52 - (i / 24) * 0.78;
      pts.push(new THREE.Vector3(Math.sin(i * 0.9) * 0.01, y, 0));
    }
    return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.1);
  }, []);
}

function Sketch({ p }: { p: P }) {
  const curve = useSketchCurve();
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 300, 0.008, 5, false), [curve]);
  useEffect(() => () => geo.dispose(), [geo]);
  const ref = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const total = geo.index!.count;

  useFrame(() => {
    if (!ref.current) return;
    const v = p.current;
    const draw = easeOutCubic(stage(v, 1));
    const visible = smoothstep(seg(stage(v, 1), 0, 0.2)) * (1 - smoothstep(seg(stage(v, 2), 0.2, 0.5)));
    ref.current.geometry.setDrawRange(0, Math.floor(total * draw));
    ref.current.visible = visible > 0.001 && draw > 0.001;
    mat.current.opacity = visible;
  });

  return (
    <mesh ref={ref} geometry={geo} position={[0, 0, 0]}>
      <meshStandardMaterial ref={mat} color="#B4607E" roughness={0.7} transparent opacity={0} />
    </mesh>
  );
}

/* ---------- the flower under construction ---------- */

const PETALS = 6;

function GrowingFlower({ p: pr }: { p: P }) {
  const stem = useRef<THREE.Mesh>(null!);
  const head = useRef<THREE.Group>(null!);
  const petalRefs = useRef<(THREE.Group | null)[]>([]);
  const leafRefs = useRef<(THREE.Group | null)[]>([]);
  const center = useRef<THREE.Mesh>(null!);
  const root = useRef<THREE.Group>(null!);

  const petalGeo = useMemo(() => makePetalGeometry(0.36, 0.95, 0.17, 3), []);
  const leafGeo = useMemo(() => makePetalGeometry(0.4, 1, 0.12, 9), []);
  useEffect(
    () => () => {
      petalGeo.dispose();
      leafGeo.dispose();
    },
    [petalGeo, leafGeo]
  );

  const H = 1.25;

  useFrame(({ clock }) => {
    const p = pr.current;
    const grow = easeOutCubic(stage(p, 2)); // stitch: stem rises
    const detail = stage(p, 3); // detail: petals/leaves/centre
    const pack = smoothstep(stage(p, 4)); // pack: lower into box
    const t = clock.elapsedTime;

    if (root.current) {
      // pack: the flower is laid down inside the box (stem 1.25 × 0.72 < box 1.0),
      // scaled a touch so the lid can close over it
      const lay = easeOutCubic(seg(pack, 0.35, 0.65));
      const sc = 1 - lay * 0.28;
      root.current.scale.setScalar(sc);
      root.current.position.set(lay * 0.42, lay * 0.14, 0);
      root.current.rotation.z = lay * -(Math.PI / 2 - 0.08) + (grow > 0.999 && lay < 0.01 ? Math.sin(t * 0.7) * 0.015 : 0);
      root.current.rotation.y = lay * 0.35;
      root.current.visible = grow > 0.001;
    }
    if (stem.current) {
      const h = Math.max(0.001, H * grow);
      stem.current.scale.y = h / H;
      stem.current.position.y = h / 2;
    }
    if (head.current) {
      head.current.position.y = H * grow;
      head.current.rotation.y = Math.sin(t * 0.3) * 0.05;
      head.current.rotation.x = BLOOM.face * 0.8;
    }
    for (let i = 0; i < PETALS; i++) {
      const g = petalRefs.current[i];
      if (!g) continue;
      const s = easeOutBack(seg(detail, i * 0.11, 0.35), 1.4);
      g.scale.setScalar(Math.max(0.001, s));
      g.visible = s > 0.002;
    }
    for (let i = 0; i < 2; i++) {
      const g = leafRefs.current[i];
      if (!g) continue;
      const s = easeOutBack(seg(detail, 0.55 + i * 0.12, 0.35), 1.2);
      g.scale.setScalar(Math.max(0.001, s));
      g.visible = s > 0.002;
    }
    if (center.current) {
      const s = easeOutBack(seg(detail, 0.8, 0.2), 1.6);
      center.current.scale.set(Math.max(0.001, s), Math.max(0.001, s) * BLOOM.center.squash, Math.max(0.001, s));
      center.current.visible = s > 0.002;
    }
  });

  return (
    <group ref={root}>
      <mesh ref={stem} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.028, H, 8]} />
        <primitive object={finish("yarn", PALETTE.sageDeep)} attach="material" />
      </mesh>
      {[0.42, 0.62].map((f, i) => (
        <group
          key={i}
          ref={(el) => {
            leafRefs.current[i] = el;
          }}
          position={[0, H * f, 0]}
          rotation={[0, rnd(i * 9 + 3) * Math.PI * 2, 0]}
        >
          <mesh geometry={leafGeo} rotation={[1.15, 0, 0.15]} scale={[0.55, 0.42, 0.55]} position={[0, 0.01, 0.03]}>
            <primitive object={finish("yarn", PALETTE.sage)} attach="material" />
          </mesh>
        </group>
      ))}
      <group ref={head}>
        {Array.from({ length: PETALS }).map((_, i) => {
          const j = rnd(3 + i * 3.7);
          return (
            <group
              key={i}
              ref={(el) => {
                petalRefs.current[i] = el;
              }}
              rotation={[0, (i / PETALS) * Math.PI * 2 + j * 0.4, 0]}
            >
              <mesh
                geometry={petalGeo}
                rotation={[BLOOM.outer.tilt + j * BLOOM.outer.tiltJitter, 0, 0]}
                position={[0, BLOOM.outer.lift, BLOOM.outer.out]}
                scale={[BLOOM.outer.width + j * BLOOM.outer.widthJitter, BLOOM.outer.scaleY, BLOOM.outer.scaleZ]}
              >
                <primitive object={finish("yarn", PALETTE.blush)} attach="material" />
              </mesh>
            </group>
          );
        })}
        <mesh ref={center} position={[0, BLOOM.center.lift, 0]}>
          <sphereGeometry args={[BLOOM.center.radius, 14, 12]} />
          <primitive object={finish("yarn", PALETTE.butter)} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- yarn ball + thread that feeds the stem ---------- */

const THREAD: [number, number, number][] = [
  [1.15, 0.24, 0.35],
  [0.9, 0.06, 0.5],
  [0.55, 0.03, 0.42],
  [0.25, 0.03, 0.2],
  [0.05, 0.03, 0.05],
  [0, 0.03, 0],
];

function FeedingYarn({ p: pr }: { p: P }) {
  const ball = useRef<THREE.Group>(null!);
  const thread = useRef<THREE.Mesh>(null!);
  const geo = useMemo(() => makeThreadGeometry(THREAD, 0.016), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const total = geo.index!.count;

  useFrame(() => {
    const p = pr.current;
    const intro = easeOutBack(stage(p, 0), 1.1); // yarn: ball arrives
    const feed = easeOutCubic(stage(p, 2)); // stitch: thread runs to the stem
    const pack = smoothstep(stage(p, 4)); // pack: yarn rolls away
    if (ball.current) {
      const s = Math.max(0.001, intro * (1 - pack));
      ball.current.scale.setScalar(s);
      ball.current.visible = s > 0.002;
      ball.current.rotation.z = -feed * 6; // spins as it feeds thread
      ball.current.position.x = 1.15 + pack * 1.2;
    }
    if (thread.current) {
      thread.current.geometry.setDrawRange(0, Math.floor(total * feed * (1 - pack)));
      thread.current.visible = feed > 0.001 && pack < 0.999;
    }
  });

  return (
    <>
      <group ref={ball} position={[1.15, 0.24, 0.35]} scale={0.001}>
        <YarnBall position={[0, 0, 0]} radius={0.24} color={PALETTE.blush} rings={11} seed={4} />
      </group>
      <mesh ref={thread} geometry={geo} visible={false}>
        <primitive object={finish("yarn", PALETTE.rose)} attach="material" />
      </mesh>
    </>
  );
}

/* ---------- pencil (design) and hook (stitch) — the tools of each stage ---------- */

function Tools({ p: pr }: { p: P }) {
  const pencil = useRef<THREE.Group>(null!);
  const hook = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const p = pr.current;
    const t = clock.elapsedTime;
    const design = stage(p, 1);
    const stitch = stage(p, 2);
    const detail = stage(p, 3);
    // pencil is present during design, leaves once stitching starts
    if (pencil.current) {
      const vis = smoothstep(seg(design, 0, 0.3)) * (1 - smoothstep(seg(stitch, 0, 0.3)));
      pencil.current.visible = vis > 0.002;
      pencil.current.scale.setScalar(Math.max(0.001, vis));
      // the pencil "draws": travels around the sketch as it appears
      const a = design * Math.PI * 2 * 1.02;
      const r = 0.42 + 0.22 * Math.cos(5 * a);
      pencil.current.position.set(Math.cos(a) * r + 0.02, 1.35 + Math.sin(a) * r + 0.36, 0.05);
      pencil.current.rotation.z = -0.5 + Math.sin(t * 2) * 0.04;
    }
    // hook works while stitching + detailing, then rests
    if (hook.current) {
      const vis = smoothstep(seg(stitch, 0, 0.25)) * (1 - smoothstep(seg(stage(p, 4), 0, 0.3)));
      hook.current.visible = vis > 0.002;
      hook.current.scale.setScalar(Math.max(0.001, vis));
      const working = stitch < 1 || detail < 1;
      const bob = working ? Math.sin(t * 6) * 0.03 : 0;
      hook.current.position.set(0.55, 0.42 + stitch * 0.7 + bob, 0.35);
      hook.current.rotation.z = Math.PI / 2 - 0.9 + (working ? Math.sin(t * 6 + 1) * 0.08 : 0);
    }
  });

  return (
    <>
      <group ref={pencil} visible={false}>
        {/* a stubby pencil: body, tip, eraser */}
        <mesh>
          <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
          <primitive object={finish("clay", PALETTE.butter)} attach="material" />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <coneGeometry args={[0.03, 0.1, 6]} />
          <primitive object={finish("wood", "#5B4A44")} attach="material" />
        </mesh>
        <mesh position={[0, 0.37, 0]}>
          <cylinderGeometry args={[0.031, 0.031, 0.06, 6]} />
          <primitive object={finish("satin", PALETTE.rose)} attach="material" />
        </mesh>
      </group>
      <group ref={hook} visible={false}>
        <Hook position={[0, 0, 0]} rotation={[0, 0.2, 0]} length={0.9} />
      </group>
    </>
  );
}

/* ---------- the gift box the flower is packed into ---------- */

function PackBox({ p: pr }: { p: P }) {
  const box = useRef<THREE.Group>(null!);
  const lid = useRef<THREE.Group>(null!);
  const bow = useRef<THREE.Group>(null!);

  useFrame(() => {
    const p = pr.current;
    const pack = stage(p, 4);
    const you = stage(p, 5);
    if (box.current) {
      const slide = easeOutCubic(seg(pack, 0, 0.5));
      box.current.position.z = THREE.MathUtils.lerp(2.6, 0, slide);
      box.current.visible = pack > 0.001;
    }
    if (lid.current) {
      // lid arrives from above once the flower has settled, closes in "you"
      const drop = easeOutCubic(seg(you, 0, 0.55));
      lid.current.position.y = THREE.MathUtils.lerp(2.4, 0.5, drop);
      lid.current.visible = you > 0.001;
    }
    if (bow.current) {
      const s = easeOutBack(seg(you, 0.6, 0.35), 1.6);
      bow.current.scale.setScalar(Math.max(0.001, s));
      bow.current.visible = s > 0.002;
    }
  });

  return (
    <group ref={box} visible={false}>
      {/* open box — four walls, no top */}
      <RoundedBox args={[1.0, 0.5, 0.7]} radius={0.04} smoothness={3} position={[0, 0.25, 0]}>
        <meshStandardMaterial color="#FFEDF2" roughness={0.7} side={THREE.BackSide} />
      </RoundedBox>
      <RoundedBox args={[1.04, 0.5, 0.74]} radius={0.04} smoothness={3} position={[0, 0.25, 0]}>
        <meshStandardMaterial color="#FFEDF2" roughness={0.7} side={THREE.FrontSide} transparent opacity={0.92} />
      </RoundedBox>
      {/* tissue paper peeking out */}
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0.2]}>
        <planeGeometry args={[0.95, 0.65]} />
        <meshStandardMaterial color={PALETTE.blushDeep} roughness={0.7} side={THREE.DoubleSide} transparent opacity={0.6} />
      </mesh>
      <group ref={lid} visible={false}>
        <RoundedBox args={[1.08, 0.14, 0.78]} radius={0.04} smoothness={3} position={[0, 0.07, 0]}>
          <primitive object={finish("clay", PALETTE.blush)} attach="material" />
        </RoundedBox>
        <mesh position={[0, 0.075, 0]}>
          <boxGeometry args={[0.08, 0.15, 0.8]} />
          <primitive object={finish("satin", PALETTE.strawberry)} attach="material" />
        </mesh>
        <mesh position={[0, 0.075, 0]}>
          <boxGeometry args={[1.1, 0.15, 0.08]} />
          <primitive object={finish("satin", PALETTE.strawberry)} attach="material" />
        </mesh>
        <group ref={bow} position={[0, 0.17, 0]} visible={false}>
          <SatinBow position={[0, 0.02, 0]} scale={1.2} />
        </group>
      </group>
    </group>
  );
}

/* ---------- camera: each stage has its own framing ---------- */

const FRAMES: { pos: [number, number, number]; look: [number, number, number] }[] = [
  { pos: [1.6, 1.1, 3.4], look: [0.6, 0.3, 0.2] }, // yarn — close on the ball
  { pos: [0.3, 1.5, 4.4], look: [0.15, 1.05, 0] }, // design — the sketch in the air (yarn ball still in frame)
  { pos: [0.9, 1.3, 3.9], look: [0.3, 0.7, 0] }, // stitch — stem + thread
  { pos: [0.3, 1.9, 3.2], look: [0, 1.25, 0] }, // detail — petals close-up
  { pos: [1.2, 1.7, 4.6], look: [0, 0.5, 0] }, // pack — wider, box arrives
  { pos: [0.4, 2.2, 5.6], look: [0, 0.6, 0] }, // you — pull back, the gift
];

function Camera({ p: pr, reduced }: { p: P; reduced: boolean }) {
  const { camera } = useThree();
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);
  const cur = useMemo(() => new THREE.Vector3(0, 1.2, 0), []);

  useFrame((state, dt) => {
    const x = pr.current * STAGES;
    const i = Math.min(STAGES - 1, Math.floor(x));
    const j = Math.min(STAGES - 1, i + 1);
    const f = smoothstep(x - i);
    pos.lerpVectors(a.fromArray(FRAMES[i].pos), b.fromArray(FRAMES[j].pos), f);
    look.lerpVectors(a.fromArray(FRAMES[i].look), b.fromArray(FRAMES[j].look), f);
    if (!reduced) {
      pos.x += state.pointer.x * 0.25;
      pos.y += state.pointer.y * 0.12;
    }
    const k = reduced ? 20 : 3.5;
    camera.position.x = damp(camera.position.x, pos.x, k, dt);
    camera.position.y = damp(camera.position.y, pos.y, k, dt);
    camera.position.z = damp(camera.position.z, pos.z, k, dt);
    cur.x = damp(cur.x, look.x, k, dt);
    cur.y = damp(cur.y, look.y, k, dt);
    cur.z = damp(cur.z, look.z, k, dt);
    camera.lookAt(cur);
  });
  return null;
}

/* ---------- scene ---------- */

/** Smooths the raw scroll progress into a ref every frame — no React re-renders. */
function useSmoothedProgress(progress: P, reduced: boolean): P {
  const p = useRef(0);
  useFrame((_, dt) => {
    const target = progress.current ?? 0;
    p.current = reduced ? target : damp(p.current, target, 6, dt);
  });
  return p;
}

function Scene({
  progress,
  reduced,
  density,
  shadowRes,
}: {
  progress: P;
  reduced: boolean;
  density: number;
  shadowRes: number;
}) {
  const p = useSmoothedProgress(progress, reduced);

  return (
    <>
      <StudioLights target={[0, 0.7, 0]} />
      <Camera p={p} reduced={reduced} />
      <SoftGround radius={2.6} />
      {density > 0.5 && <DustMotes count={Math.round(22 * density)} area={[3.2, 2.4, 2.2]} reduced={reduced} />}
      <FeedingYarn p={p} />
      <Sketch p={p} />
      <GrowingFlower p={p} />
      <Tools p={p} />
      <PackBox p={p} />
      <StudioShadows scale={7} far={2} opacity={0.3} resolution={shadowRes} />
    </>
  );
}

export default function ProcessScene({
  progress,
  active = true,
}: {
  progress: React.RefObject<number>;
  active?: boolean;
}) {
  const reduced = !!useReducedMotion();
  const quality = useQuality();
  return (
    <AdaptiveCanvas
      quality={quality}
      className="!absolute inset-0"
      frameloop={active ? "always" : "never"}
      camera={{ position: FRAMES[0].pos, fov: 34 }}
      aria-hidden="true"
    >
      <Scene progress={progress} reduced={reduced} density={quality.density} shadowRes={quality.shadowRes} />
    </AdaptiveCanvas>
  );
}
