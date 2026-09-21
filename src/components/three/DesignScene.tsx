"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { makeLeafGeometry, makePetalGeometry, makePointedPetalGeometry, makeCustomPetalGeometry, rnd } from "./geometry";
import { BLOOM } from "./CrochetFlower";
import { MIX_PALETTE, type DesignConfig } from "@/lib/design";
import { DustMotes, FallingPetals } from "./anim";
import { AdaptiveCanvas, Breeze, SoftGround, StudioLights, StudioShadows } from "./Stage";
import { useQuality } from "@/lib/quality";
import { create as createMat, syncSheen } from "./materials";
import { SatinBow } from "./parts";

const damp = THREE.MathUtils.damp;

/* ================================================================
   Small building blocks
   ================================================================ */

/** Scale-in with a soft handmade "pop" (easeOutBack). Instant when reduced. */
function Pop({
  children,
  delay = 0,
  reduced = false,
}: {
  children: React.ReactNode;
  delay?: number;
  reduced?: boolean;
}) {
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

/** Materials created once per flower; colours lerp toward live targets. */
function useLerpedFlowerMaterials(petalHex: string, centerHex: string) {
  const mats = useMemo(
    () => ({
      outer: createMat("yarn", petalHex),
      inner: createMat("yarn", petalHex),
      center: createMat("yarn", centerHex),
      stem: createMat("yarn", "#7C977A"),
      leaf: createMat("yarn", "#A9BFA3"),
    }),
    // created once per instance mount — targets update via refs below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const targets = useRef({
    outer: new THREE.Color(petalHex),
    inner: new THREE.Color(petalHex),
    center: new THREE.Color(centerHex),
  });

  useEffect(() => {
    targets.current.outer.set(petalHex);
    targets.current.inner.set(petalHex).multiplyScalar(0.86);
    targets.current.center.set(centerHex);
  }, [petalHex, centerHex]);

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
    },
    [mats]
  );

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-5 * dt);
    mats.outer.color.lerp(targets.current.outer, k);
    mats.inner.color.lerp(targets.current.inner, k);
    mats.center.color.lerp(targets.current.center, k);
    syncSheen(mats.outer);
    syncSheen(mats.inner);
    syncSheen(mats.center);
  });

  return mats;
}

/* ================================================================
   The configurable flower
   ================================================================ */

type StudioFlowerProps = {
  position: [number, number, number];
  /** world Y of the blossom head (0 → floating bloom with tucked leaves) */
  headY: number;
  petalCount: number;
  petalShape: "rounded" | "pointed" | "custom";
  customPetal?: number[] | null;
  petalColor: string;
  centerColor: string;
  leaves: number;
  seed: number;
  reduced: boolean;
};

