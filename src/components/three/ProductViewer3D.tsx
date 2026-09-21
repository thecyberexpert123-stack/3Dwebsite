"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useQuality } from "@/lib/quality";
import { PALETTE } from "@/lib/palette";
import { CrochetFlower } from "./CrochetFlower";
import { YarnBall, SatinBow, StrawberryCharm, FloatingHeart, Sparkle3D } from "./parts";
import { AdaptiveCanvas, StudioLights, SoftGround, Breeze } from "./Stage";
import { Post } from "./Post";
import { shared as finish } from "./materials";
import { useReducedMotion } from "framer-motion";

type Product3DType = "bouquet" | "charm" | "accessory" | "flower" | "gift";

function getProductConfig(type: Product3DType, color: string) {
  switch (type) {
    case "bouquet":
      return { flowers: 5, type: "bouquet" as const, color };
    case "charm":
      return { flowers: 1, type: "charm" as const, color };
    case "accessory":
      return { flowers: 3, type: "accessory" as const, color };
    case "gift":
      return { flowers: 2, type: "gift" as const, color };
    default:
      return { flowers: 1, type: "flower" as const, color };
  }
}

function ProductScene({
  productType,
  color,
  reduced,
}: {
  productType: Product3DType;
  color: string;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null!);
  const config = useMemo(() => getProductConfig(productType, color), [productType, color]);
  const autoRotate = useRef(true);
  const rotationVelocity = useRef(0);
  const lastX = useRef(0);
  const isDragging = useRef(false);

  useFrame((state, dt) => {
    if (!group.current) return;
    
    if (!isDragging.current && autoRotate.current && !reduced) {
      group.current.rotation.y += dt * 0.3;
    }
    
    // Gentle floating
    if (!reduced) {
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.03;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.03;
      group.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  const handlePointerDown = (e: any) => {
    isDragging.current = true;
    autoRotate.current = false;
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging.current || !group.current) return;
    const delta = e.clientX - lastX.current;
    rotationVelocity.current = delta * 0.01;
    group.current.rotation.y += rotationVelocity.current;
    lastX.current = e.clientX;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    setTimeout(() => {
      autoRotate.current = true;
    }, 2000);
  };

  return (
    <>
      <StudioLights keyIntensity={1.0} shadowSize={2.5} />
      
      <group
        ref={group}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {config.type === "bouquet" && (
          <>
            <CrochetFlower position={[-0.08, 0, 0.03]} height={1.2} color={PALETTE.blush} seed={1} scale={0.9} tilt={[0.05, 0, 0.1]} sway={!reduced} />
            <CrochetFlower position={[0.06, 0, -0.05]} height={1.0} color={PALETTE.cream} seed={2} scale={0.85} tilt={[-0.08, 0, -0.06]} sway={!reduced} />
            <CrochetFlower position={[0.04, 0, 0.07]} height={0.9} color={PALETTE.rose} seed={3} scale={0.8} tilt={[0.12, 0, -0.1]} sway={!reduced} />
            <mesh position={[0, 0.32, 0]}>
              <cylinderGeometry args={[0.32, 0.12, 0.65, 16, 1, true]} />
              <primitive object={finish("paper", "#F6EBDA", { side: THREE.DoubleSide })} attach="material" />
            </mesh>
            <SatinBow position={[0, 0.42, 0.32]} rotation={[0.5, 0, 0]} scale={0.75} color={color} />
          </>
        )}
        
        {config.type === "flower" && (
          <CrochetFlower position={[0, 0, 0]} height={1.3} color={color} seed={5} scale={1.1} tilt={[0.05, 0, 0.05]} sway={!reduced} />
        )}
        
        {config.type === "charm" && (
          <>
            <StrawberryCharm position={[0, 0.3, 0]} scale={0.9} seed={3} />
            <FloatingHeart position={[0.3, 0.6, 0.2]} scale={0.15} color={PALETTE.rose} />
            <Sparkle3D position={[-0.25, 0.7, 0.1]} phase={0} reduced={reduced} />
          </>
        )}
        
        {config.type === "accessory" && (
          <>
            <CrochetFlower position={[0, 0, 0]} height={0.8} color={PALETTE.blush} seed={1} scale={0.7} tilt={[0.1, 0, 0]} sway={!reduced} />
            <CrochetFlower position={[0.15, 0, 0.08]} height={0.7} color={PALETTE.lavender} seed={2} scale={0.65} tilt={[0.08, 0, -0.08]} sway={!reduced} />
            <YarnBall position={[0.4, 0.1, 0.2]} radius={0.12} color={PALETTE.cream} rings={6} seed={4} />
          </>
        )}
        
        {config.type === "gift" && (
          <>
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[0.6, 0.4, 0.5]} />
              <primitive object={finish("clay", PALETTE.blush)} attach="material" />
            </mesh>
            <SatinBow position={[0, 0.42, 0]} rotation={[-0.2, 0, 0]} scale={0.8} color={color} />
            <CrochetFlower position={[0.2, 0.4, 0.15]} height={0.5} color={PALETTE.white} seed={7} scale={0.4} sway={false} />
          </>
        )}
        
        <SoftGround radius={1.2} color="#FFE9F0" opacity={0.8} />
      </group>
      
      {/* Invisible drag plane */}
      <mesh position={[0, 0.5, 0]} visible={false}>
        <planeGeometry args={[3, 3]} />
      </mesh>
    </>
  );
}

export function ProductViewer3D({
  productType = "flower",
  color = PALETTE.blush,
  className = "",
}: {
  productType?: Product3DType;
  color?: string;
  className?: string;
}) {
  const quality = useQuality();
  const reduced = !!useReducedMotion();
  const [isInteracting, setIsInteracting] = useState(false);

  return (
    <div className={`relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-ivory to-blush-soft ${className}`}>
      <AdaptiveCanvas
        quality={quality}
        className="!absolute inset-0"
        camera={{ position: [0, 0.8, 2.2], fov: 32 }}
        gl={{ alpha: true, antialias: true }}
        onPointerDown={() => setIsInteracting(true)}
        onPointerUp={() => setIsInteracting(false)}
        style={{ cursor: isInteracting ? "grabbing" : "grab" }}
      >
        <Breeze reduced={reduced}>
          <ProductScene productType={productType} color={color} reduced={reduced} />
          <Post quality={quality} aoIntensity={1.4} aoRadius={0.25} bloomIntensity={0.35} vignette={0.18} />
        </Breeze>
      </AdaptiveCanvas>
      
      {/* Interaction hint */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-cocoa-soft backdrop-blur-sm">
        {isInteracting ? "dragging..." : "drag to rotate • auto-spins"}
      </div>
      
      {/* Depth gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white/40 to-transparent" />
    </div>
  );
}
