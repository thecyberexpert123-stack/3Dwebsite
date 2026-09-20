"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { makePetalGeometry, makePointedPetalGeometry, rnd } from "./geometry";
import { MIX_PALETTE, type DesignConfig } from "@/lib/design";

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
      outer: new THREE.MeshStandardMaterial({ color: petalHex, roughness: 0.9 }),
      inner: new THREE.MeshStandardMaterial({ color: petalHex, roughness: 0.9 }),
      center: new THREE.MeshStandardMaterial({ color: centerHex, roughness: 0.85 }),
      stem: new THREE.MeshStandardMaterial({ color: "#7C977A", roughness: 0.95 }),
      leaf: new THREE.MeshStandardMaterial({ color: "#A9BFA3", roughness: 0.95 }),
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
  petalShape: "rounded" | "pointed";
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
  petalColor,
  centerColor,
  leaves,
  seed,
  reduced,
}: StudioFlowerProps) {
  const head = useRef<THREE.Group>(null!);
  const mats = useLerpedFlowerMaterials(petalColor, centerColor);

  const roundedGeo = useMemo(() => makePetalGeometry(0.36, 0.95, 0.17, seed), [seed]);
  const pointedGeo = useMemo(() => makePointedPetalGeometry(0.2, seed + 3), [seed]);
  const leafGeo = useMemo(() => makePetalGeometry(0.4, 1, 0.12, seed + 7), [seed]);
  const geo = petalShape === "pointed" ? pointedGeo : roundedGeo;

  useEffect(
    () => () => {
      roundedGeo.dispose();
      pointedGeo.dispose();
      leafGeo.dispose();
    },
    [roundedGeo, pointedGeo, leafGeo]
  );

  useFrame(({ clock }) => {
    if (reduced || !head.current) return;
    head.current.rotation.z = Math.sin(clock.elapsedTime * 0.6 + seed * 2.1) * 0.035;
  });

  const ringKey = `${petalShape}-${petalCount}`;
  const innerCount = Math.max(3, petalCount - 1);

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
                  rotation={[1.15, 0, 0.15]}
                  scale={[0.55, 0.42, 0.55]}
                  position={[0, 0.01, 0.03]}
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
            <mesh geometry={leafGeo} material={mats.leaf} scale={[0.55, 0.42, 0.55]} />
          </group>
        ))}

      {/* blossom head */}
      <group ref={head} position={[0, headY, 0]}>
        <Pop key={`outer-${ringKey}`} reduced={reduced}>
          {Array.from({ length: petalCount }).map((_, i) => {
            const j = rnd(seed + i * 3.7);
            return (
              <group key={i} rotation={[0, (i / petalCount) * Math.PI * 2 + j * 0.4, 0]}>
                <mesh
                  geometry={geo}
                  material={mats.outer}
                  rotation={[1.05 + j * 0.12, 0, 0]}
                  position={[0, 0.01, 0.05]}
                  scale={[0.92 + j * 0.16, 0.2, 1]}
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
                  geometry={geo}
                  material={mats.inner}
                  rotation={[0.5 + j * 0.1, 0, 0]}
                  position={[0, 0.02, 0.03]}
                  scale={[0.8 + j * 0.1, 0.155, 0.9]}
                />
              </group>
            );
          })}
        </Pop>
        <mesh material={mats.center}>
          <sphereGeometry args={[0.1, 12, 12]} />
        </mesh>
      </group>
    </group>
  );
}

/* ================================================================
   Bouquet wrap (cream paper + ribbon that lerps colour)
   ================================================================ */

function BouquetWrap({ ribbonColor }: { ribbonColor: string }) {
  const ribbon = useMemo(() => new THREE.MeshStandardMaterial({ color: ribbonColor, roughness: 0.85 }), []);
  const cream = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#F6EBDA", roughness: 0.95, side: THREE.DoubleSide }),
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
  });

  return (
    <group>
      <mesh position={[0, 0.36, 0]} material={cream}>
        <cylinderGeometry args={[0.42, 0.16, 0.72, 18, 1, true]} />
      </mesh>
      <mesh position={[0, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]} material={ribbon}>
        <torusGeometry args={[0.33, 0.035, 10, 28]} />
      </mesh>
      <mesh position={[0, 0.44, 0.33]} material={ribbon}>
        <sphereGeometry args={[0.045, 10, 10]} />
      </mesh>
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
    return { scale: config.bouquetCount === 7 ? 0.95 : 1.05, y: 0 };
  }
  if (config.stem === "tall") return { scale: 0.85, y: 0 };
  if (config.stem === "short") return { scale: 1.4, y: 0.05 };
  return { scale: 2.1, y: 0.2 }; // floating bloom
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
    const radius = n <= 3 ? 0.26 : n <= 5 ? 0.36 : 0.44;
    const base = config.stem === "tall" ? 1.32 : 0.95;
    return Array.from({ length: n }).map((_, i) => {
      const a = (i / n) * Math.PI * 2 + 0.4;
      const headY = base + rnd(i + 41) * 0.35;
      // lean each stem inward (real bouquets gather into the wrap),
      // so heads converge to ~55% of the ring radius
      const headRing = radius * 0.55;
      const tilt = Math.atan2(radius - headRing, headY);
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

/** Camera nudge so every framing looks at the composition. */
function Rig() {
  const { camera } = useThree();
  useFrame(() => camera.lookAt(0, 0.85, 0));
  return null;
}

/**
 * The Design Studio scene — a fully configurable crochet flower/bouquet.
 * Drag to spin (mobile-safe), gentle idle turn, animated transitions for
 * every control: colours lerp, petals/stems pop in, framing glides.
 */
export default function DesignScene({ config }: { config: DesignConfig }) {
  const reduce = useReducedMotion();

  return (
    <Canvas
      className="!absolute inset-0 cursor-grab active:cursor-grabbing"
      dpr={[1, 1.75]}
      camera={{ position: [0.7, 1.9, 5.2], fov: 33 }}
      gl={{ antialias: true, alpha: true }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.95} color="#FFF6EC" />
      <directionalLight position={[2.5, 4, 3]} intensity={1.05} color="#FFFFFF" />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} color="#FFDCE4" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.0} color="#FFF3E4" position={[0, 3, 4]} scale={[6, 3, 1]} target={[0, 0.8, 0]} />
        <Lightformer form="rect" intensity={0.45} color="#FFDEE7" position={[-4, 1.5, -3]} scale={[5, 2, 1]} target={[0, 0.8, 0]} />
      </Environment>

      <Scene config={config} reduced={!!reduce} />
      <Rig />
      <ContactShadows
        position={[0, -0.15, 0]}
        opacity={0.28}
        scale={8}
        blur={3}
        far={2.5}
        resolution={512}
        color="#96566A"
      />
    </Canvas>
  );
}
