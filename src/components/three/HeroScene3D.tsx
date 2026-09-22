"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { useSectionScrollProgress, useWebGL } from "@/lib/hooks";
import { useQuality, type Quality } from "@/lib/quality";
import { markHeroReady, useIntroStarted, seg, easeInOutCubic, easeOutCubic } from "@/lib/intro";
import { HeroStatic } from "@/components/HeroStatic";
import { CrochetFlower, PALETTE } from "./CrochetFlower";
import {
  FloatingHeart,
  GiftBox,
  Hook,
  PuffyCloud,
  SatinBow,
  Sparkle3D,
  StrawberryCharm,
  TinyDaisy,
  YarnBall,
} from "./parts";
import { BreathingLight, DustMotes, Entrance, FallingPetals, HeartBurst } from "./anim";
import {
  AdaptiveCanvas,
  LowTierToneMapping,
  Breeze,
  IntroClockProvider,
  SoftGround,
  StudioLights,
  StudioShadows,
  useIntroClock,
} from "./Stage";
import { Meadow } from "./Meadow";
import { Post } from "./Post";
import { makeThreadGeometry } from "./geometry";
import { shared as finish } from "./materials";

const damp = THREE.MathUtils.damp;

/* ================================================================
   Composition
   ================================================================ */

type FlowerConfig = {
  position: [number, number, number];
  height: number;
  color: string;
  seed: number;
  tilt: [number, number, number];
  /** intro beat (seconds) when this flower starts growing */
  at: number;
};

/* stems gather at the bottom of the wrap and fan outward — a real bouquet —
   so nothing pokes through the paper */
const FLOWERS_FULL: FlowerConfig[] = [
  { position: [-0.1, 0, 0.04], height: 1.55, color: PALETTE.blush, seed: 1, tilt: [0.06, 0, 0.14], at: 1.55 },
  { position: [0.04, 0, -0.08], height: 1.32, color: PALETTE.cream, seed: 2, tilt: [-0.1, 0, -0.07], at: 1.75 },
  { position: [0.1, 0, 0.08], height: 1.14, color: PALETTE.rose, seed: 3, tilt: [0.15, 0, -0.19], at: 1.92 },
  { position: [-0.03, 0, 0.11], height: 0.98, color: PALETTE.lavender, seed: 4, tilt: [0.22, 0, 0.06], at: 2.08 },
  { position: [0.01, 0, -0.12], height: 1.42, color: PALETTE.white, seed: 5, tilt: [-0.16, 0, -0.02], at: 2.2 },
];

const FLOWERS_SIMPLE: FlowerConfig[] = [FLOWERS_FULL[0], FLOWERS_FULL[2], FLOWERS_FULL[1]];

/** The loose rose thread snaking from the yarn ball across the surface. */
const THREAD_POINTS: [number, number, number][] = [
  [1.55, 0.12, 0.55],
  [1.35, 0.05, 0.95],
  [0.9, 0.035, 1.35],
  [0.3, 0.03, 1.55],
  [-0.4, 0.04, 1.45],
  [-1.05, 0.03, 1.3],
  [-1.6, 0.05, 1.05],
  [-2.25, 0.03, 0.9],
];

/* intro beats (seconds after the curtain rises) */
const BEAT = {
  ground: 0,
  yarn: 0.35, // yarn ball rolls in from the right
  thread: 0.6, // thread unspools behind it
  wrap: 1.3, // bouquet wrap drops in
  flowers: 1.55, // flowers grow one by one (see FLOWERS[].at)
  charms: 2.5, // hook, gift, daisies, hearts pop
  settle: 3.1, // camera reaches its resting frame
} as const;

/* ================================================================
   Unspooling thread — the TubeGeometry's draw range grows with the
   intro clock, so the yarn visibly "writes" itself across the table.
   ================================================================ */

