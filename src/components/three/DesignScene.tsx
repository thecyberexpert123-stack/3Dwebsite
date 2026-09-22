"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import {
  makeCustomPetalGeometry,
  makeHeartGeometry,
  makeLeafGeometry,
  makePetalGeometry,
  makePointedPetalGeometry,
  makeStemCurve,
  makeStemGeometry,
  rnd,
} from "./geometry";
import { BLOOM } from "./CrochetFlower";
import { MIX_PALETTES, type DesignConfig } from "@/lib/design";
import { DustMotes, FallingPetals } from "./anim";
import { AdaptiveCanvas, Breeze, SoftGround, StudioLights, StudioShadows } from "./Stage";
import { Post } from "./Post";
import { useQuality } from "@/lib/quality";
import { create as createMat, syncSheen } from "./materials";
import { SatinBow } from "./parts";
import { applyYarnType, makePatternMaterial, PATTERN_ID, type PatternMaterial } from "./studioMaterials";

const damp = THREE.MathUtils.damp;

/* ================================================================
   Viewer state — what the UI (customer studio / admin viewer) drives
   besides the design itself. All optional; the homepage teaser passes
   nothing and gets the classic drag-to-spin preview.
   ================================================================ */

export type FocusId = "all" | "bloom" | "stem" | "wrap" | "extras";
export type PartId = "petals" | "centres" | "stems" | "leaves" | "wrap" | "ribbon" | "fillers" | "lights" | "extras" | "base";
export type BackdropId = "blush" | "sky" | "mint" | "dusk" | "paper";

export const PART_LABELS: Record<PartId, string> = {
  petals: "Petals",
  centres: "Centres",
  stems: "Stems",
  leaves: "Leaves",
  wrap: "Wrap",
  ribbon: "Ribbon & tag",
  fillers: "Fillers",
  lights: "Fairy lights",
  extras: "Butterflies & charms",
  base: "Base",
};

export const BACKDROPS: Record<BackdropId, { label: string; top: string; horizon: string; ground: string; key: number }> = {
  blush: { label: "Blush", top: "#FFD3E0", horizon: "#FFF4F7", ground: "#FFE6EE", key: 1.05 },
  sky: { label: "Sky", top: "#B9D8F5", horizon: "#EEF7FF", ground: "#E2EFFB", key: 1.1 },
  mint: { label: "Mint", top: "#C4E8D8", horizon: "#F0FBF5", ground: "#DDF3EA", key: 1.05 },
  dusk: { label: "Dusk", top: "#B9A4E3", horizon: "#FFD8C6", ground: "#E9D4E2", key: 0.95 },
  paper: { label: "Paper", top: "#FFFDF8", horizon: "#FFF6EC", ground: "#FBF1EA", key: 1.0 },
};

export type StudioView = {
  focus: FocusId;
  /** 0 = assembled, 1 = parts lifted apart (admin “exploded” view) */
  explode: number;
  wireframe: boolean;
  grid: boolean;
  hidden: PartId[];
  autoRotate: boolean;
  backdrop: BackdropId;
  /** full orbit + zoom (admin) instead of the mobile-safe drag-to-spin */
  orbit: boolean;
  /**
   * Where the subject should sit in the frame, in NDC-ish units
   * (-1…1). The studio uses it to keep the piece out from under the
   * option sheet: shifted right on desktop, up on phones. Only the
   * directed Rig honours it; free orbit ignores it.
   */
  shift?: [number, number];
  /**
   * Fraction of the viewport height that is free for the piece (between the
   * header and the lowest panel over the stage). Below 1 the directed Rig
   * backs the camera off by 1/fit (capped) so the whole piece fits the band
   * instead of running under the bar. Measured by the studio; free orbit
   * ignores it.
   */
  fit?: number;
};

export const DEFAULT_VIEW: StudioView = {
  focus: "all",
  explode: 0,
  wireframe: false,
  grid: false,
  hidden: [],
  autoRotate: true,
  backdrop: "blush",
  orbit: false,
};

type ViewCtx = { ex: React.RefObject<number>; hidden: Set<PartId>; reduced: boolean };
const StudioViewContext = createContext<ViewCtx>({ ex: { current: 0 }, hidden: new Set(), reduced: false });
const useView = () => useContext(StudioViewContext);

/* ================================================================
   Small building blocks
   ================================================================ */

/** Scale-in with a soft handmade "pop" (easeOutBack). Instant when reduced. */
function Pop({ children, delay = 0, reduced = false }: { children: React.ReactNode; delay?: number; reduced?: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  const progress = useRef(reduced ? 1 : -delay * 3.2);
  const done = useRef(reduced);
  useFrame((_, dt) => {
    if (done.current || !ref.current) return;
    progress.current = Math.min(1, progress.current + dt * 3.2);
    const t = Math.max(0, progress.current);
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const eased = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    ref.current.scale.setScalar(Math.max(0.001, eased));
    if (progress.current >= 1) {
      ref.current.scale.setScalar(1);
      done.current = true;
    }
  });
  return (
    <group ref={ref} scale={reduced ? 1 : 0.001}>
      {children}
    </group>
  );
}

/** A group that lifts by `amount` (world units) as the exploded view opens. */
function Explodable({ amount, children, ...rest }: { amount: [number, number, number]; children: React.ReactNode } & Omit<React.ComponentProps<"group">, "children">) {
  const ref = useRef<THREE.Group>(null!);
  const { ex } = useView();
  const base = useMemo(() => new THREE.Vector3(...((rest.position as [number, number, number]) ?? [0, 0, 0])), [rest.position]);
  useFrame(() => {
    if (!ref.current) return;
    const e = ex.current;
    ref.current.position.set(base.x + amount[0] * e, base.y + amount[1] * e, base.z + amount[2] * e);
  });
  return (
    <group {...rest} ref={ref}>
      {children}
    </group>
  );
}

/** Materials created once per flower; colours lerp toward live targets. */
function useFlowerMaterials(c: DesignConfig, petalHex: string) {
  const mats = useMemo(
    () => ({
      outer: makePatternMaterial(petalHex),
      inner: makePatternMaterial(petalHex),
      center: createMat("yarn", c.centerColor),
      centerDark: createMat("yarn", "#3A2E33"),
      stem: createMat("yarn", c.stemColor),
      leaf: createMat("yarn", c.leafColor),
    }),
    // created once per instance mount — targets update via refs below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const targets = useRef({
    outer: new THREE.Color(petalHex),
    inner: new THREE.Color(petalHex),
    accent: new THREE.Color(c.accentColor),
    center: new THREE.Color(c.centerColor),
    stem: new THREE.Color(c.stemColor),
    leaf: new THREE.Color(c.leafColor),
  });

  useEffect(() => {
    const t = targets.current;
    t.outer.set(petalHex);
    t.inner.set(petalHex).multiplyScalar(0.88);
    t.accent.set(c.accentColor);
    t.center.set(c.centerColor);
    t.stem.set(c.stemColor);
    t.leaf.set(c.leafColor);
  }, [petalHex, c.accentColor, c.centerColor, c.stemColor, c.leafColor]);

  useEffect(() => {
    const id = PATTERN_ID[c.petalPattern];
    mats.outer.uniformsX.uPattern.value = id;
    mats.inner.uniformsX.uPattern.value = id;
    const sp = c.sparkle ? 1 : 0;
    mats.outer.uniformsX.uSparkle.value = sp;
    mats.inner.uniformsX.uSparkle.value = sp;
    for (const m of [mats.outer, mats.inner, mats.center, mats.leaf]) applyYarnType(m, c.yarn, m.color);
    mats.center.needsUpdate = true;
  }, [c.petalPattern, c.sparkle, c.yarn, mats]);

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
    },
    [mats]
  );

  useFrame(({ clock }, dt) => {
    const k = 1 - Math.exp(-5 * dt);
    const t = targets.current;
    mats.outer.color.lerp(t.outer, k);
    mats.inner.color.lerp(t.inner, k);
    mats.outer.uniformsX.uAccent.value.lerp(t.accent, k);
    mats.inner.uniformsX.uAccent.value.lerp(t.accent, k);
    mats.center.color.lerp(t.center, k);
    mats.stem.color.lerp(t.stem, k);
    mats.leaf.color.lerp(t.leaf, k);
    mats.outer.uniformsX.uTime.value = clock.elapsedTime;
    mats.inner.uniformsX.uTime.value = clock.elapsedTime;
    if (c.yarn === "cotton") {
      syncSheen(mats.outer);
      syncSheen(mats.inner);
      syncSheen(mats.center);
    }
  });

  return mats;
}

