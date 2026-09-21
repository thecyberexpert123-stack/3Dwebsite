"use client";

import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import type { Quality } from "@/lib/quality";

/**
 * The "AAA" finishing pass, shared by every canvas that opts in.
 *
 *  - N8AO  screen-space ambient occlusion: the contact darkening where yarn
 *          meets yarn and a box meets the ground. This is the single biggest
 *          step from "toy render" to "photographed object". Half-res on mid.
 *  - Bloom mipmap bloom with a threshold ≥ 1: ONLY over-bright emitters (the
 *          sun, the glow inside the gift) bloom; pastel surfaces never do,
 *          so the palette stays crisp.
 *  - Vignette a whisper of lens fall-off that pulls the eye to centre.
 *  - MSAA   4× via the composer's multisampled render target (WebGL2), so
 *          edges stay clean once the composer replaces the default AA.
 *
 * The low tier renders nothing here (the composer itself costs a full-screen
 * pass), and everything inside adapts to `quality`.
 *
 * HalfFloat frame buffers keep HDR values alive between passes so the sun
 * (colour 3.2, 2.6, 1.6) still reads as > 1 when Bloom samples it.
 */
export function Post({
  quality,
  ao = true,
  bloom = true,
  vignette = 0.28,
  aoIntensity = 1.6,
  aoRadius = 0.32,
  bloomIntensity = 0.55,
  toneMapping = false,
}: {
  quality: Quality;
  ao?: boolean;
  bloom?: boolean;
  vignette?: number;
  aoIntensity?: number;
  aoRadius?: number;
  bloomIntensity?: number;
  /** filmic (neutral) tone mapping — for opaque outdoor scenes with a real
   *  sun, where a hard clip at 1.0 would look like a video game. The pastel
   *  studio canvases stay `flat` so #FFE3EA still reads as #FFE3EA. */
  toneMapping?: boolean;
}) {
  if (quality.simple) return null;
  const mid = quality.tier === "mid";
  return (
    <EffectComposer multisampling={mid ? 2 : 4} frameBufferType={THREE.HalfFloatType} enableNormalPass={false}>
      <>
        {ao && (
          <N8AO
            quality={mid ? "low" : "medium"}
            halfRes={mid}
            aoRadius={aoRadius}
            distanceFalloff={0.8}
            intensity={aoIntensity}
            color="#5a2f45"
            screenSpaceRadius={false}
            depthAwareUpsampling
          />
        )}
        {bloom && (
          <Bloom
            mipmapBlur
            luminanceThreshold={1.0}
            luminanceSmoothing={0.15}
            intensity={bloomIntensity}
            radius={0.75}
            levels={mid ? 5 : 7}
          />
        )}
        {toneMapping && <ToneMapping mode={ToneMappingMode.NEUTRAL} />}
        {vignette > 0 && <Vignette eskil={false} offset={0.32} darkness={vignette} blendFunction={BlendFunction.MULTIPLY} />}
      </>
    </EffectComposer>
  );
}