function UnspoolingThread({ points }: { points: [number, number, number][] }) {
  const geo = useMemo(() => makeThreadGeometry(points, 0.016), [points]);
  useEffect(() => () => geo.dispose(), [geo]);
  const ref = useRef<THREE.Mesh>(null!);
  const { t, reduced } = useIntroClock();
  const total = geo.index ? geo.index.count : geo.attributes.position.count;

  useFrame(() => {
    if (!ref.current) return;
    const p = reduced ? 1 : easeOutCubic(seg(t.current, BEAT.thread, 1.5));
    // tube index buffer is ordered along the curve → drawRange = reveal along length
    const n = Math.floor(total * p);
    ref.current.geometry.setDrawRange(0, n);
    ref.current.visible = n > 0;
  });

  return (
    <mesh ref={ref} geometry={geo} visible={false}>
      <primitive object={finish("yarn", PALETTE.rose)} attach="material" />
    </mesh>
  );
}

/** Yarn ball rolls in from off-screen right and settles where the thread begins. */
function RollingYarn({ simple }: { simple: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  const { t, reduced } = useIntroClock();
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const p = reduced ? 1 : easeOutCubic(seg(t.current, BEAT.yarn, 1.1));
    const x = THREE.MathUtils.lerp(4.2, 0, p);
    g.position.x = x;
    // roll: distance / radius, around the travel axis
    g.rotation.z = (x / 0.3) * -1;
    g.visible = p > 0 || reduced;
  });
  return (
    <group ref={ref} position={[4.2, 0, 0]} visible={false}>
      <YarnBall
        position={[1.55, 0.3, 0.55]}
        radius={0.3}
        color={PALETTE.blush}
        rings={simple ? 9 : 15}
        seed={2}
        spin={0}
      />
    </group>
  );
}

/* ================================================================
   The camera — a directed move, then a living frame.
   intro:   low & close on the table  →  pulls back and rises to the
            composition (the bouquet is revealed as it grows)
   after:   damped pointer parallax + a slow breathing drift
   scroll:  tilts down and pulls back as the hero leaves — the scene
            hands off to the next section rather than just sliding away
   ================================================================ */

const CAM_START = new THREE.Vector3(1.4, 0.55, 3.6);
const CAM_REST = new THREE.Vector3(0.35, 1.95, 7.9);
const LOOK_START = new THREE.Vector3(0.6, 0.35, 0.4);
const LOOK_REST = new THREE.Vector3(0, 0.9, 0);

function CameraRig({ reduced }: { reduced: boolean }) {
  const { camera, size } = useThree();
  // the meadow is full-bleed behind the copy: on wide screens the bouquet is
  // framed into the right column (the glass panel sits on the left); on
  // narrow screens it stays centred and the panel sits below it
  const wide = size.width >= 1024;
  const portrait = size.height > size.width;
  const { t } = useIntroClock();
  const scroll = useRef(0);
  useSectionScrollProgress("home", scroll);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const motion = reduced ? 0 : 1;
    const p = reduced ? 1 : easeInOutCubic(seg(t.current, 0.15, BEAT.settle));

    // base frame: intro interpolation
    pos.lerpVectors(CAM_START, CAM_REST, p);
    look.lerpVectors(LOOK_START, LOOK_REST, p);
    if (wide) {
      pos.x -= 1.0;
      look.x -= 1.5;
    } else if (portrait) {
      // phones: the copy panel covers the lower half of the screen, so the
      // camera aims low and the bouquet sits in the open top half
      pos.z += 2.2;
      pos.y -= 0.35;
      pos.x -= 0.3;
      look.x -= 0.3;
      look.y -= 1.05;
    }

    // living frame after the intro: pointer parallax + breath
    const px = state.pointer.x * motion * p;
    const py = state.pointer.y * motion * p;
    const breath = Math.sin(state.clock.elapsedTime * 0.35) * 0.04 * motion * p;
    pos.x += px * 0.45;
    pos.y += py * 0.2 + breath;

    // scroll hand-off: pull back & tilt down as the hero scrolls away
    const s = scroll.current * motion;
    pos.z += s * 2.4;
    pos.y += s * 1.6;
    look.y -= s * 0.35;

    // damp toward the target so nothing ever snaps
    target.copy(pos);
    camera.position.x = damp(camera.position.x, target.x, 4, dt);
    camera.position.y = damp(camera.position.y, target.y, 4, dt);
    camera.position.z = damp(camera.position.z, target.z, 4, dt);
    camera.lookAt(look);
  });

  return null;
}