/* ================================================================
   Petal rings — one InstancedMesh per ring, matrices rewritten each
   frame for the flutter (same recipe as CrochetFlower).
   ================================================================ */

type RingSpec = { count: number; tilt: number; tiltJitter: number; width: number; scaleY: number; scaleZ: number; lift: number; out: number; phase: number };

const OPEN_MUL = { bud: 0.2, half: 0.6, open: 1 } as const;
const SIZE_MUL = { petite: 0.82, regular: 1, full: 1.2 } as const;

function ringSpecs(c: DesignConfig): RingSpec[] {
  const open = OPEN_MUL[c.openness];
  const sz = SIZE_MUL[c.petalSize];
  return Array.from({ length: c.petalLayers }, (_, i) => {
    const o = BLOOM.outer;
    const count = Math.max(3, c.petalCount - i);
    return {
      count,
      tilt: (o.tilt - i * 0.36) * open + (1 - open) * 0.12,
      tiltJitter: o.tiltJitter * (0.6 + 0.4 * open),
      width: (o.width - i * 0.1) * sz,
      scaleY: (o.scaleY - i * 0.06) * sz,
      scaleZ: o.scaleZ * sz,
      lift: i * 0.018,
      out: (o.out - i * 0.012) * (0.5 + 0.5 * open),
      phase: i * 0.5,
    };
  });
}

function Ring({
  spec,
  geo,
  material,
  seed,
  ringIndex,
  reduced,
  tipsOut,
}: {
  spec: RingSpec;
  geo: THREE.BufferGeometry;
  material: THREE.Material;
  seed: number;
  ringIndex: number;
  reduced: boolean;
  /** receives the world-ish (head-local) tip positions — used for pearl pins */
  tipsOut?: React.RefObject<THREE.Vector3[]>;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), rot: new THREE.Matrix4(), m: new THREE.Matrix4(), tip: new THREE.Vector3() }), []);
  const layout = useMemo(
    () =>
      Array.from({ length: spec.count }, (_, i) => {
        const j = rnd(seed + ringIndex * 20 + i * 3.7);
        return { angle: (i / spec.count) * Math.PI * 2 + spec.phase + j * 0.4, tilt: spec.tilt + j * spec.tiltJitter, width: spec.width + j * 0.1 * SIZE_MUL.regular };
      }),
    [spec, seed, ringIndex]
  );

  const write = (flutter: (i: number) => number) => {
    const m = mesh.current;
    if (!m) return;
    const { o, rot, mat, tip } = { ...tmp, mat: tmp.m };
    for (let i = 0; i < layout.length; i++) {
      const p = layout[i];
      o.position.set(0, spec.lift, spec.out);
      o.rotation.set(p.tilt + flutter(i), 0, 0);
      o.scale.set(p.width, spec.scaleY, spec.scaleZ);
      o.updateMatrix();
      rot.makeRotationY(p.angle);
      mat.multiplyMatrices(rot, o.matrix);
      m.setMatrixAt(i, mat);
      if (tipsOut?.current) {
        tip.set(0, 0.95, 0).applyMatrix4(mat);
        (tipsOut.current[i] ??= new THREE.Vector3()).copy(tip);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    write(() => 0);
    mesh.current?.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, geo]);

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.elapsedTime;
    write((i) => Math.sin(t * (0.9 + ringIndex * 0.15) + i * 1.3 + seed) * 0.05);
  });

  return <instancedMesh key={`${spec.count}`} ref={mesh} args={[geo, material, spec.count]} frustumCulled={false} />;
}

/* ================================================================
   Centres
   ================================================================ */

