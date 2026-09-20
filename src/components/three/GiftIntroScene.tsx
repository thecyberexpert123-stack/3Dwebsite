"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useQuality } from "@/lib/quality";
import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic, seg } from "@/lib/intro";
import { makeHeartGeometry, rnd } from "./geometry";
import { CrochetFlower, PALETTE } from "./CrochetFlower";
import { AdaptiveCanvas, SoftGround, StudioLights, StudioShadows } from "./Stage";
import { shared as finish } from "./materials";

const damp = THREE.MathUtils.damp;

/**
 * THE UNWRAPPING — the surprise at the door.
 *
 * A plump clay gift box waits on a candy-pink stage. Tap the bow (or press
 * "Unwrap") and one directed sequence plays on a local clock:
 *
 *   0.00  bow loops shrink, tails drop            (the knot gives)
 *   0.25  lid pops, tilts and floats up & back    (anticipation → release)
 *   0.35  warm glow blooms inside the box
 *   0.40  hearts + confetti burst upward          (payoff)
 *   0.40  a little crochet bouquet springs up out of the box — the surprise
 *         is the product; the hero then grows the same bouquet in full
 *   0.55  camera pushes in toward the opening     (we go *into* the gift…)
 *   1.15  `onOpened` → the curtain irises out     (…and land on the site)
 *
 * The box is also useful: while the visitor looks at it, the hero scene
 * compiles its shaders behind the curtain, so the hand-off is instant.
 */

type Phase = "idle" | "opening";

/* ---------- confetti: one instanced draw call ---------- */

const CONFETTI_COLORS = [
  PALETTE.rose,
  PALETTE.blush,
  PALETTE.lavenderDeep,
  PALETTE.mint,
  PALETTE.butter,
  PALETTE.sky,
  PALETTE.strawberry,
  PALETTE.white,
];

function Confetti({ count, openedAt }: { count: number; openedAt: React.RefObject<number> }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = rnd(i * 3.1) * Math.PI * 2;
        const r = 0.6 + rnd(i * 7.7) * 1.6;
        return {
          vx: Math.cos(a) * r,
          vz: Math.sin(a) * r * 0.7,
          vy: 2.6 + rnd(i * 1.3) * 2.2,
          spin: (rnd(i * 5.9) - 0.5) * 14,
          size: 0.045 + rnd(i * 2.2) * 0.05,
          delay: rnd(i * 9.4) * 0.12,
          color: new THREE.Color(CONFETTI_COLORS[i % CONFETTI_COLORS.length]),
        };
      }),
    [count]
  );

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    parts.forEach((p, i) => m.setColorAt(i, p.color));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [parts]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const since = openedAt.current < 0 ? -1 : performance.now() / 1000 - openedAt.current - 0.4;
    if (since < 0) {
      m.visible = false;
      return;
    }
    m.visible = true;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const t = Math.max(0, since - p.delay);
      const x = p.vx * t * 0.9;
      const y = 0.55 + p.vy * t - 4.2 * t * t; // launch, then gravity
      const z = p.vz * t * 0.9;
      const life = clamp01(1 - t / 1.8);
      dummy.position.set(x, Math.max(y, -0.4), z);
      dummy.rotation.set(t * p.spin * 0.6, t * p.spin, i);
      dummy.scale.setScalar(Math.max(0.0001, p.size * (t < 0.08 ? t / 0.08 : 1) * life));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} visible={false} frustumCulled={false}>
      <planeGeometry args={[1, 0.6]} />
      <meshStandardMaterial roughness={0.6} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

/* ---------- hearts: fewer, bigger, slower than confetti ---------- */