/* ================================================================
   Bouquet — grows in, then can be tapped for a burst of hearts.
   ================================================================ */

function Bouquet({
  flowers,
  reduced,
  onBurst,
}: {
  flowers: FlowerConfig[];
  reduced: boolean;
  onBurst: () => void;
}) {
  const [hover, setHover] = useState(false);
  const group = useRef<THREE.Group>(null!);
  const { gl } = useThree();

  // cursor: the canvas flips to the "interactive" heart via a data attribute
  // (globals.css maps it) — inline `cursor: pointer` would override the theme
  useEffect(() => {
    if (hover) gl.domElement.dataset.cursor = "pointer";
    else delete gl.domElement.dataset.cursor;
    return () => {
      delete gl.domElement.dataset.cursor;
    };
  }, [hover, gl]);

  // R3F only fires onPointerOut when the ray moves to another object or the
  // canvas emits pointerout — if the pointer leaves the canvas *while* over
  // the bouquet, clear the hover ourselves so the cursor never sticks.
  useEffect(() => {
    const el = gl.domElement;
    if (!el) return; // context already torn down (lost / fallback swapped in)
    const clear = () => setHover(false);
    el.addEventListener("pointerleave", clear);
    return () => el.removeEventListener("pointerleave", clear);
  }, [gl]);

  useFrame((_, dt) => {
    if (!group.current) return;
    const s = damp(group.current.scale.x, hover && !reduced ? 1.03 : 1, 6, dt);
    group.current.scale.setScalar(s);
  });

  const handlers = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHover(true);
    },
    onPointerOut: () => setHover(false),
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onBurst();
    },
  };

  return (
    <group ref={group} position={[-0.25, 0, 0.05]} {...handlers}>
      {flowers.map((f) => (
        <Entrance key={f.seed} at={f.at} duration={0.9} kind="grow">
          <CrochetFlower {...f} sway={!reduced} />
        </Entrance>
      ))}
      {/* the wrap: kraft cone, a blush tissue collar folded over it, a satin
          band and a real bow at the front — it reads as a *gift*, not a pot */}
      <Entrance at={BEAT.wrap} duration={0.7} kind="drop" height={0.6}>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.4, 0.15, 0.84, 20, 1, true]} />
          <primitive object={finish("paper", "#F6EBDA", { side: THREE.DoubleSide })} attach="material" />
        </mesh>
        <mesh position={[0, 0.74, 0]} rotation={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.52, 0.36, 0.34, 7, 1, true]} />
          <primitive object={finish("paper", PALETTE.blush, { side: THREE.DoubleSide })} attach="material" />
        </mesh>
        <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.31, 0.03, 10, 28]} />
          <primitive object={finish("satin", PALETTE.rose)} attach="material" />
        </mesh>
        <SatinBow position={[0, 0.56, 0.4]} rotation={[0.55, 0, 0]} scale={0.95} color={PALETTE.rose} />
      </Entrance>
      {/* invisible tap target so clicks between petals still count */}
      <mesh position={[0, 1.1, 0]} visible={false}>
        <sphereGeometry args={[0.75, 8, 8]} />
      </mesh>
    </group>
  );
}

/* ================================================================
   Scene
   ================================================================ */