function Centre({ c, mats, reduced }: { c: DesignConfig; mats: ReturnType<typeof useFlowerMaterials>; reduced: boolean }) {
  const r = BLOOM.center.radius * SIZE_MUL[c.petalSize];
  const knots = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const knotCount = 9;
  useLayoutEffect(() => {
    const m = knots.current;
    if (!m) return;
    for (let i = 0; i < knotCount; i++) {
      const a = (i / knotCount) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * r * 0.72, BLOOM.center.lift + r * 0.45, Math.sin(a) * r * 0.72);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [c.centerStyle, r, dummy]);

  const pom = useRef<THREE.Group>(null!);
  const tufts = useRef<THREE.InstancedMesh>(null!);
  const TUFTS = 26;
  useLayoutEffect(() => {
    const m = tufts.current;
    if (!m) return;
    for (let i = 0; i < TUFTS; i++) {
      // fibonacci sphere → evenly spread tufts
      const y = 1 - (i / (TUFTS - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      dummy.position.set(Math.cos(th) * rad, y, Math.sin(th) * rad).multiplyScalar(r * 1.0);
      dummy.scale.setScalar(0.8 + rnd(i * 3.3) * 0.5);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [c.centerStyle, r, dummy]);
  useFrame(({ clock }) => {
    if (reduced || !pom.current) return;
    pom.current.rotation.y = clock.elapsedTime * 0.3;
  });

  switch (c.centerStyle) {
    case "knots":
      return (
        <group>
          <mesh material={mats.center} position={[0, BLOOM.center.lift, 0]} scale={[1, BLOOM.center.squash, 1]}>
            <sphereGeometry args={[r, 14, 12]} />
          </mesh>
          <instancedMesh ref={knots} args={[undefined, undefined, knotCount]} material={mats.centerDark} frustumCulled={false}>
            <sphereGeometry args={[r * 0.2, 8, 8]} />
          </instancedMesh>
        </group>
      );
    case "button":
      return (
        <group position={[0, BLOOM.center.lift, 0]}>
          <mesh material={mats.center} scale={[1, 0.34, 1]}>
            <sphereGeometry args={[r * 1.15, 18, 10]} />
          </mesh>
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
            <mesh key={i} material={mats.centerDark} position={[x * r * 0.32, r * 0.36, z * r * 0.32]}>
              <sphereGeometry args={[r * 0.11, 8, 8]} />
            </mesh>
          ))}
        </group>
      );
    case "pompom":
      // a pompom is a cloud of yarn ends: a core plus a shell of little tufts
      return (
        <group ref={pom} position={[0, BLOOM.center.lift + r * 0.35, 0]}>
          <mesh material={mats.center}>
            <icosahedronGeometry args={[r * 1.05, 2]} />
          </mesh>
          <instancedMesh ref={tufts} args={[undefined, undefined, TUFTS]} material={mats.center} frustumCulled={false}>
            <sphereGeometry args={[r * 0.3, 7, 6]} />
          </instancedMesh>
        </group>
      );
    default:
      return (
        <mesh material={mats.center} position={[0, BLOOM.center.lift, 0]} scale={[1, BLOOM.center.squash, 1]}>
          <sphereGeometry args={[r, 14, 12]} />
        </mesh>
      );
  }
}

/* ================================================================
   Little extras: butterflies, ladybird, bee, pearls, tag
   ================================================================ */

function Butterfly({ color, seed, reduced, ...rest }: { color: string; seed: number; reduced: boolean } & React.ComponentProps<"group">) {
  const left = useRef<THREE.Group>(null!);
  const right = useRef<THREE.Group>(null!);
  const wing = useMemo(() => makePetalGeometry(0.5, 0.9, 0.05, seed + 31), [seed]);
  const hind = useMemo(() => makePetalGeometry(0.38, 0.6, 0.05, seed + 32), [seed]);
  const mat = useMemo(() => createMat("yarn", color), []); // eslint-disable-line react-hooks/exhaustive-deps
  const body = useMemo(() => createMat("yarn", "#4A3238"), []);
  const target = useRef(new THREE.Color(color));
  useEffect(() => void target.current.set(color), [color]);
  useEffect(
    () => () => {
      wing.dispose();
      hind.dispose();
      mat.dispose();
      body.dispose();
    },
    [wing, hind, mat, body]
  );
  useFrame(({ clock }, dt) => {
    mat.color.lerp(target.current, 1 - Math.exp(-5 * dt));
    syncSheen(mat);
    if (reduced) return;
    // a perched butterfly: slow, uneven wing beats with long pauses
    const t = clock.elapsedTime * 0.9 + seed;
    const cycle = Math.max(0, Math.sin(t * 1.4) * 0.5 + Math.sin(t * 0.37) * 0.5);
    const a = 0.35 + cycle * 0.95;
    if (left.current) left.current.rotation.y = -a;
    if (right.current) right.current.rotation.y = a;
  });
  return (
    <group {...rest}>
      <group ref={left} rotation={[0, -0.7, 0]}>
        <mesh geometry={wing} material={mat} rotation={[0, 0, Math.PI / 2 + 0.3]} position={[-0.01, 0.02, 0]} />
        <mesh geometry={hind} material={mat} rotation={[0, 0, Math.PI / 2 + 1.35]} position={[-0.01, -0.02, 0]} />
      </group>
      <group ref={right} rotation={[0, 0.7, 0]}>
        <mesh geometry={wing} material={mat} rotation={[0, 0, -Math.PI / 2 - 0.3]} position={[0.01, 0.02, 0]} />
        <mesh geometry={hind} material={mat} rotation={[0, 0, -Math.PI / 2 - 1.35]} position={[0.01, -0.02, 0]} />
      </group>
      <mesh material={body} scale={[0.035, 0.09, 0.035]} rotation={[0.2, 0, 0]}>
        <sphereGeometry args={[1, 10, 10]} />
      </mesh>
    </group>
  );
}

function Ladybird(props: React.ComponentProps<"group">) {
  const shell = useMemo(() => createMat("satin", "#D9483F"), []);
  const dark = useMemo(() => createMat("satin", "#2A2226"), []);
  useEffect(
    () => () => {
      shell.dispose();
      dark.dispose();
    },
    [shell, dark]
  );
  return (
    <group {...props}>
      <mesh material={shell} scale={[1, 0.6, 1.2]}>
        <sphereGeometry args={[0.045, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={dark} position={[0, 0.005, 0.05]} scale={[1, 0.6, 0.7]}>
        <sphereGeometry args={[0.03, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {[[-0.02, 0.026, -0.01], [0.022, 0.024, 0.0], [-0.012, 0.02, -0.035], [0.015, 0.02, -0.032]].map((p, i) => (
        <mesh key={i} material={dark} position={p as [number, number, number]}>
          <sphereGeometry args={[0.007, 6, 6]} />
        </mesh>
      ))}
    </group>
  );
}

function Bee({ reduced, ...rest }: { reduced: boolean } & React.ComponentProps<"group">) {
  const root = useRef<THREE.Group>(null!);
  const wings = useRef<THREE.Group>(null!);
  const gold = useMemo(() => createMat("yarn", "#F2CD5C"), []);
  const dark = useMemo(() => createMat("yarn", "#3A2E33"), []);
  const wing = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.55, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false }), []);
  useEffect(
    () => () => {
      gold.dispose();
      dark.dispose();
      wing.dispose();
    },
    [gold, dark, wing]
  );
  useFrame(({ clock }) => {
    if (reduced || !root.current) return;
    const t = clock.elapsedTime;
    // hovers beside the bloom in a tiny figure-of-eight
    root.current.position.x = Math.sin(t * 0.9) * 0.05;
    root.current.position.y = Math.sin(t * 1.7) * 0.03;
    root.current.rotation.y = Math.sin(t * 0.9) * 0.6;
    if (wings.current) wings.current.rotation.x = Math.sin(t * 40) * 0.5;
  });
  return (
    <group {...rest}>
      <group ref={root}>
        <mesh material={gold} scale={[0.045, 0.04, 0.065]}>
          <sphereGeometry args={[1, 14, 12]} />
        </mesh>
        {[-0.012, 0.014].map((z, i) => (
          <mesh key={i} material={dark} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.041, 0.008, 8, 18]} />
          </mesh>
        ))}
        <mesh material={dark} position={[0, 0, -0.058]}>
          <sphereGeometry args={[0.018, 10, 10]} />
        </mesh>
        <group ref={wings} position={[0, 0.035, 0]}>
          <mesh material={wing} position={[-0.03, 0, 0]} rotation={[-Math.PI / 2, 0, 0.3]}>
            <circleGeometry args={[0.03, 12]} />
          </mesh>
          <mesh material={wing} position={[0.03, 0, 0]} rotation={[-Math.PI / 2, 0, -0.3]}>
            <circleGeometry args={[0.03, 12]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function Pearls({ tips, count }: { tips: React.RefObject<THREE.Vector3[]>; count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pearl = useMemo(() => createMat("pearl", "#FFFBF5"), []);
  useEffect(() => () => pearl.dispose(), [pearl]);
  useFrame(() => {
    const m = mesh.current;
    const pts = tips.current;
    if (!m || !pts) return;
    for (let i = 0; i < count; i++) {
      const p = pts[i];
      if (!p) continue;
      dummy.position.copy(p);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} material={pearl} frustumCulled={false}>
      <sphereGeometry args={[0.02, 10, 10]} />
    </instancedMesh>
  );
}

/** Text tag drawn once into a canvas (heart or round card) hanging on a thread. */
function Tag({ c, reduced, ...rest }: { c: DesignConfig; reduced: boolean } & React.ComponentProps<"group">) {
  const swing = useRef<THREE.Group>(null!);
  const tex = useMemo(() => {
    const S = 256;
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = c.tag === "heart" ? "#F7C9D6" : "#FFF8EE";
    ctx.strokeStyle = "#D8849C";
    ctx.lineWidth = 6;
    if (c.tag === "heart") {
      ctx.beginPath();
      const k = S / 2;
      ctx.moveTo(k, S * 0.86);
      ctx.bezierCurveTo(S * 0.06, S * 0.55, S * 0.1, S * 0.12, k, S * 0.3);
      ctx.bezierCurveTo(S * 0.9, S * 0.12, S * 0.94, S * 0.55, k, S * 0.86);
      ctx.closePath();
    } else {
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, S * 0.42, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#4A3238";
    ctx.beginPath();
    ctx.arc(S / 2, S * (c.tag === "heart" ? 0.33 : 0.16), 7, 0, Math.PI * 2);
    ctx.fill();
    const text = c.tagText || "♥";
    const hand = (typeof getComputedStyle === "function" ? getComputedStyle(document.documentElement).getPropertyValue("--font-hand") : "") || "cursive";
    let size = 46;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    do {
      ctx.font = `600 ${size}px ${hand}`;
      size -= 3;
    } while (ctx.measureText(text).width > S * 0.62 && size > 16);
    ctx.fillStyle = "#B8456F";
    ctx.fillText(text, S / 2, S * (c.tag === "heart" ? 0.52 : 0.52));
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [c.tag, c.tagText]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9, side: THREE.DoubleSide, alphaTest: 0.4 }), [tex]);
  useEffect(
    () => () => {
      tex.dispose();
      mat.dispose();
    },
    [tex, mat]
  );
  const thread = useMemo(() => createMat("yarn", "#B8456F"), []);
  useEffect(() => () => thread.dispose(), [thread]);
  useFrame(({ clock }) => {
    if (reduced || !swing.current) return;
    swing.current.rotation.z = Math.sin(clock.elapsedTime * 1.3) * 0.12;
    swing.current.rotation.y = Math.sin(clock.elapsedTime * 0.7) * 0.25;
  });
  return (
    <group {...rest}>
      <group ref={swing}>
        <mesh material={thread} position={[0, -0.07, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.14, 6]} />
        </mesh>
        <mesh material={mat} position={[0, -0.24, 0]}>
          <planeGeometry args={[0.24, 0.24]} />
        </mesh>
      </group>
    </group>
  );
}

/* ================================================================
   The configurable flower
   ================================================================ */

type StudioFlowerProps = {
  config: DesignConfig;
  position: [number, number, number];
  /** local Y of the blossom head (0 → floating bloom with tucked leaves) */
  headY: number;
  petalColor: string;
  seed: number;
  reduced: boolean;
  /** which extras this flower carries (bouquets spread them across flowers) */
  extras: { butterfly: boolean; charm: boolean };
};

function StudioFlower({ config: c, position, headY, petalColor, seed, reduced, extras }: StudioFlowerProps) {
  const head = useRef<THREE.Group>(null!);
  const { hidden } = useView();
  const mats = useFlowerMaterials(c, petalColor);
  const sz = SIZE_MUL[c.petalSize];

  const roundedGeo = useMemo(() => makePetalGeometry(0.36, 0.95, 0.17, seed), [seed]);
  const pointedGeo = useMemo(() => makePointedPetalGeometry(0.2, seed + 3), [seed]);
  const customGeo = useMemo(
    () => (c.petalShape === "custom" && c.customPetal ? makeCustomPetalGeometry(c.customPetal, seed + 11) : null),
    [c.petalShape, c.customPetal, seed]
  );
  const leafGeo = useMemo(() => {
    if (c.leafShape === "heart") {
      const g = makeHeartGeometry(seed + 7);
      g.scale(0.5, 0.5, 0.12);
      g.rotateZ(Math.PI); // tip away from the stem (+Y)
      g.translate(0, 0.32, 0);
      return g;
    }
    return makeLeafGeometry(c.leafShape === "broad" ? 0.56 : 0.34, 1, 0.1, seed + 7);
  }, [seed, c.leafShape]);
  const geo = customGeo ?? (c.petalShape === "pointed" ? pointedGeo : roundedGeo);

  const stemCurve = useMemo(() => makeStemCurve(Math.max(headY, 0.01), seed, c.stemCurve === "curvy" ? 0.16 : 0.012), [headY, seed, c.stemCurve]);
  const stemGeo = useMemo(() => makeStemGeometry(stemCurve, 0.024), [stemCurve]);
  const top = useMemo(() => stemCurve.getPoint(1), [stemCurve]);
  const leafAnchors = useMemo(
    () =>
      [0.38, 0.62].slice(0, c.leaves).map((f, i) => ({ p: stemCurve.getPoint(f), yaw: rnd(seed + i * 9) * Math.PI * 2, scale: 0.5 + rnd(seed + i * 4.4) * 0.12 })),
    [stemCurve, seed, c.leaves]
  );

  useEffect(
    () => () => {
      roundedGeo.dispose();
      pointedGeo.dispose();
      customGeo?.dispose();
      leafGeo.dispose();
      stemGeo.dispose();
    },
    [roundedGeo, pointedGeo, customGeo, leafGeo, stemGeo]
  );

  const specs = useMemo(() => ringSpecs(c), [c]);
  const tips = useRef<THREE.Vector3[]>([]);

  useFrame(({ clock }) => {
    if (reduced || !head.current) return;
    const t = clock.elapsedTime;
    head.current.rotation.z = Math.sin(t * 0.6 + seed * 2.1) * 0.035;
    head.current.rotation.x = BLOOM.face * 0.7 + Math.sin(t * 0.42 + seed * 1.3) * 0.02;
  });

  const ringKey = `${c.petalShape}-${c.petalCount}-${c.petalLayers}-${c.openness}-${c.petalSize}`;
  const floating = headY <= 0.05;
  const headPos: [number, number, number] = floating ? [0, 0, 0] : [top.x, top.y, top.z];

  return (
    <group position={position}>
      {/* stem + leaves (skipped for floating blooms) */}
      {!floating && !hidden.has("stems") && (
        <Pop key={`stem-${headY.toFixed(2)}-${c.stemCurve}`} reduced={reduced}>
          <mesh geometry={stemGeo} material={mats.stem} />
        </Pop>
      )}
      {!floating && !hidden.has("leaves") && (
        <Pop key={`leaves-${c.leaves}-${c.leafShape}`} delay={0.05} reduced={reduced}>
          {leafAnchors.map((a, i) => (
            <Explodable key={i} amount={[Math.cos(a.yaw) * 0.25, 0.05, Math.sin(a.yaw) * 0.25]} position={[a.p.x, a.p.y, a.p.z]} rotation={[0, a.yaw, 0]}>
              <mesh geometry={leafGeo} material={mats.leaf} rotation={[1.05 + i * 0.1, 0, 0.12]} scale={[a.scale * 1.1, a.scale * 0.9, a.scale * 1.1]} position={[0, 0.01, 0.02]} />
              {extras.charm && c.charm === "ladybird" && i === 0 && <Ladybird position={[0.02, 0.05, 0.22]} rotation={[-0.9, 0.4, 0]} />}
            </Explodable>
          ))}
        </Pop>
      )}
      {floating && !hidden.has("leaves") &&
        Array.from({ length: c.leaves }).map((_, i) => (
          <group key={i} position={[0, -0.07, 0]} rotation={[Math.PI - 1.2, (i / Math.max(c.leaves, 1)) * Math.PI * 2, 0]}>
            <mesh geometry={leafGeo} material={mats.leaf} scale={[0.56, 0.45, 0.56]} />
          </group>
        ))}

      {/* blossom head */}
      <Explodable amount={[0, 0.45, 0]} position={headPos}>
        <group ref={head} rotation={[BLOOM.face * 0.7, 0, 0]}>
          {!hidden.has("petals") &&
            specs.map((spec, i) => (
              <Pop key={`ring-${i}-${ringKey}`} delay={i * 0.09} reduced={reduced}>
                <Ring spec={spec} geo={geo} material={i === 0 ? mats.outer : mats.inner} seed={seed} ringIndex={i} reduced={reduced} tipsOut={i === 0 ? tips : undefined} />
              </Pop>
            ))}
          {!hidden.has("centres") && (
            <Pop key={`centre-${c.centerStyle}`} delay={0.12} reduced={reduced}>
              <Centre c={c} mats={mats} reduced={reduced} />
            </Pop>
          )}
          {!hidden.has("extras") && extras.charm && c.charm === "pearls" && <Pearls tips={tips} count={specs[0].count} />}
          {!hidden.has("extras") && extras.charm && c.charm === "bee" && <Bee reduced={reduced} position={[0.3 * sz, 0.16, 0.12]} />}
          {!hidden.has("extras") && extras.charm && c.charm === "ladybird" && (floating || c.leaves === 0) && (
            <Ladybird position={[0.12 * sz, 0.09, 0.14 * sz]} rotation={[-0.5, 0.6, 0]} />
          )}
          {!hidden.has("extras") && extras.butterfly && (
            <Explodable amount={[0, 0.5, 0]} position={[-0.06 * sz, 0.1 + 0.04 * sz, 0.1 * sz]}>
              <Butterfly color={c.butterflyColor} seed={seed} reduced={reduced} rotation={[-0.4, 0.5, 0]} scale={0.8} />
            </Explodable>
          )}
        </group>
      </Explodable>
    </group>
  );
}

/* ================================================================
   Bouquet parts: wrap, ribbon, fillers, fairy lights
   ================================================================ */

function useLerpColour(mat: THREE.MeshStandardMaterial, hex: string, sheen = false) {
  const target = useRef(new THREE.Color(hex));
  useEffect(() => void target.current.set(hex), [hex]);
  useFrame((_, dt) => {
    mat.color.lerp(target.current, 1 - Math.exp(-5 * dt));
    if (sheen) syncSheen(mat);
  });
}

function BouquetWrap({ c, reduced }: { c: DesignConfig; reduced: boolean }) {
  const { hidden } = useView();
  const sheer = c.wrapStyle === "sheer";
  const outer = useMemo(
    () =>
      sheer
        ? new THREE.MeshPhysicalMaterial({ color: c.wrapColor, transparent: true, opacity: 0.42, roughness: 0.35, clearcoat: 0.4, side: THREE.DoubleSide, depthWrite: false })
        : createMat("paper", c.wrapColor, { side: THREE.FrontSide }),
    [sheer] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const inner = useMemo(() => createMat("paper", c.wrapInnerColor, { side: THREE.BackSide }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const ribbon = useMemo(() => createMat("satin", c.ribbonColor), []); // eslint-disable-line react-hooks/exhaustive-deps
  useLerpColour(outer, c.wrapColor);
  useLerpColour(inner, c.wrapInnerColor);
  useLerpColour(ribbon, c.ribbonColor, true);
  useEffect(
    () => () => {
      outer.dispose();
      inner.dispose();
      ribbon.dispose();
    },
    [outer, inner, ribbon]
  );

  const fold = c.wrapStyle === "fold";
  const ribbonY = fold ? 0.4 : 0.46;
  return (
    <group>
      {!hidden.has("wrap") && (
        <Explodable amount={[0, -0.55, 0]}>
          <Pop key={`wrap-${c.wrapStyle}`} reduced={reduced}>
            {/* kraft cone gathered tight at the neck — stems emerge at radius ≈ 0.12 */}
            <mesh position={[0, 0.38, 0]} material={outer}>
              <cylinderGeometry args={[fold ? 0.4 : 0.36, 0.13, 0.76, 22, 1, true]} />
            </mesh>
            {!sheer && (
              <mesh position={[0, 0.38, 0]} material={inner}>
                <cylinderGeometry args={[fold ? 0.4 : 0.36, 0.13, 0.76, 22, 1, true]} />
              </mesh>
            )}
            {fold && (
              <>
                {/* folded-down collar shows the lining */}
                <mesh position={[0, 0.66, 0]} material={inner}>
                  <cylinderGeometry args={[0.36, 0.46, 0.22, 22, 1, true]} />
                </mesh>
                <mesh position={[0, 0.66, 0]} material={outer}>
                  <cylinderGeometry args={[0.355, 0.455, 0.22, 22, 1, true]} />
                </mesh>
              </>
            )}
            {sheer && (
              /* sheer wraps are two layers of tulle, offset a little */
              <mesh position={[0, 0.4, 0]} rotation={[0, 0.5, 0.04]} material={outer}>
                <cylinderGeometry args={[0.4, 0.14, 0.78, 22, 1, true]} />
              </mesh>
            )}
          </Pop>
        </Explodable>
      )}
      {!hidden.has("ribbon") && (
        <Explodable amount={[0, 0.25, 0.3]}>
          <Pop key={`ribbon-${c.ribbonStyle}`} delay={0.08} reduced={reduced}>
            {c.ribbonStyle === "band" ? (
              <mesh position={[0, ribbonY, 0]} material={ribbon}>
                <cylinderGeometry args={[0.285, 0.265, 0.09, 28, 1, true]} />
              </mesh>
            ) : (
              <mesh position={[0, ribbonY, 0]} rotation={[Math.PI / 2, 0, 0]} material={ribbon}>
                <torusGeometry args={[0.27, 0.03, 10, 28]} />
              </mesh>
            )}
            {c.ribbonStyle === "double" && (
              <mesh position={[0, ribbonY - 0.09, 0]} rotation={[Math.PI / 2, 0, 0]} material={ribbon}>
                <torusGeometry args={[0.25, 0.03, 10, 28]} />
              </mesh>
            )}
            {c.ribbonStyle !== "band" && <SatinBow position={[0, ribbonY + 0.04, 0.31]} rotation={[0.55, 0, 0]} scale={0.8} color={c.ribbonColor} />}
            {c.ribbonStyle === "double" && <SatinBow position={[0.05, ribbonY - 0.06, 0.3]} rotation={[0.55, 0, -0.3]} scale={0.62} color={c.ribbonColor} />}
            {c.tag !== "none" && <Tag c={c} reduced={reduced} position={[0.16, ribbonY, 0.26]} />}
          </Pop>
        </Explodable>
      )}
    </group>
  );
}

/** Gypsophila (clouds of tiny white dots) and eucalyptus (round leaves on
 *  thin stems) — two instanced meshes each, spread between the flowers. */
function Fillers({ c, reduced, headBase }: { c: DesignConfig; reduced: boolean; headBase: number }) {
  const { hidden } = useView();
  const gyp = c.fillers === "gypsophila" || c.fillers === "both";
  const euc = c.fillers === "eucalyptus" || c.fillers === "both";
  const gypDots = useRef<THREE.InstancedMesh>(null!);
  const gypStems = useRef<THREE.InstancedMesh>(null!);
  const eucLeaves = useRef<THREE.InstancedMesh>(null!);
  const eucStems = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const white = useMemo(() => createMat("yarn", "#FFFBF5"), []);
  const green = useMemo(() => createMat("yarn", "#8FA98A"), []);
  const sageLeaf = useMemo(() => createMat("yarn", "#A9C3B0"), []);
  useEffect(
    () => () => {
      white.dispose();
      green.dispose();
      sageLeaf.dispose();
    },
    [white, green, sageLeaf]
  );

  const N_G = 7;
  const DOTS = 7;
  const N_E = 5;
  const EL = 6;
  const sprigs = useMemo(
    () =>
      Array.from({ length: Math.max(N_G, N_E) }, (_, i) => {
        const a = (i / Math.max(N_G, N_E)) * Math.PI * 2 + 1.1;
        const r = 0.34 + rnd(i * 5.1 + 3) * 0.1;
        const h = headBase + 0.12 + rnd(i * 7.3 + 5) * 0.28;
        return { x: Math.cos(a) * r, z: Math.sin(a) * r, h, a };
      }),
    [headBase]
  );

  useLayoutEffect(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const from = new THREE.Vector3();
    const to = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const dir = new THREE.Vector3();
    const stem = (mesh: THREE.InstancedMesh | null, idx: number, s: (typeof sprigs)[number]) => {
      if (!mesh) return;
      from.set(0, 0.35, 0);
      to.set(s.x, s.h, s.z);
      dir.subVectors(to, from);
      const len = dir.length();
      q.setFromUnitVectors(up, dir.normalize());
      dummy.position.lerpVectors(from, to, 0.5);
      dummy.quaternion.copy(q);
      dummy.scale.set(1, len, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
      mesh.instanceMatrix.needsUpdate = true;
    };
    if (gyp) {
      for (let i = 0; i < N_G; i++) {
        const s = sprigs[i];
        stem(gypStems.current, i, s);
        for (let d = 0; d < DOTS; d++) {
          const k = i * DOTS + d;
          dummy.position.set(s.x + (rnd(k * 1.7) - 0.5) * 0.11, s.h + (rnd(k * 2.3) - 0.3) * 0.1, s.z + (rnd(k * 3.1) - 0.5) * 0.11);
          dummy.quaternion.identity();
          dummy.scale.setScalar(0.7 + rnd(k * 4.7) * 0.6);
          dummy.updateMatrix();
          gypDots.current?.setMatrixAt(k, dummy.matrix);
        }
      }
      if (gypDots.current) gypDots.current.instanceMatrix.needsUpdate = true;
    }
    if (euc) {
      for (let i = 0; i < N_E; i++) {
        const s = sprigs[(i * 2 + 1) % sprigs.length];
        const s2 = { ...s, x: s.x * 1.12, z: s.z * 1.12, h: s.h + 0.06 };
        stem(eucStems.current, i, s2);
        for (let l = 0; l < EL; l++) {
          const k = i * EL + l;
          const f = 0.45 + (l / EL) * 0.55;
          dummy.position.set(s2.x * f, 0.35 + (s2.h - 0.35) * f, s2.z * f);
          dummy.rotation.set(Math.PI / 2 + (rnd(k) - 0.5) * 0.6, s2.a + (l % 2 ? 1.2 : -1.2), 0);
          dummy.scale.setScalar(0.8 + rnd(k * 2.1) * 0.5);
          dummy.updateMatrix();
          eucLeaves.current?.setMatrixAt(k, dummy.matrix);
        }
      }
      if (eucLeaves.current) eucLeaves.current.instanceMatrix.needsUpdate = true;
    }
  }, [gyp, euc, sprigs, dummy]);

  const group = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (reduced || !group.current) return;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.7) * 0.01;
  });

  if (hidden.has("fillers") || (!gyp && !euc)) return null;
  return (
    <Explodable amount={[0, 0.3, 0]}>
      <group ref={group}>
        <Pop key={`fill-${c.fillers}`} delay={0.1} reduced={reduced}>
          {gyp && (
            <>
              <instancedMesh ref={gypStems} args={[undefined, undefined, N_G]} material={green} frustumCulled={false}>
                <cylinderGeometry args={[0.006, 0.008, 1, 5]} />
              </instancedMesh>
              <instancedMesh ref={gypDots} args={[undefined, undefined, N_G * DOTS]} material={white} frustumCulled={false}>
                <sphereGeometry args={[0.022, 8, 8]} />
              </instancedMesh>
            </>
          )}
          {euc && (
            <>
              <instancedMesh ref={eucStems} args={[undefined, undefined, N_E]} material={green} frustumCulled={false}>
                <cylinderGeometry args={[0.007, 0.009, 1, 5]} />
              </instancedMesh>
              <instancedMesh ref={eucLeaves} args={[undefined, undefined, N_E * EL]} material={sageLeaf} frustumCulled={false}>
                <circleGeometry args={[0.055, 10]} />
              </instancedMesh>
            </>
          )}
        </Pop>
      </group>
    </Explodable>
  );
}

const LIGHT_COLOR = new THREE.Color("#FFE2A8").multiplyScalar(2.6); // > 1 so Bloom picks it up

function FairyLights({ reduced, headBase, radius }: { reduced: boolean; headBase: number; radius: number }) {
  const { hidden } = useView();
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const wire = useRef<THREE.Mesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const N = 22;
  const pts = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1);
      const a = f * Math.PI * 4.2 + 0.6;
      const r = radius * (0.55 + 0.5 * Math.sin(f * Math.PI));
      out.push(new THREE.Vector3(Math.cos(a) * r, headBase - 0.2 + f * 0.62, Math.sin(a) * r));
    }
    return out;
  }, [headBase, radius]);
  const wireGeo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.004, 5, false), [pts]);
  const wireMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#C9B58A", roughness: 0.6 }), []);
  const bulb = useMemo(() => new THREE.MeshBasicMaterial({ color: LIGHT_COLOR, toneMapped: false }), []);
  useEffect(
    () => () => {
      wireGeo.dispose();
      wireMat.dispose();
      bulb.dispose();
    },
    [wireGeo, wireMat, bulb]
  );
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = reduced ? 0 : clock.elapsedTime;
    for (let i = 0; i < N; i++) {
      dummy.position.copy(pts[i]);
      dummy.scale.setScalar(0.8 + 0.35 * Math.sin(t * 2.4 + i * 1.7));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  if (hidden.has("lights")) return null;
  return (
    <Explodable amount={[0, 0.65, 0]}>
      <mesh ref={wire} geometry={wireGeo} material={wireMat} userData={{ noShadow: true }} />
      <instancedMesh ref={mesh} args={[undefined, undefined, N]} material={bulb} frustumCulled={false} userData={{ noShadow: true }}>
        <sphereGeometry args={[0.018, 8, 8]} />
      </instancedMesh>
    </Explodable>
  );
}

/* ================================================================
   Bases for a single stemmed flower
   ================================================================ */

function Base({ c, reduced }: { c: DesignConfig; reduced: boolean }) {
  const { hidden } = useView();
  const clay = useMemo(() => createMat("clay", c.baseColor), []); // eslint-disable-line react-hooks/exhaustive-deps
  const soil = useMemo(() => createMat("yarn", "#6B4E3D"), []);
  const glass = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: "#EAF6FF", transparent: true, opacity: 0.32, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false }),
    []
  );
  const water = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#CFE9F7", transparent: true, opacity: 0.5, roughness: 0.1, depthWrite: false }), []);
  useLerpColour(clay, c.baseColor);
  useEffect(
    () => () => {
      clay.dispose();
      soil.dispose();
      glass.dispose();
      water.dispose();
    },
    [clay, soil, glass, water]
  );
  const vaseGeo = useMemo(() => {
    const pts = [0, 0.05, 0.12, 0.2, 0.28, 0.34, 0.4].map((y, i) => new THREE.Vector2([0.14, 0.2, 0.22, 0.19, 0.12, 0.1, 0.13][i], y));
    return new THREE.LatheGeometry(pts, 26);
  }, []);
  useEffect(() => () => vaseGeo.dispose(), [vaseGeo]);

  if (hidden.has("base") || c.base === "none") return null;
  return (
    <Explodable amount={[0, -0.45, 0]}>
      <Pop key={`base-${c.base}`} reduced={reduced}>
        {c.base === "jar" && (
          <group>
            <mesh material={glass} position={[0, 0.17, 0]}>
              <cylinderGeometry args={[0.16, 0.15, 0.34, 26, 1, true]} />
            </mesh>
            <mesh material={glass} position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.15, 26]} />
            </mesh>
            <mesh material={glass} position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.15, 0.012, 8, 26]} />
            </mesh>
            <mesh material={water} position={[0, 0.11, 0]}>
              <cylinderGeometry args={[0.145, 0.14, 0.2, 26]} />
            </mesh>
          </group>
        )}
        {c.base === "vase" && <mesh geometry={vaseGeo} material={clay} />}
        {c.base === "pot" && (
          <group>
            <mesh material={clay} position={[0, 0.14, 0]}>
              <cylinderGeometry args={[0.2, 0.15, 0.28, 26]} />
            </mesh>
            <mesh material={clay} position={[0, 0.29, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.05, 26]} />
            </mesh>
            <mesh material={soil} position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.19, 0.19, 0.04, 26]} />
            </mesh>
          </group>
        )}
      </Pop>
    </Explodable>
  );
}