function Hearts({ count, openedAt }: { count: number; openedAt: React.RefObject<number> }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const geo = useMemo(() => makeHeartGeometry(31), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colors = [PALETTE.rose, PALETTE.strawberry, PALETTE.blushDeep, PALETTE.lavenderDeep, PALETTE.white];
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        vx: (rnd(i * 4.4 + 1) - 0.5) * 2.2,
        vz: (rnd(i * 6.6 + 2) - 0.5) * 1.2,
        vy: 2.2 + rnd(i * 2.8 + 3) * 1.6,
        spin: (rnd(i * 1.7 + 4) - 0.5) * 5,
        size: 0.14 + rnd(i * 3.3 + 5) * 0.12,
        delay: rnd(i * 8.8 + 6) * 0.15,
        color: new THREE.Color(colors[i % colors.length]),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count]
  );

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    parts.forEach((p, i) => m.setColorAt(i, p.color));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [parts]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const since = openedAt.current < 0 ? -1 : performance.now() / 1000 - openedAt.current - 0.42;
    if (since < 0) {
      m.visible = false;
      return;
    }
    m.visible = true;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const t = Math.max(0, since - p.delay);
      dummy.position.set(p.vx * t, 0.5 + p.vy * t - 2.6 * t * t, p.vz * t);
      dummy.rotation.set(0.2, t * p.spin, Math.sin(t * 4 + i) * 0.3);
      const pop = t < 0.12 ? easeOutBack(t / 0.12, 1.6) : 1;
      dummy.scale.setScalar(Math.max(0.0001, p.size * pop * clamp01(1 - (t - 0.9) / 0.9)));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geo, undefined, count]} visible={false} frustumCulled={false}>
      <meshStandardMaterial roughness={0.55} />
    </instancedMesh>
  );
}

/* ---------- the gift ---------- */

function Bow({ untie }: { untie: React.RefObject<number> }) {
  const loops = useRef<THREE.Group>(null!);
  const tailL = useRef<THREE.Mesh>(null!);
  const tailR = useRef<THREE.Mesh>(null!);
  const knot = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const u = untie.current; // 0 tied … 1 undone
    const t = clock.elapsedTime;
    if (loops.current) {
      const s = 1 - easeOutCubic(u);
      // idle: the loops breathe like satin catching light
      const breathe = u <= 0 ? 1 + Math.sin(t * 2.1) * 0.035 : 1;
      loops.current.scale.set(Math.max(0.001, s * breathe), Math.max(0.001, s * breathe), Math.max(0.001, s));
    }
    if (knot.current) knot.current.scale.setScalar(Math.max(0.001, 1 - easeOutCubic(u)));
    const drop = easeOutCubic(u);
    if (tailL.current) {
      tailL.current.rotation.z = 0.55 + drop * 1.1;
      tailL.current.position.y = -0.02 - drop * 0.25;
      tailL.current.rotation.x = u <= 0 ? Math.sin(t * 1.7) * 0.08 : 0; // idle hint: the tail flutters
    }
    if (tailR.current) {
      tailR.current.rotation.z = -0.55 - drop * 1.1;
      tailR.current.position.y = -0.02 - drop * 0.25;
      tailR.current.rotation.x = u <= 0 ? Math.sin(t * 1.7 + 1.3) * 0.08 : 0;
    }
  });

  const ribbon = <primitive object={finish("satin", PALETTE.strawberry)} attach="material" />;

  return (
    <group position={[0, 0.06, 0]}>
      <group ref={loops}>
        {/* two fat satin loops */}
        <mesh position={[-0.2, 0.09, 0]} rotation={[Math.PI / 2, 0, 0.45]} scale={[1, 0.62, 1]}>
          <torusGeometry args={[0.17, 0.062, 12, 26]} />
          {ribbon}
        </mesh>
        <mesh position={[0.2, 0.09, 0]} rotation={[Math.PI / 2, 0, -0.45]} scale={[1, 0.62, 1]}>
          <torusGeometry args={[0.17, 0.062, 12, 26]} />
          {ribbon}
        </mesh>
      </group>
      <mesh ref={knot} position={[0, 0.09, 0]}>
        <sphereGeometry args={[0.085, 14, 14]} />
        <primitive object={finish("pearl", PALETTE.white)} attach="material" />
      </mesh>
      {/* tails */}
      <mesh ref={tailL} position={[-0.09, -0.02, 0.1]} rotation={[0, 0, 0.55]}>
        <boxGeometry args={[0.09, 0.42, 0.02]} />
        {ribbon}
      </mesh>
      <mesh ref={tailR} position={[0.09, -0.02, 0.1]} rotation={[0, 0, -0.55]}>
        <boxGeometry args={[0.09, 0.42, 0.02]} />
        {ribbon}
      </mesh>
    </group>
  );
}

