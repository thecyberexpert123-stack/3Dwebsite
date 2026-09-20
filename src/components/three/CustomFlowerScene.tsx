"use client";

import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { makePetalGeometry, rnd } from "./geometry";
import { PALETTE } from "./CrochetFlower";

const tmpColor = new THREE.Color();

type CustomFlowerSceneProps = {
  /** Hex colour the flower should drift toward. */
  color: string;
  fallback: React.ReactNode;
};

function CustomizableFlower({
  target,
  reduced,
}: {
  target: React.RefObject<THREE.Color>;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null!);

  const petals = useMemo(
    () => ({
      outer: makePetalGeometry(0.4, 1, 0.18, 21),
      inner: makePetalGeometry(0.34, 0.85, 0.16, 24),
    }),
    []
  );
  const leaf = useMemo(() => makePetalGeometry(0.42, 1, 0.12, 27), []);

  const outerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#F2B9C9", roughness: 0.9 }), []);
  const innerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#E2A2B4", roughness: 0.9 }), []);
  const leafMat = useMemo(() => new THREE.MeshStandardMaterial({ color: PALETTE.sage, roughness: 0.95 }), []);

  useEffect(
    () => () => {
      outerMat.dispose();
      innerMat.dispose();
      leafMat.dispose();
      petals.outer.dispose();
      petals.inner.dispose();
      leaf.dispose();
    },
    [outerMat, innerMat, leafMat, petals, leaf]
  );

  useFrame((state, dt) => {
    const t = target.current;
    if (t) {
      const k = 1 - Math.exp(-4.5 * dt);
      outerMat.color.lerp(t, k);
      innerMat.color.lerp(tmpColor.copy(t).multiplyScalar(0.86), k);
    }
    if (group.current && !reduced) {
      group.current.rotation.y = state.clock.elapsedTime * 0.32;
    }
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={group} position={[0, -0.05, 0]}>
      {Array.from({ length: 7 }).map((_, i) => {
        const j = rnd(30 + i * 3.3);
        return (
          <group key={`o${i}`} rotation={[0, (i / 7) * Math.PI * 2 + j * 0.3, 0]}>
            <mesh
              geometry={petals.outer}
              material={outerMat}
              rotation={[1.02 + j * 0.1, 0, 0]}
              position={[0, 0.02, 0.06]}
              scale={[0.95 + j * 0.1, 0.27, 1]}
            />
          </group>
        );
      })}
      {Array.from({ length: 6 }).map((_, i) => {
        const j = rnd(50 + i * 2.7);
        return (
          <group key={`i${i}`} rotation={[0, (i / 6) * Math.PI * 2 + 0.45 + j * 0.3, 0]}>
            <mesh
              geometry={petals.inner}
              material={innerMat}
              rotation={[0.52 + j * 0.08, 0, 0]}
              position={[0, 0.03, 0.035]}
              scale={[0.85 + j * 0.08, 0.21, 0.9]}
            />
          </group>
        );
      })}
      <mesh>
        <sphereGeometry args={[0.115, 14, 14]} />
        <meshStandardMaterial color={PALETTE.butter} roughness={0.85} />
      </mesh>
      {/* sage leaves tucked under the blossom */}
      <mesh
        geometry={leaf}
        material={leafMat}
        rotation={[1.55, 0, 0.5]}
        position={[-0.2, -0.14, 0]}
        scale={[0.8, 0.55, 0.8]}
      />
      <mesh
        geometry={leaf}
        material={leafMat}
        rotation={[1.55, 0, Math.PI - 0.5]}
        position={[0.2, -0.14, 0]}
        scale={[0.8, 0.55, 0.8]}
      />
    </group>
  );
}

/** A single, slowly turning crochet blossom whose petals lerp to any colour. */
export default function CustomFlowerScene({ color, fallback }: CustomFlowerSceneProps) {
  const target = useRef(new THREE.Color(color));
  const reduce = useReducedMotion();
  useEffect(() => {
    target.current.set(color);
  }, [color]);

  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 1.6]}
      camera={{ position: [0, 0.55, 3.1], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      aria-hidden="true"
      fallback={fallback}
    >
      <ambientLight intensity={0.95} color="#FFF6EC" />
      <directionalLight position={[2.5, 4, 3]} intensity={1.05} color="#FFFFFF" />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} color="#FFDCE4" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.0} color="#FFF3E4" position={[0, 3, 4]} scale={[6, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.45} color="#FFDEE7" position={[-4, 1.5, -3]} scale={[5, 2, 1]} target={[0, 0, 0]} />
      </Environment>
      <CustomizableFlower target={target} reduced={!!reduce} />
      <ContactShadows position={[0, -0.55, 0]} opacity={0.3} scale={7} blur={2.4} far={1.6} resolution={256} color="#96566A" />
    </Canvas>
  );
}