/* ================================================================
   Drag-to-spin — mobile-safe (vertical swipes still scroll the page)
   ================================================================ */

function SpinGroup({ children, reduced, autoRotate }: { children: React.ReactNode; reduced: boolean; autoRotate: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  const { gl } = useThree();
  const velocity = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastInteract = useRef(0);

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "pan-y";
    const onDown = (e: PointerEvent) => {
      dragging.current = true;
      lastX.current = e.clientX;
      lastInteract.current = performance.now();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || !ref.current) return;
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      velocity.current = dx * 0.006;
      ref.current.rotation.y += dx * 0.006;
      lastInteract.current = performance.now();
    };
    const onUp = () => {
      dragging.current = false;
      lastInteract.current = performance.now();
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [gl]);

  useFrame((_, dt) => {
    if (!ref.current) return;
    if (!dragging.current) {
      ref.current.rotation.y += velocity.current;
      velocity.current *= Math.exp(-3.5 * dt);
      const idle = performance.now() - lastInteract.current > 2600;
      if (!reduced && autoRotate && idle && Math.abs(velocity.current) < 0.0006) {
        ref.current.rotation.y += dt * 0.3; // gentle idle turn
      }
    }
  });

  return <group ref={ref}>{children}</group>;
}

/* ================================================================
   Scene assembly
   ================================================================ */

