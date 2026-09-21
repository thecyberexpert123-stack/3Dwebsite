import * as THREE from "three";
import { create as createMat } from "./materials";
import type { PetalPattern, YarnType } from "@/lib/design";

/**
 * Design-studio petal material: the shared yarn finish plus ONE shader
 * injection that gives every petal its colour *pattern* (ombré, dipped,
 * striped), its yarn *type* (cotton / velvet / fuzzy) and an optional
 * glitter thread — all driven by uniforms, so switching an option never
 * recompiles and instanced petal rings share a single program.
 *
 * Pattern coordinate: the petal's own local Y (base 0 → tip `uPetalLen`),
 * read *before* instancing, so it is correct for every petal in a ring.
 */

export const PATTERN_ID: Record<PetalPattern, number> = { solid: 0, ombre: 1, dipped: 2, striped: 3 };

export type PatternUniforms = {
  uAccent: { value: THREE.Color };
  uPattern: { value: number };
  uPetalLen: { value: number };
  uFuzz: { value: number };
  uSparkle: { value: number };
  uTime: { value: number };
};

export type PatternMaterial = THREE.MeshStandardMaterial & { uniformsX: PatternUniforms };

const VERT_DECL = `varying vec3 vPetalP;\n`;
const FRAG_DECL = `
uniform vec3 uAccent;
uniform float uPattern;
uniform float uPetalLen;
uniform float uFuzz;
uniform float uSparkle;
uniform float uTime;
varying vec3 vPetalP;
float whHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
`;

export function makePatternMaterial(base: string, len = 0.95): PatternMaterial {
  const m = createMat("yarn", base) as PatternMaterial;
  const uniformsX: PatternUniforms = {
    uAccent: { value: new THREE.Color("#FFF7F0") },
    uPattern: { value: 0 },
    uPetalLen: { value: len },
    uFuzz: { value: 0 },
    uSparkle: { value: 0 },
    uTime: { value: 0 },
  };
  m.uniformsX = uniformsX;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniformsX);
    shader.vertexShader =
      VERT_DECL +
      shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  vPetalP = position;");
    shader.fragmentShader =
      FRAG_DECL +
      shader.fragmentShader
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
  {
    float t = clamp(vPetalP.y / uPetalLen, 0.0, 1.0);
    float m = 0.0;
    if (uPattern > 0.5 && uPattern < 1.5) {
      m = smoothstep(0.36, 0.96, t);                       // ombré toward the tip
    } else if (uPattern > 1.5 && uPattern < 2.5) {
      m = 1.0 - smoothstep(0.16, 0.42, t);                 // dipped base
    } else if (uPattern > 2.5) {
      float s = fract(t * 3.0 + 0.2);                      // three stripes along the petal
      m = smoothstep(0.40, 0.48, s) * (1.0 - smoothstep(0.90, 0.98, s));
    }
    diffuseColor.rgb = mix(diffuseColor.rgb, uAccent, m);
  }`
        )
        .replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
  {
    vec3 nrm = normalize(vNormal);
    vec3 vd = normalize(vViewPosition);
    float fr = pow(1.0 - abs(dot(nrm, vd)), 3.0);
    // fuzzy yarn: a bright halo of fibres where the surface turns away
    gl_FragColor.rgb += uFuzz * fr * (diffuseColor.rgb * 0.65 + 0.35);
    if (uSparkle > 0.0) {
      vec3 cell = floor(vPetalP * 64.0);
      float h = whHash(cell);
      float tw = 0.5 + 0.5 * sin(uTime * 2.6 + h * 60.0);
      float g = step(0.962, h) * tw * pow(max(0.0, dot(reflect(-vd, nrm), vec3(0.0, 0.35, 0.94))), 6.0);
      gl_FragColor.rgb += uSparkle * g * 1.6;
    }
  }`
        );
  };
  m.customProgramCacheKey = () => "whimlet-petal-pattern";
  return m;
}

/** Yarn type → surface response (shared numbers, applied to any petal/leaf material). */
export function applyYarnType(m: THREE.MeshStandardMaterial, yarn: YarnType, base: THREE.Color): void {
  const pm = m as THREE.MeshPhysicalMaterial;
  const px = m as Partial<PatternMaterial>;
  const isPhysical = "sheen" in pm;
  switch (yarn) {
    case "velvet":
      m.roughness = 0.62;
      if (isPhysical) {
        pm.sheen = 1;
        pm.sheenRoughness = 0.3;
        pm.sheenColor.copy(base).lerp(WHITE, 0.15);
      }
      if (m.bumpMap) m.bumpScale = 0.06;
      if (px.uniformsX) px.uniformsX.uFuzz.value = 0.12;
      break;
    case "fuzzy":
      m.roughness = 0.96;
      if (isPhysical) {
        pm.sheen = 0.6;
        pm.sheenRoughness = 0.8;
        pm.sheenColor.copy(base).lerp(WHITE, 0.6);
      }
      if (m.bumpMap) m.bumpScale = 0.22;
      if (px.uniformsX) px.uniformsX.uFuzz.value = 0.55;
      break;
    default:
      m.roughness = 0.82;
      if (isPhysical) {
        pm.sheen = 0.9;
        pm.sheenRoughness = 0.55;
        pm.sheenColor.copy(base).lerp(WHITE, 0.45);
      }
      if (m.bumpMap) m.bumpScale = 0.16;
      if (px.uniformsX) px.uniformsX.uFuzz.value = 0;
  }
}

const WHITE = new THREE.Color("#FFFFFF");