function Gift({
  phase,
  openedAt,
  onTap,
  reduced,
}: {
  phase: Phase;
  openedAt: React.RefObject<number>;
  onTap: () => void;
  reduced: boolean;
}) {
  const root = useRef<THREE.Group>(null!);
  const lid = useRef<THREE.Group>(null!);
  const glow = useRef<THREE.Mesh>(null!);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null!);
  const light = useRef<THREE.PointLight>(null!);
  const bloom = useRef<THREE.Group>(null!);
  const untie = useRef(0);
  const [hover, setHover] = useState(false);
  const { gl } = useThree();

  useEffect(() => {
    gl.domElement.style.cursor = hover && phase === "idle" ? "pointer" : "default";
    return () => {
      gl.domElement.style.cursor = "default";
    };
  }, [hover, phase, gl]);

  useFrame((state, dt) => {
    const g = root.current;
    if (!g) return;
    const now = performance.now() / 1000;
    const since = openedAt.current < 0 ? -1 : now - openedAt.current;
    const t = state.clock.elapsedTime;

    if (since < 0) {
      // idle: a slow breath + a little bob; a nudge toward the pointer says "touch me"
      const motion = reduced ? 0 : 1;
      const breath = 1 + Math.sin(t * 1.6) * 0.018 * motion;
      const target = hover ? 1.05 : 1;
      const s = damp(g.scale.x, target * breath, 6, dt);
      g.scale.setScalar(s);
      g.position.y = Math.sin(t * 1.1) * 0.02 * motion;
      g.rotation.y = damp(g.rotation.y, state.pointer.x * 0.25 * motion + Math.sin(t * 0.5) * 0.06 * motion, 3, dt);
      g.rotation.x = damp(g.rotation.x, -state.pointer.y * 0.08 * motion, 3, dt);
      untie.current = 0;
      return;
    }

    // opening sequence
    untie.current = seg(since, 0, 0.32);
    // the box gives a little squash-and-stretch as the lid pops
    const squash = Math.sin(clamp01(since / 0.35) * Math.PI) * 0.06;
    g.scale.set(1 + squash, 1 - squash * 0.8, 1 + squash);
    g.rotation.y = damp(g.rotation.y, 0, 4, dt);
    g.rotation.x = damp(g.rotation.x, 0, 4, dt);

    if (lid.current) {
      const p = seg(since, 0.25, 0.7);
      const e = easeOutCubic(p);
      lid.current.position.y = 0.36 + e * 1.35 + (p >= 1 ? Math.sin(t * 2) * 0.02 : 0);
      lid.current.position.z = -e * 0.35;
      lid.current.rotation.x = -e * 0.9;
      lid.current.rotation.z = Math.sin(p * Math.PI) * 0.25;
    }
    if (glow.current && glowMat.current) {
      const p = seg(since, 0.35, 0.9);
      glow.current.visible = p > 0;
      glow.current.scale.setScalar(0.05 + easeOutCubic(p) * 1.4);
      glowMat.current.opacity = 0.9 * (1 - p * 0.7);
    }
    if (light.current) light.current.intensity = easeOutCubic(seg(since, 0.3, 0.5)) * 6;
    if (bloom.current) {
      // the surprise inside: a little bouquet springs up past the rim just as
      // the lens pushes in — the same bouquet the hero then grows in full
      const b = easeOutBack(seg(since, 0.4, 0.55), 1.25);
      bloom.current.visible = b > 0.002;
      bloom.current.scale.setScalar(Math.max(0.001, b));
      bloom.current.position.y = 0.1 + b * 0.12;
      bloom.current.rotation.y = -0.3 + seg(since, 0.4, 1.2) * 0.35;
    }
  });

  const tap = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHover(true);
    },
    onPointerOut: () => setHover(false),
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onTap();
    },
  };

  return (
    <group ref={root} {...tap}>
      {/* body */}
      <RoundedBox args={[0.9, 0.62, 0.78]} radius={0.09} smoothness={5} position={[0, 0.31, 0]}>
        <primitive object={finish("clay", PALETTE.blush)} attach="material" />
      </RoundedBox>
      {/* body ribbons */}
      <mesh position={[0, 0.31, 0]}>
        <boxGeometry args={[0.11, 0.64, 0.8]} />
        <primitive object={finish("satin", PALETTE.strawberry)} attach="material" />
      </mesh>
      <mesh position={[0, 0.31, 0]}>
        <boxGeometry args={[0.92, 0.64, 0.11]} />
        <primitive object={finish("satin", PALETTE.strawberry)} attach="material" />
      </mesh>
      {/* the warm surprise inside */}
      <mesh ref={glow} position={[0, 0.45, 0]} visible={false}>
        <sphereGeometry args={[0.5, 20, 20]} />
        <meshBasicMaterial ref={glowMat} color="#FFF1C9" transparent opacity={0} depthWrite={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.6, 0]} color="#FFE1A6" intensity={0} distance={3} decay={2} />
      {/* what was inside all along */}
      <group ref={bloom} position={[0, 0.12, 0]} scale={0.001} visible={false}>
        <CrochetFlower position={[0, 0, 0]} height={1.05} color={PALETTE.blush} seed={7} scale={0.6} sway={false} />
        <CrochetFlower position={[0.1, 0, -0.08]} height={0.95} color={PALETTE.lavender} seed={8} scale={0.55} tilt={[-0.05, 0, -0.16]} sway={false} />
        <CrochetFlower position={[-0.1, 0, 0.04]} height={0.9} color={PALETTE.white} seed={9} scale={0.55} tilt={[0.06, 0, 0.18]} sway={false} />
        <CrochetFlower position={[0.02, 0, 0.1]} height={0.84} color={PALETTE.rose} seed={10} scale={0.5} tilt={[0.16, 0, 0.02]} sway={false} />
      </group>
      {/* lid: pops off and floats away */}
      <group ref={lid} position={[0, 0.36 + 0.31 - 0.31, 0]}>
        <group position={[0, 0.3, 0]}>
          <RoundedBox args={[0.98, 0.2, 0.86]} radius={0.08} smoothness={5}>
            <primitive object={finish("clay", PALETTE.rose)} attach="material" />
          </RoundedBox>
          <mesh>
            <boxGeometry args={[0.115, 0.215, 0.88]} />
            <primitive object={finish("satin", PALETTE.strawberry)} attach="material" />
          </mesh>
          <mesh>
            <boxGeometry args={[1.0, 0.215, 0.115]} />
            <primitive object={finish("satin", PALETTE.strawberry)} attach="material" />
          </mesh>
          <group position={[0, 0.1, 0]}>
            <Bow untie={untie} />
          </group>
        </group>
      </group>
      {/* invisible generous tap target */}
      <mesh position={[0, 0.5, 0]} visible={false}>
        <sphereGeometry args={[0.85, 8, 8]} />
      </mesh>
    </group>
  );
}