function Scene({
  simple,
  density,
  reduced,
  shadowRes,
  quality,
}: {
  simple: boolean;
  density: number;
  reduced: boolean;
  shadowRes: number;
  quality: Quality;
}) {
  const world = useRef<THREE.Group>(null!);
  const [burst, setBurst] = useState(0);
  const flowers = simple ? FLOWERS_SIMPLE : FLOWERS_FULL;

  // first rendered frame ⇒ shaders compiled ⇒ the loader may lift the curtain
  const readyOnce = useRef(false);
  useFrame(() => {
    if (!readyOnce.current) {
      readyOnce.current = true;
      markHeroReady();
    }
  });

  useFrame((state, dt) => {
    const g = world.current;
    if (!g) return;
    const motion = reduced ? 0 : 1;
    // the world itself yaws a touch toward the pointer (parallax against the camera move)
    g.rotation.y = damp(g.rotation.y, state.pointer.x * 0.08 * motion, 2.5, dt);
  });

  return (
    <>
      <StudioLights outdoor keyIntensity={1.15} shadowSize={4} />
      <CameraRig reduced={reduced} />

      {/* the world outside the blanket does not yaw with the pointer */}
      <Meadow
        density={density}
        simple={simple}
        reduced={reduced}
        plateauInner={2.9}
        plateauOuter={5.2}
        grassClear={2.75}
        grassNearZ={3.2}
        grassScale={1.25}
        grassCount={7000}
        butterflies={simple ? 0 : 4}
        butterflyArea={[4.2, 1.4, 2.6]}
      />

      <group ref={world}>
        {/* the picnic blanket the studio sits on — gingham, like the site */}
        <SoftGround radius={2.75} blanket />

        {/* cozy ambient life: warm drifting dust + falling petals */}
        {!simple && <DustMotes count={Math.round(40 * density)} area={[4.6, 2.6, 3]} reduced={reduced} />}
        {!simple && <FallingPetals count={Math.max(3, Math.round(7 * density))} reduced={reduced} />}
        <BreathingLight position={[-1.6, 1.3, 1.4]} intensity={0.5} reduced={reduced} />

        <Bouquet flowers={flowers} reduced={reduced} onBurst={() => setBurst((b) => b + 1)} />
        <HeartBurst origin={[-0.25, 1.35, 0.05]} burstId={burst} count={simple ? 8 : 14} reduced={reduced} />

        <RollingYarn simple={simple} />
        <UnspoolingThread points={THREAD_POINTS} />

        {!simple && (
          <Entrance at={BEAT.yarn + 0.5} duration={1} kind="drop" height={0.5}>
            <YarnBall position={[2.05, 0.19, -0.85]} radius={0.19} color={PALETTE.sage} rings={8} seed={6} spin={reduced ? 0 : 0.3} />
          </Entrance>
        )}

        <Entrance at={BEAT.charms} duration={0.6} kind="drop" height={0.3}>
          <Hook position={[1.1, 0.03, 1.4]} />
        </Entrance>

        {!simple && (
          <Entrance at={BEAT.charms + 0.12} duration={0.7} kind="drop" height={0.7}>
            <GiftBox position={[-1.8, 0.02, 0.75]} open />
          </Entrance>
        )}

        <Entrance at={BEAT.charms + 0.3} duration={0.6} kind="pop">
          <FloatingHeart position={[0.95, 0.42, 1.15]} scale={0.3} color={PALETTE.strawberry} />
        </Entrance>

        {/* the little strawberry keychain, leaning on the yarn */}
        <Entrance at={BEAT.charms + 0.05} duration={0.7} kind="drop" height={0.5}>
          <StrawberryCharm position={[1.05, 0.0, -0.45]} rotation={[0.15, -0.6, 0.35]} scale={0.34} />
        </Entrance>

        {/* pastel clouds drifting high in the studio air */}
        {!simple && (
          <Entrance at={BEAT.charms + 0.7} duration={0.9} kind="pop">
            <PuffyCloud position={[-2.0, 2.35, -1.2]} scale={0.8} color="#FFFFFF" reduced={reduced} phase={0} />
            <PuffyCloud position={[2.1, 2.7, -1.6]} scale={0.6} color="#FFF0F5" reduced={reduced} phase={2} />
          </Entrance>
        )}

        {!simple && (
          <>
            <Entrance at={BEAT.charms + 0.42} duration={0.6} kind="pop">
              <FloatingHeart position={[-1.45, 0.78, 0.95]} scale={0.2} color={PALETTE.rose} />
            </Entrance>
            <Entrance at={BEAT.charms + 0.54} duration={0.6} kind="pop">
              <FloatingHeart position={[1.2, 1.42, -0.55]} scale={0.16} color={PALETTE.lavender} />
            </Entrance>
            <Entrance at={BEAT.charms + 0.6} duration={0.5} kind="pop">
              <Sparkle3D position={[-0.95, 1.75, 0.55]} phase={0} color="#FFF3C4" reduced={reduced} />
              <Sparkle3D position={[0.45, 2.05, -0.35]} phase={2.1} size={0.04} color="#FFFFFF" reduced={reduced} />
              <Sparkle3D position={[1.85, 1.15, 0.35]} phase={4.2} size={0.045} color="#FFD6E2" reduced={reduced} />
              <Sparkle3D position={[-1.7, 1.25, -0.4]} phase={1.3} size={0.04} color="#E6DAFF" reduced={reduced} />
            </Entrance>
            <Entrance at={BEAT.charms + 0.2} duration={0.5} kind="pop">
              <TinyDaisy position={[-1.15, 0.03, 1.5]} seed={11} />
            </Entrance>
            <Entrance at={BEAT.charms + 0.35} duration={0.5} kind="pop">
              <TinyDaisy position={[2.3, 0.03, 1.2]} seed={12} petalColor={PALETTE.blush} />
            </Entrance>
          </>
        )}
      </group>

      {simple && <StudioShadows scale={11} far={2.4} opacity={0.35} resolution={shadowRes} />}
      <LowTierToneMapping enabled={simple} />
      <Post quality={quality} aoRadius={0.3} aoIntensity={1.5} bloomIntensity={0.45} vignette={0.22} toneMapping />
    </>
  );
}