function StudioFlower({
  position,
  headY,
  petalCount,
  petalShape,
  customPetal,
  petalColor,
  centerColor,
  leaves,
  seed,
  reduced,
}: StudioFlowerProps) {
  const head = useRef<THREE.Group>(null!);
  const flutterOuter = useRef<(THREE.Mesh | null)[]>([]);
  const flutterInner = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useLerpedFlowerMaterials(petalColor, centerColor);

  const roundedGeo = useMemo(() => makePetalGeometry(0.36, 0.95, 0.17, seed), [seed]);
  const pointedGeo = useMemo(() => makePointedPetalGeometry(0.2, seed + 3), [seed]);
  const customGeo = useMemo(
    () => (petalShape === "custom" && customPetal ? makeCustomPetalGeometry(customPetal, seed + 11) : null),
    [petalShape, customPetal, seed]
  );
  const leafGeo = useMemo(() => makeLeafGeometry(0.34, 1, 0.1, seed + 7), [seed]);
  const geo = customGeo ?? (petalShape === "pointed" ? pointedGeo : roundedGeo);

  const outerBase = useMemo(
    () => Array.from({ length: petalCount }, (_, i) => BLOOM.outer.tilt + rnd(seed + i * 3.7) * BLOOM.outer.tiltJitter),
    [petalCount, seed]
  );
  const innerCount = Math.max(3, petalCount - 1);
  const innerBase = useMemo(
    () => Array.from({ length: innerCount }, (_, i) => BLOOM.inner.tilt + rnd(seed + 20 + i * 2.9) * BLOOM.inner.tiltJitter),
    [innerCount, seed]
  );

  useEffect(
    () => () => {
      roundedGeo.dispose();
      pointedGeo.dispose();
      customGeo?.dispose();
      leafGeo.dispose();
    },
    [roundedGeo, pointedGeo, customGeo, leafGeo]
  );

  useFrame(({ clock }) => {
    if (reduced || !head.current) return;
    const t = clock.elapsedTime;
    head.current.rotation.z = Math.sin(t * 0.6 + seed * 2.1) * 0.035;
    head.current.rotation.x = BLOOM.face * 0.7 + Math.sin(t * 0.42 + seed * 1.3) * 0.02;
    for (let i = 0; i < flutterOuter.current.length; i++) {
      const m = flutterOuter.current[i];
      if (m) m.rotation.x = outerBase[i] + Math.sin(t * 0.9 + i * 1.3 + seed) * 0.05;
    }
    for (let i = 0; i < flutterInner.current.length; i++) {
      const m = flutterInner.current[i];
      if (m) m.rotation.x = innerBase[i] + Math.sin(t * 1.05 + i * 1.1 + seed) * 0.04;
    }
  });

  const ringKey = `${petalShape}-${petalCount}`;

  return (
    <group position={position}>
      {/* stem + leaves (skipped for floating blooms) */}
      {headY > 0.05 && (
        <Pop key={`stem-${headY.toFixed(2)}-${leaves}`} reduced={reduced}>
          <mesh position={[0, headY / 2, 0]} material={mats.stem}>
            <cylinderGeometry args={[0.02, 0.028, headY, 8]} />
          </mesh>
          {Array.from({ length: leaves }).map((_, i) => {
            const f = 0.35 + i * 0.25;
            return (
              <group
                key={i}
                position={[0, headY * f, 0]}
                rotation={[0, rnd(seed + i * 9) * Math.PI * 2, 0]}
              >
                <mesh
                  geometry={leafGeo}
                  material={mats.leaf}
                  rotation={[1.05 + i * 0.1, 0, 0.12]}
                  scale={[0.56, 0.45, 0.56]}
                  position={[0, 0.01, 0.02]}
                />
              </group>
            );
          })}
        </Pop>
      )}

      {/* tucked leaf skirt for floating blooms */}
      {headY <= 0.05 &&
        Array.from({ length: leaves }).map((_, i) => (
          <group
            key={i}
            position={[0, -0.07, 0]}
            rotation={[Math.PI - 1.2, (i / Math.max(leaves, 1)) * Math.PI * 2, 0]}
          >
            <mesh geometry={leafGeo} material={mats.leaf} scale={[0.56, 0.45, 0.56]} />
          </group>
        ))}

      {/* blossom head */}
      <group ref={head} position={[0, headY, 0]} rotation={[BLOOM.face * 0.7, 0, 0]}>
        <Pop key={`outer-${ringKey}`} reduced={reduced}>
          {Array.from({ length: petalCount }).map((_, i) => {
            const j = rnd(seed + i * 3.7);
            return (
              <group key={i} rotation={[0, (i / petalCount) * Math.PI * 2 + j * 0.4, 0]}>
                <mesh
                  ref={(el) => {
                    flutterOuter.current[i] = el;
                  }}
                  geometry={geo}
                  material={mats.outer}
                  rotation={[BLOOM.outer.tilt + j * BLOOM.outer.tiltJitter, 0, 0]}
                  position={[0, BLOOM.outer.lift, BLOOM.outer.out]}
                  scale={[BLOOM.outer.width + j * BLOOM.outer.widthJitter, BLOOM.outer.scaleY, BLOOM.outer.scaleZ]}
                />
              </group>
            );
          })}
        </Pop>
        <Pop key={`inner-${ringKey}`} delay={0.09} reduced={reduced}>
          {Array.from({ length: innerCount }).map((_, i) => {
            const j = rnd(seed + 20 + i * 2.9);
            return (
              <group key={i} rotation={[0, (i / innerCount) * Math.PI * 2 + 0.5 + j * 0.4, 0]}>
                <mesh
                  ref={(el) => {
                    flutterInner.current[i] = el;
                  }}
                  geometry={geo}
                  material={mats.inner}
                  rotation={[BLOOM.inner.tilt + j * BLOOM.inner.tiltJitter, 0, 0]}
                  position={[0, BLOOM.inner.lift, BLOOM.inner.out]}
                  scale={[BLOOM.inner.width + j * BLOOM.inner.widthJitter, BLOOM.inner.scaleY, BLOOM.inner.scaleZ]}
                />
              </group>
            );
          })}
        </Pop>
        <mesh material={mats.center} position={[0, BLOOM.center.lift, 0]} scale={[1, BLOOM.center.squash, 1]}>
          <sphereGeometry args={[BLOOM.center.radius, 14, 12]} />
        </mesh>
      </group>
    </group>
  );
}