/* ---------- twinkles around the stage ---------- */

function Twinkles({ count, reduced }: { count: number; reduced: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (rnd(i * 2.3 + 11) - 0.5) * 3.4,
        y: 0.1 + rnd(i * 4.1 + 12) * 2.2,
        z: (rnd(i * 6.7 + 13) - 0.5) * 2.2 - 0.4,
        phase: rnd(i * 1.9 + 14) * Math.PI * 2,
        size: 0.025 + rnd(i * 3.7 + 15) * 0.03,
      })),
    [count]
  );
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = reduced ? 0 : clock.elapsedTime;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + p.phase);
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, 0, t * 0.5 + p.phase);
      dummy.scale.setScalar(p.size * (0.4 + tw));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} />
    </instancedMesh>
  );
}

/* ---------- camera: still, then pushes into the opening ---------- */

const CAM_IDLE = new THREE.Vector3(0, 0.95, 2.55);
const CAM_IN = new THREE.Vector3(0, 1.15, 1.9);
const LOOK = new THREE.Vector3(0, 0.42, 0);
const LOOK_IN = new THREE.Vector3(0, 0.72, 0);

function Camera({ openedAt, reduced }: { openedAt: React.RefObject<number>; reduced: boolean }) {
  const { camera } = useThree();
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const since = openedAt.current < 0 ? -1 : performance.now() / 1000 - openedAt.current;
    const push = since < 0 ? 0 : easeInOutCubic(seg(since, 0.55, 0.75));
    pos.lerpVectors(CAM_IDLE, CAM_IN, push);
    if (!reduced && since < 0) {
      pos.x += state.pointer.x * 0.12;
      pos.y += state.pointer.y * 0.06;
    }
    camera.position.x = damp(camera.position.x, pos.x, 6, dt);
    camera.position.y = damp(camera.position.y, pos.y, 6, dt);
    camera.position.z = damp(camera.position.z, pos.z, 6, dt);
    look.lerpVectors(LOOK, LOOK_IN, push);
    camera.lookAt(look);
  });
  return null;
}