const PIECE_SCALE = { mini: 0.86, regular: 1, grand: 1.14 } as const;

/** Framing (scale + y offset) so single blooms and bouquets both sit nicely. */
function framingFor(config: DesignConfig): { scale: number; y: number } {
  const s = PIECE_SCALE[config.size];
  if (config.type === "bouquet") {
    return { scale: (config.bouquetCount >= 7 ? 0.88 : 0.98) * s, y: -0.05 };
  }
  if (config.stem === "tall") return { scale: 1.02 * s, y: -0.05 };
  if (config.stem === "short") return { scale: 1.45 * s, y: 0.05 };
  return { scale: 2.2 * s, y: 0.25 }; // floating bloom
}

type FrameInfo = { headY: number; scale: number; y: number };

function Scene({ config, reduced, view, frame }: { config: DesignConfig; reduced: boolean; view: StudioView; frame: React.RefObject<FrameInfo> }) {
  const scaler = useRef<THREE.Group>(null!);
  const lifter = useRef<THREE.Group>(null!);
  const framing = framingFor(config);
  const isBouquet = config.type === "bouquet";

  const flowers = useMemo(() => {
    if (!isBouquet) {
      const headY = config.stem === "none" ? 0 : config.stem === "short" ? 0.72 : 1.32;
      const baseLift = config.base === "none" ? 0 : config.base === "pot" ? 0.3 : config.base === "vase" ? 0.36 : 0.05;
      const localY = config.stem === "none" ? 0.35 : baseLift;
      return [{ key: "solo", a: 0, tilt: 0, position: [0, localY, 0] as [number, number, number], headY, seed: 7 }];
    }
    const n = config.bouquetCount;
    // real bouquets are *gathered*: stems meet inside the wrap's neck
    // (radius ≈ 0.1) and fan outward so the heads spread into a dome
    const spread = config.arrangement === "tight" ? 0.78 : config.arrangement === "loose" ? 1.3 : 1;
    const radius = (n <= 3 ? 0.07 : n <= 5 ? 0.1 : 0.12) * spread;
    const headRing = (n <= 3 ? 0.24 : n <= 5 ? 0.32 : n <= 7 ? 0.4 : 0.46) * spread;
    const base = config.stem === "tall" ? 1.25 : 0.95;
    const jitter = config.arrangement === "loose" ? 0.42 : config.arrangement === "tight" ? 0.16 : 0.3;
    return Array.from({ length: n }).map((_, i) => {
      const a = (i / n) * Math.PI * 2 + 0.4;
      // the dome: the centre flower (last, when odd) stands tallest
      const centre = n % 2 === 1 && i === n - 1;
      const rr = centre ? 0.02 : radius;
      const ring = centre ? 0.02 : headRing;
      const headY = base + (centre ? 0.34 : rnd(i + 41) * jitter);
      const tilt = -Math.atan2(ring - rr, headY);
      return { key: `b${i}`, a, tilt, headY, seed: i + 1, position: [Math.cos(a) * rr, 0, Math.sin(a) * rr] as [number, number, number] };
    });
  }, [isBouquet, config.bouquetCount, config.stem, config.arrangement, config.base]);

  const headBase = useMemo(() => flowers.reduce((m, f) => Math.max(m, f.headY + f.position[1]), 0), [flowers]);

  // smooth framing transitions when the type/stem changes
  useFrame((_, dt) => {
    if (scaler.current) scaler.current.scale.setScalar(damp(scaler.current.scale.x, framing.scale, 4, dt));
    if (lifter.current) lifter.current.position.y = damp(lifter.current.position.y, framing.y, 4, dt);
    if (frame.current) {
      frame.current.headY = framing.y + framing.scale * headBase;
      frame.current.scale = framing.scale;
      frame.current.y = framing.y;
    }
  });

  const palette = MIX_PALETTES[config.mixPalette].colors;
  const butterflyOn = new Set<number>();
  for (let i = 0; i < config.butterflies; i++) butterflyOn.add(isBouquet ? [flowers.length - 1, 1][i] ?? i : 0);

  return (
    <group ref={lifter}>
      <group ref={scaler}>
        <SpinGroup reduced={reduced} autoRotate={view.autoRotate && !view.orbit}>
          {isBouquet && config.wrap && <BouquetWrap c={config} reduced={reduced} />}
          {isBouquet && <Fillers c={config} reduced={reduced} headBase={headBase * 0.92} />}
          {isBouquet && config.fairyLights && <FairyLights reduced={reduced} headBase={headBase} radius={config.arrangement === "loose" ? 0.5 : 0.42} />}
          {!isBouquet && <Base c={config} reduced={reduced} />}
          {flowers.map((f, i) => {
            const flower = (
              <StudioFlower
                key={isBouquet ? `${config.bouquetCount}-${f.key}` : f.key}
                config={config}
                position={isBouquet ? [0, 0, 0] : f.position}
                headY={f.headY}
                petalColor={isBouquet && config.mixColors ? palette[i % palette.length] : config.petalColor}
                seed={f.seed}
                reduced={reduced}
                extras={{ butterfly: butterflyOn.has(i), charm: i === (isBouquet ? flowers.length - 1 : 0) }}
              />
            );
            if (!isBouquet) return flower;
            return (
              <group key={`${config.bouquetCount}-${f.key}-pos`} position={f.position} rotation={[0, -f.a, 0]}>
                <group rotation={[0, 0, f.tilt]}>{flower}</group>
              </group>
            );
          })}
        </SpinGroup>
      </group>
    </group>
  );
}