/* ================================================================
   Bouquet wrap (cream paper + ribbon that lerps colour)
   ================================================================ */

function BouquetWrap({ ribbonColor }: { ribbonColor: string }) {
  const ribbon = useMemo(() => createMat("satin", ribbonColor), []);
  const cream = useMemo(
    () => createMat("paper", "#F6EBDA", { side: THREE.DoubleSide }),
    []
  );
  const target = useRef(new THREE.Color(ribbonColor));

  useEffect(() => {
    target.current.set(ribbonColor);
  }, [ribbonColor]);
  useEffect(
    () => () => {
      ribbon.dispose();
      cream.dispose();
    },
    [ribbon, cream]
  );

  useFrame((_, dt) => {
    ribbon.color.lerp(target.current, 1 - Math.exp(-5 * dt));
    syncSheen(ribbon);
  });

  return (
    <group>
      {/* kraft cone gathered tight at the neck — stems emerge at radius ≈ 0.12 */}
      <mesh position={[0, 0.38, 0]} material={cream}>
        <cylinderGeometry args={[0.36, 0.13, 0.76, 18, 1, true]} />
      </mesh>
      <mesh position={[0, 0.46, 0]} rotation={[Math.PI / 2, 0, 0]} material={ribbon}>
        <torusGeometry args={[0.27, 0.03, 10, 28]} />
      </mesh>
      <SatinBow position={[0, 0.5, 0.31]} rotation={[0.55, 0, 0]} scale={0.8} color={ribbonColor} />
    </group>
  );
}

/* ================================================================
   Drag-to-spin — mobile-safe (vertical swipes still scroll the page)
   ================================================================ */

function SpinGroup({ children, reduced }: { children: React.ReactNode; reduced: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  const { gl } = useThree();
  const velocity = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastInteract = useRef(0);

  useEffect(() => {
    const el = gl.domElement;
    // let vertical touch swipes scroll the page; horizontal drags spin the design
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
      if (!reduced && idle && Math.abs(velocity.current) < 0.0006) {
        ref.current.rotation.y += dt * 0.3; // gentle idle turn
      }
    }
  });

  return <group ref={ref}>{children}</group>;
}

/* ================================================================
   Scene assembly
   ================================================================ */

/** Framing (scale + y offset) so single blooms and bouquets both sit nicely. */
function framingFor(config: DesignConfig): { scale: number; y: number } {
  if (config.type === "bouquet") {
    return { scale: config.bouquetCount === 7 ? 0.9 : 0.98, y: -0.05 };
  }
  if (config.stem === "tall") return { scale: 1.05, y: -0.05 };
  if (config.stem === "short") return { scale: 1.5, y: 0.05 };
  return { scale: 2.2, y: 0.25 }; // floating bloom
}