/* ---------- public component ---------- */

export type GiftIntroHandle = { open: () => void };

export default function GiftIntroScene({
  opened,
  onTap,
  onReady,
  reduced,
}: {
  /** true once the visitor (or the timer) has unwrapped */
  opened: boolean;
  /** the visitor tapped the box */
  onTap: () => void;
  /** first frame painted (the loader can hide its placeholder) */
  onReady?: () => void;
  reduced: boolean;
}) {
  const quality = useQuality();
  const openedAt = useRef(-1);
  const readyOnce = useRef(false);

  useEffect(() => {
    if (opened && openedAt.current < 0) openedAt.current = performance.now() / 1000;
  }, [opened]);

  const density = quality.density;

  return (
    <AdaptiveCanvas
      quality={quality}
      className="!absolute inset-0"
      camera={{ position: CAM_IDLE.toArray(), fov: 34 }}
      aria-hidden="true"
      onCreated={() => {
        /* handled in Ready below (needs a rendered frame) */
      }}
    >
      <Ready
        onReady={() => {
          if (readyOnce.current) return;
          readyOnce.current = true;
          onReady?.();
        }}
      />
      <StudioLights target={[0, 0.4, 0]} keyIntensity={1.0} />
      <Camera openedAt={openedAt} reduced={reduced} />
      <Gift phase={opened ? "opening" : "idle"} openedAt={openedAt} onTap={onTap} reduced={reduced} />
      <Hearts count={quality.simple ? 8 : 14} openedAt={openedAt} />
      <Confetti count={Math.round(70 * density)} openedAt={openedAt} />
      {!quality.simple && <Twinkles count={Math.round(22 * density)} reduced={reduced} />}
      {/* soft-edged stage that melts into the candy wash */}
      <SoftGround radius={2.4} color="#FFE6ED" />
      <StudioShadows scale={7} far={1.6} opacity={0.32} resolution={Math.min(384, quality.shadowRes)} />
    </AdaptiveCanvas>
  );
}

function Ready({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady();
  });
  return null;
}