/** Camera: every option group has a home framing, the lens glides there
 *  (never cuts) — a barely-there drift toward the pointer keeps it alive. */
function Rig({ reduced, focus, frame, active, bloomMul = 1, shift, fit = 1 }: { reduced: boolean; focus: FocusId; frame: React.RefObject<FrameInfo>; active: boolean; bloomMul?: number; shift?: [number, number]; fit?: number }) {
  const { camera, pointer } = useThree();
  const size = useThree((st) => st.size);
  const sx = shift?.[0] ?? 0;
  const sy = shift?.[1] ?? 0;
  const applied = useRef<[number, number]>([0, 0]);
  // re-apply after a resize (R3F rebuilds the projection on size change)
  useEffect(() => {
    applied.current = [NaN, NaN];
  }, [size.width, size.height]);
  useEffect(
    () => () => {
      (camera as THREE.PerspectiveCamera).clearViewOffset?.();
    },
    [camera]
  );
  const look = useMemo(() => new THREE.Vector3(0, 0.9, 0), []);
  const goal = useMemo(() => ({ pos: new THREE.Vector3(0.6, 1.7, 4.6), look: new THREE.Vector3(0, 0.9, 0) }), []);
  useFrame((_, dt) => {
    if (!active) return;
    const h = frame.current?.headY ?? 1.2;
    switch (focus) {
      case "bloom": {
        // distance scales with how big the head actually renders
        const d = 2.9 * Math.max(1, frame.current?.scale ?? 1) * bloomMul;
        goal.pos.set(0.3, h + 0.2 * d, d);
        goal.look.set(0, h + 0.02, 0);
        break;
      }
      case "stem":
        goal.pos.set(0.8, h * 0.55 + 0.2, 3.4);
        goal.look.set(0, h * 0.42, 0);
        break;
      case "wrap":
        goal.pos.set(0.45, 1.0, 3.1);
        goal.look.set(0, 0.5, 0);
        break;
      case "extras": {
        const d = 2.9 * (bloomMul > 1.2 ? 1.25 : 1);
        goal.pos.set(1.0, h + 0.55, d);
        goal.look.set(0, h * 0.8, 0);
        break;
      }
      default: {
        // the whole piece: back off for bigger blooms / bigger bouquets
        const d = 4.6 * (bloomMul > 1.2 ? 1.18 : bloomMul > 1.05 ? 1.08 : 1);
        goal.pos.set(0.6, 1.7, d);
        goal.look.set(0, 0.9, 0);
      }
    }
    // fit: the studio's panels leave only `fit` of the height free — back off
    // along the same line of sight so the whole piece fits that band
    const k = Math.min(1.6, Math.max(1, 1 / Math.max(0.3, fit)));
    if (k > 1) {
      goal.pos.x *= k;
      goal.pos.y = goal.look.y + (goal.pos.y - goal.look.y) * k;
      goal.pos.z *= k;
    }
    const px = reduced ? 0 : pointer.x * 0.3;
    const py = reduced ? 0 : pointer.y * 0.15;
    camera.position.x = damp(camera.position.x, goal.pos.x + px, 2.2, dt);
    camera.position.y = damp(camera.position.y, goal.pos.y + py, 2.2, dt);
    camera.position.z = damp(camera.position.z, goal.pos.z, 2.2, dt);
    look.x = damp(look.x, goal.look.x, 2.2, dt);
    look.y = damp(look.y, goal.look.y, 2.2, dt);
    look.z = damp(look.z, goal.look.z, 2.2, dt);
    camera.lookAt(look);
    // frame shift: slide the projection window instead of the camera so the
    // subject moves in the frame without changing the angle we look at it
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.isPerspectiveCamera) {
      const a = applied.current;
      const nx = damp(Number.isNaN(a[0]) ? sx : a[0], sx, 3, dt);
      const ny = damp(Number.isNaN(a[1]) ? sy : a[1], sy, 3, dt);
      if (Math.abs(nx - a[0]) > 1e-4 || Math.abs(ny - a[1]) > 1e-4 || Number.isNaN(a[0])) {
        a[0] = nx;
        a[1] = ny;
        if (Math.abs(nx) < 1e-3 && Math.abs(ny) < 1e-3) cam.clearViewOffset();
        else cam.setViewOffset(size.width, size.height, -nx * size.width * 0.5, ny * size.height * 0.5, size.width, size.height);
      }
    }
  });
  return null;
}

