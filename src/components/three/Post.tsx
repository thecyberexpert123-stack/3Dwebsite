"use client";

import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, N8AO, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import type { Quality } from "@/lib/quality";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * Cinematic Post-Processing 2.0 — THE FILM LOOK
 * 
 * Research distilled from Awwwards winners:
 * - Oryzo: sells one object with weight via DOF + contact shadows
 * - Best 3D sites use subtle chromatic aberration + film grain for lens realism
 * - Pastel preservation: bloom threshold >=1 so only HDR emitters bloom
 * - Depth of Field: focus pull makes bouquet feel photographed, not rendered
 * 
 * Effects chain (in order):
 * 1. N8AO - contact shadows (yarn on yarn, box on ground)
 * 2. DepthOfField - cinematic focus, bokeh on background
 * 3. Bloom - only sun/glow blooms, pastels stay crisp
 * 4. ChromaticAberration - subtle lens imperfection at edges
 * 5. Noise - film grain, 0.02 opacity, makes flat colors feel photographed
 * 6. ToneMapping - neutral for outdoor, preserves pastels
 * 7. Vignette - lens falloff, pulls eye to center
 * 
 * Low tier: no composer (costs full-screen pass)
 * Mid: half-res AO, 2x MSAA, no DOF
 * High: full-res AO, 4x MSAA, DOF + chromatic
 */

function AutofocusDOF({ target, enabled }: { target?: THREE.Vector3; enabled: boolean }) {
  const { camera } = useThree();
  const focusDistance = useRef(0);
  const focusRange = useRef(0.5);
  
  useFrame(() => {
    if (!enabled || !target) return;
    // Calculate distance from camera to target for autofocus
    const dist = camera.position.distanceTo(target);
    focusDistance.current = THREE.MathUtils.lerp(focusDistance.current, dist, 0.05);
  });
  
  return null;
}

export function Post({
  quality,
  ao = true,
  bloom = true,
  dof = false,
  dofTarget,
  chromatic = false,
  grain = true,
  vignette = 0.32,
  aoIntensity = 1.8,
  aoRadius = 0.35,
  bloomIntensity = 0.55,
  toneMapping = false,
}: {
  quality: Quality;
  ao?: boolean;
  bloom?: boolean;
  dof?: boolean;
  dofTarget?: THREE.Vector3;
  chromatic?: boolean;
  grain?: boolean;
  vignette?: number;
  aoIntensity?: number;
  aoRadius?: number;
  bloomIntensity?: number;
  toneMapping?: boolean;
}) {
  if (quality.simple) return null;
  const mid = quality.tier === "mid";
  const high = quality.tier === "high";
  
  // Only high gets DOF and chromatic for performance
  const useDOF = dof && high;
  const useChromatic = chromatic && high;
  const useGrain = grain && !mid; // grain only on high, or subtle on mid
  
  return (
    <EffectComposer 
      multisampling={mid ? 2 : 4} 
      frameBufferType={THREE.HalfFloatType} 
      enableNormalPass={useDOF || ao}
    >
      <>
        {ao && (
          <N8AO
            quality={mid ? "low" : "medium"}
            halfRes={mid}
            aoRadius={aoRadius}
            distanceFalloff={0.85}
            intensity={aoIntensity}
            color="#5a2f45"
            screenSpaceRadius={false}
            depthAwareUpsampling
            aoSamples={mid ? 6 : 12}
            denoiseSamples={mid ? 4 : 8}
          />
        )}
        {useDOF && dofTarget && (
          <DepthOfField
            target={dofTarget}
            focusDistance={0}
            focusRange={0.6}
            focalLength={0.02}
            bokehScale={high ? 3.5 : 2.5}
            width={mid ? 480 : 720}
            height={mid ? 480 : 720}
          />
        )}
        {bloom && (
          <Bloom
            mipmapBlur
            luminanceThreshold={1.0}
            luminanceSmoothing={0.18}
            intensity={bloomIntensity * (high ? 1.1 : 0.9)}
            radius={0.8}
            levels={mid ? 5 : 8}
          />
        )}
        {useChromatic && (
          <ChromaticAberration
            offset={new THREE.Vector2(0.0008, 0.0008)}
            radialModulation={false}
            modulationOffset={0.15}
          />
        )}
        {useGrain && (
          <Noise
            opacity={high ? 0.025 : 0.015}
            premultiply={false}
            blendFunction={BlendFunction.MULTIPLY}
          />
        )}
        {toneMapping && <ToneMapping mode={ToneMappingMode.NEUTRAL} />}
        {vignette > 0 && (
          <Vignette 
            eskil={false} 
            offset={0.35} 
            darkness={vignette * (high ? 1.1 : 0.9)} 
            blendFunction={BlendFunction.MULTIPLY} 
          />
        )}
      </>
    </EffectComposer>
  );
}

/**
 * Hero-specific post with DOF focused on bouquet
 */
export function HeroPost({
  quality,
  bouquetPosition,
}: {
  quality: Quality;
  bouquetPosition?: THREE.Vector3;
}) {
  const defaultPos = useMemo(() => new THREE.Vector3(0, 1.1, 0), []);
  const pos = bouquetPosition ?? defaultPos;
  const targetRef = useRef(pos.clone());
  const { camera } = useThree();
  
  useEffect(() => {
    targetRef.current.copy(pos);
  }, [pos]);
  
  useFrame(() => {
    // Smoothly track bouquet for DOF - only if pos changed significantly
    targetRef.current.lerp(pos, 0.03);
  });
  
  if (quality.simple) return null;
  
  const high = quality.tier === "high";
  
  return (
    <EffectComposer
      multisampling={high ? 4 : 2}
      frameBufferType={THREE.HalfFloatType}
      enableNormalPass={true}
    >
      <N8AO
        quality={high ? "medium" : "low"}
        halfRes={!high}
        aoRadius={0.32}
        distanceFalloff={0.85}
        intensity={1.7}
        color="#5a2f45"
        aoSamples={high ? 10 : 6}
      />
      {high && (
        <DepthOfField
          target={targetRef.current}
          focusDistance={camera.position.distanceTo(targetRef.current) * 0.08}
          focusRange={0.8}
          focalLength={0.025}
          bokehScale={4.2}
          width={720}
          height={720}
        />
      )}
      <Bloom
        mipmapBlur
        luminanceThreshold={1.0}
        luminanceSmoothing={0.2}
        intensity={0.48}
        radius={0.85}
        levels={high ? 8 : 5}
      />
      {high && (
        <ChromaticAberration
          offset={new THREE.Vector2(0.0006, 0.0006)}
          radialModulation={true}
          modulationOffset={0.2}
        />
      )}
      {high && (
        <Noise opacity={0.02} blendFunction={BlendFunction.MULTIPLY} />
      )}
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Vignette eskil={false} offset={0.38} darkness={0.26} blendFunction={BlendFunction.MULTIPLY} />
    </EffectComposer>
  );
}