/**
 * The signature hero scene, now *directed*: the surface appears, a yarn ball
 * rolls in unspooling its thread, the bouquet grows stem by stem, the small
 * charms land, and the camera pulls back into the resting composition — all
 * on one shared intro clock that starts when the loading curtain lifts.
 * Pointer motion is wind; tapping the bouquet releases hearts.
 * Falls back to a static composition when WebGL is unavailable.
 * `active` flips the frameloop off while the hero is off-screen.
 */
export default function HeroScene3D({ active = true }: { active?: boolean }) {
  const webgl = useWebGL();
  const quality = useQuality();
  const reduced = !!useReducedMotion();
  const started = useIntroStarted();

  if (webgl === false) return <HeroStatic />;

  return (
    <AdaptiveCanvas
      statsLabel="hero"
      enginePriority={1}
      quality={quality}
      fallback={<HeroStatic />}
      className="!absolute inset-0"
      camera={{ position: CAM_START.toArray(), fov: 35 }}
      gl={{ alpha: false }}
      scene={{ fog: new THREE.Fog("#cfe2f4", 9, 26) }}
      frameloop={active ? "always" : "never"}
      aria-hidden="true"
    >
      <IntroClockProvider started={started} reduced={reduced}>
        <Breeze reduced={reduced}>
          <Scene
            simple={quality.simple}
            density={quality.density}
            reduced={reduced}
            shadowRes={quality.shadowRes}
            quality={quality}
          />
        </Breeze>
      </IntroClockProvider>
    </AdaptiveCanvas>
  );
}