/** Soft gradient sky dome for the opaque (full-page) studio. */
function Backdrop({ id }: { id: BackdropId }) {
  const b = BACKDROPS[id];
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { uTop: { value: new THREE.Color(b.top) }, uHorizon: { value: new THREE.Color(b.horizon) } },
        vertexShader: `varying float vH; void main(){ vH = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; varying float vH; void main(){ float t = smoothstep(-0.05, 0.75, vH); gl_FragColor = vec4(mix(uHorizon, uTop, t), 1.0); }`,
      }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const target = useRef({ top: new THREE.Color(b.top), horizon: new THREE.Color(b.horizon) });
  useEffect(() => {
    target.current.top.set(b.top);
    target.current.horizon.set(b.horizon);
  }, [b]);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-4 * dt);
    mat.uniforms.uTop.value.lerp(target.current.top, k);
    mat.uniforms.uHorizon.value.lerp(target.current.horizon, k);
  });
  useEffect(() => () => mat.dispose(), [mat]);
  // layer 1 = main camera only: the dome must never enter shadow/depth passes
  const { camera } = useThree();
  useEffect(() => {
    camera.layers.enable(1);
  }, [camera]);
  return (
    <mesh material={mat} userData={{ noShadow: true }} frustumCulled={false} layers={1}>
      <sphereGeometry args={[30, 24, 16]} />
    </mesh>
  );
}