function Scene({ config, reduced }: { config: DesignConfig; reduced: boolean }) {
  const scaler = useRef<THREE.Group>(null!);
  const lifter = useRef<THREE.Group>(null!);
  const framing = framingFor(config);

  // smooth framing transitions when the type/stem changes
  useFrame((_, dt) => {
    if (scaler.current) {
      const s = damp(scaler.current.scale.x, framing.scale, 4, dt);
      scaler.current.scale.setScalar(s);
    }
    if (lifter.current) {
      lifter.current.position.y = damp(lifter.current.position.y, framing.y, 4, dt);
    }
  });

  const isBouquet = config.type === "bouquet";

  const flowers = useMemo(() => {
    if (!isBouquet) {
      const headY = config.stem === "none" ? 0 : config.stem === "short" ? 0.72 : 1.32;
      const localY = config.stem === "none" ? 0.35 : 0;
      return [
        {
          key: "solo",
          a: 0,
          tilt: 0,
          position: [0, localY, 0] as [number, number, number],
          headY,
          seed: 7,
        },
      ];
    }
    const n = config.bouquetCount;
    // real bouquets are *gathered*: stems meet inside the wrap's neck
    // (radius ≈ 0.1) and fan outward so the heads spread into a dome
    const radius = n <= 3 ? 0.07 : n <= 5 ? 0.1 : 0.12;
    const headRing = n <= 3 ? 0.24 : n <= 5 ? 0.32 : 0.4;
    const base = config.stem === "tall" ? 1.25 : 0.95;
    return Array.from({ length: n }).map((_, i) => {
      const a = (i / n) * Math.PI * 2 + 0.4;
      const headY = base + rnd(i + 41) * 0.3;
      const tilt = -Math.atan2(headRing - radius, headY); // negative = lean outward
      return {
        key: `b${i}`,
        a,
        tilt,
        headY,
        seed: i + 1,
        position: [Math.cos(a) * radius, 0, Math.sin(a) * radius] as [number, number, number],
      };
    });
  }, [isBouquet, config.bouquetCount, config.stem]);

  return (
    <group ref={lifter}>
      <group ref={scaler}>
        <SpinGroup reduced={reduced}>
          {isBouquet && config.wrap && <BouquetWrap ribbonColor={config.ribbonColor} />}
          {flowers.map((f, i) => {
            const flower = (
              <StudioFlower
                key={isBouquet ? `${config.bouquetCount}-${f.key}` : f.key}
                position={isBouquet ? [0, 0, 0] : f.position}
                headY={f.headY}
                petalCount={config.petalCount}
                petalShape={config.petalShape}
                customPetal={config.customPetal}
                petalColor={
                  isBouquet && config.mixColors
                    ? MIX_PALETTE[i % MIX_PALETTE.length]
                    : config.petalColor
                }
                centerColor={config.centerColor}
                leaves={config.leaves}
                seed={f.seed}
                reduced={reduced}
              />
            );
            if (!isBouquet) return flower;
            // radial wrapper: local +X points outward, then lean toward centre
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

/** Camera nudge so every framing looks at the composition — with a
 *  barely-there drift toward the pointer so the scene feels alive. */
function Rig({ reduced }: { reduced: boolean }) {
  const { camera, pointer } = useThree();
  useFrame((_, dt) => {
    if (!reduced) {
      camera.position.x = damp(camera.position.x, 0.6 + pointer.x * 0.35, 2, dt);
      camera.position.y = damp(camera.position.y, 1.7 + pointer.y * 0.18, 2, dt);
    }
    camera.lookAt(0, 0.9, 0);
  });
  return null;
}

/**
 * The Design Studio scene — a fully configurable crochet flower/bouquet.
 * Drag to spin (mobile-safe), gentle idle turn, animated transitions for
 * every control: colours lerp, petals/stems pop in, framing glides.
 */
export default function DesignScene({ config }: { config: DesignConfig }) {
  const reduce = useReducedMotion();
  const quality = useQuality();

  return (
    <AdaptiveCanvas
      statsLabel="studio"
      quality={quality}
      className="!absolute inset-0 cursor-grab active:cursor-grabbing"
      camera={{ position: [0.6, 1.7, 4.6], fov: 33 }}
      aria-hidden="true"
    >
      <StudioLights target={[0, 0.8, 0]} keyIntensity={1.05} />
      <Breeze reduced={!!reduce}>
        <Scene config={config} reduced={!!reduce} />
        <DustMotes count={Math.round(16 * quality.density)} area={[4.5, 2.6, 2.5]} size={0.035} reduced={!!reduce} />
        {!quality.simple && <FallingPetals count={Math.max(3, Math.round(5 * quality.density))} area={[3.2, 2.6, 1.8]} reduced={!!reduce} />}
      </Breeze>
      <Rig reduced={!!reduce} />
      <group position={[0, -0.15, 0]}>
        <SoftGround radius={2.2} color="#FFE9EF" />
      </group>
      <StudioShadows position={[0, -0.15, 0]} opacity={0.28} scale={8} far={2.5} resolution={quality.shadowRes} />
    </AdaptiveCanvas>
  );
}