/** Toggles wireframe on every material in the canvas (admin x-ray). */
function Wireframe({ on }: { on: boolean }) {
  const { scene } = useThree();
  useEffect(() => {
    const touched: THREE.Material[] = [];
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (!m || (o as THREE.Mesh).userData.noShadow) return;
      for (const mm of Array.isArray(m) ? m : [m]) {
        if ("wireframe" in mm) {
          (mm as THREE.MeshStandardMaterial).wireframe = on;
          touched.push(mm);
        }
      }
    });
    return () => touched.forEach((mm) => ((mm as THREE.MeshStandardMaterial).wireframe = false));
  });
  return null;
}

/** Exposes a PNG capture of the current frame (rendered on demand). */
function Capture({ captureRef }: { captureRef?: React.RefObject<(() => string | null) | null> }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (!captureRef) return;
    captureRef.current = () => {
      gl.render(scene, camera);
      try {
        return gl.domElement.toDataURL("image/png");
      } catch {
        return null;
      }
    };
    return () => {
      captureRef.current = null;
    };
  }, [gl, scene, camera, captureRef]);
  return null;
}

/**
 * The Design Studio scene — a fully configurable crochet flower/bouquet.
 * Drag to spin (mobile-safe), gentle idle turn, animated transitions for
 * every control: colours lerp, petals/stems pop in, framing glides.
 *
 * `opaque` (full-page studio / admin): own gradient backdrop + the AAA
 * post stack (AO + bloom for fairy lights and glitter).
 */
export default function DesignScene({
  config,
  view: viewIn,
  opaque = false,
  className,
  captureRef,
}: {
  config: DesignConfig;
  view?: Partial<StudioView>;
  opaque?: boolean;
  className?: string;
  captureRef?: React.RefObject<(() => string | null) | null>;
}) {
  const reduce = !!useReducedMotion();
  const quality = useQuality();
  const view: StudioView = { ...DEFAULT_VIEW, ...viewIn };
  const ex = useRef(0);
  const frame = useRef<FrameInfo>({ headY: 1.2, scale: 1, y: 0 });
  const [ctx, setCtx] = useState<ViewCtx>({ ex, hidden: new Set(view.hidden), reduced: reduce });
  const hiddenKey = view.hidden.join(",");
  useEffect(() => {
    setCtx({ ex, hidden: new Set(view.hidden), reduced: reduce });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenKey, reduce]);

  const bd = BACKDROPS[view.backdrop];

  return (
    <AdaptiveCanvas
      statsLabel="studio"
      quality={quality}
      className={className ?? "!absolute inset-0 cursor-grab active:cursor-grabbing"}
      camera={{ position: [0.6, 1.7, 4.6], fov: 33 }}
      gl={opaque ? { alpha: false, preserveDrawingBuffer: !!captureRef } : { preserveDrawingBuffer: !!captureRef }}
      aria-hidden="true"
    >
      <StudioViewContext.Provider value={ctx}>
        <ExplodeDriver target={view.explode} ex={ex} />
        {opaque && <Backdrop id={view.backdrop} />}
        {opaque && <fog attach="fog" args={[bd.horizon, 9, 26]} />}
        <StudioLights target={[0, 0.8, 0]} keyIntensity={1.05 * (opaque ? bd.key : 1)} />
        <Breeze reduced={reduce}>
          <Scene config={config} reduced={reduce} view={view} frame={frame} />
          <DustMotes count={Math.round(16 * quality.density)} area={[4.5, 2.6, 2.5]} size={0.035} reduced={reduce} />
          {!quality.simple && <FallingPetals count={Math.max(3, Math.round(5 * quality.density))} area={[3.2, 2.6, 1.8]} reduced={reduce} />}
        </Breeze>
        {view.orbit ? (
          <OrbitControls makeDefault target={[0, 0.9, 0]} enableDamping dampingFactor={0.08} minDistance={1.2} maxDistance={9} maxPolarAngle={Math.PI * 0.55} autoRotate={view.autoRotate && !reduce} autoRotateSpeed={0.6} />
        ) : (
          <Rig reduced={reduce} focus={view.focus} frame={frame} active bloomMul={SIZE_MUL[config.petalSize] * (config.type === "bouquet" ? 1.25 : 1)} shift={view.shift} fit={view.fit} />
        )}
        <group position={[0, -0.15, 0]}>
          <SoftGround radius={opaque ? 4 : 2.2} color={opaque ? bd.ground : "#FFE9EF"} />
        </group>
        {view.grid && <Grid position={[0, -0.145, 0]} args={[10, 10]} cellSize={0.25} cellThickness={0.6} cellColor="#E9B7C8" sectionSize={1} sectionThickness={1.1} sectionColor="#B8456F" fadeDistance={9} fadeStrength={1.2} infiniteGrid />}
        <StudioShadows position={[0, -0.15, 0]} opacity={0.28} scale={8} far={2.5} resolution={quality.shadowRes} />
        <Wireframe on={view.wireframe} />
        {opaque && <Post quality={quality} aoRadius={0.26} aoIntensity={1.4} bloomIntensity={0.7} vignette={0.2} />}
        <Capture captureRef={captureRef} />
      </StudioViewContext.Provider>
    </AdaptiveCanvas>
  );
}

function ExplodeDriver({ target, ex }: { target: number; ex: React.RefObject<number> }) {
  useFrame((_, dt) => {
    ex.current = damp(ex.current, target, 5, dt);
  });
  return null;
}
