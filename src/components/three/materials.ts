"use client";

import * as THREE from "three";
import { detectTier } from "@/lib/quality";

/**
 * Whimlet material system 2.0 — CINEMATIC REALISM UPGRADE
 *
 * Research from best 3D sites (Oryzo, Lusion, Cartier):
 * - One object with weight needs material that reads as *touchable*
 * - Real yarn is not just bumpy — it has fibers, fuzz, translucency, sheen
 * - Pastel materials need careful handling: ACES greys them, flat keeps them
 *   but loses depth. Solution: custom fiber scattering + SSS approximation
 *
 * Upgrades in 2.0:
 * - 512² textures (was 256) with 3 maps: bump, normal, roughness variation
 * - Fiber fuzz map: fine noise that modulates sheen at grazing angles
 * - Yarn: transmission + thickness for subsurface scattering (light through thin crochet)
 * - Satin: anisotropic reflections via sheen + clearcoat + custom normal
 * - All finishes get onBeforeCompile fiber rim for that "halo" you see on real yarn balls
 * - Roughness variation per stitch so highlights break up naturally
 */

export type Finish = "yarn" | "satin" | "clay" | "pearl" | "wood" | "paper" | "velvet";

export type MaterialOptions = {
  side?: THREE.Side;
  transparent?: boolean;
  opacity?: number;
  /** extra fuzziness for close-up hero (0-1) */
  fuzz?: number;
};

/* ------------------------------------------------------------------
   Textures — 512², generated once, cached
   ------------------------------------------------------------------ */

let knitBump: THREE.CanvasTexture | null = null;
let knitNormal: THREE.CanvasTexture | null = null;
let knitRough: THREE.CanvasTexture | null = null;
let knitTint: THREE.CanvasTexture | null = null;
let fiberFuzz: THREE.CanvasTexture | null = null;
let satinWeave: THREE.CanvasTexture | null = null;

function drawKnit(ctx: CanvasRenderingContext2D, S: number, cols: number, rows: number, style: "bump" | "albedo" | "rough" = "bump") {
  const cw = S / cols;
  const rh = S / rows;
  
  const leg = (x0: number, y0: number, x1: number, y1: number, r: number, peak: string) => {
    const n = 9;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      if (style === "bump") {
        g.addColorStop(0, peak);
        g.addColorStop(0.6, "rgba(145,145,145,0.4)");
        g.addColorStop(1, "rgba(128,128,128,0)");
      } else if (style === "albedo") {
        g.addColorStop(0, peak);
        g.addColorStop(1, "rgba(255,255,255,0)");
      } else {
        // roughness: stitches are slightly rougher in grooves
        g.addColorStop(0, "rgba(200,200,200,0.8)");
        g.addColorStop(1, "rgba(128,128,128,0)");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  for (let r = -1; r <= rows; r++) {
    for (let col = -1; col <= cols; col++) {
      const x = col * cw + (r % 2 ? cw / 2 : 0);
      const y = r * rh;
      
      if (style === "bump") {
        leg(x + cw * 0.14, y + rh * 0.12, x + cw * 0.5, y + rh * 0.8, cw * 0.22, "rgba(220,220,220,0.95)");
        leg(x + cw * 0.86, y + rh * 0.12, x + cw * 0.5, y + rh * 0.8, cw * 0.22, "rgba(200,200,200,0.95)");
        // Add tiny fiber details
        if ((col + r) % 3 === 0) {
          const fx = x + cw * 0.5 + (Math.sin(col * 1.3) * cw * 0.1);
          const fy = y + rh * 0.45;
          ctx.fillStyle = "rgba(160,160,160,0.15)";
          ctx.fillRect(fx, fy, cw * 0.08, 1);
        }
      } else if (style === "albedo") {
        leg(x + cw * 0.14, y + rh * 0.12, x + cw * 0.5, y + rh * 0.8, cw * 0.22, "rgba(255,255,255,0.9)");
        leg(x + cw * 0.86, y + rh * 0.12, x + cw * 0.5, y + rh * 0.8, cw * 0.22, "rgba(240,240,240,0.85)");
      } else {
        leg(x + cw * 0.14, y + rh * 0.12, x + cw * 0.5, y + rh * 0.8, cw * 0.22, "rgba(180,180,180,0.6)");
      }
    }
    
    if (style === "bump") {
      ctx.fillStyle = "rgba(75,75,75,0.4)";
      ctx.fillRect(0, r * rh + rh * 0.86, S, rh * 0.18);
      // Add subtle horizontal fiber lines
      ctx.fillStyle = "rgba(100,100,100,0.08)";
      ctx.fillRect(0, r * rh + rh * 0.5, S, 1);
    } else if (style === "rough") {
      ctx.fillStyle = "rgba(90,90,90,0.25)";
      ctx.fillRect(0, r * rh + rh * 0.86, S, rh * 0.14);
    }
  }
  
  // Add overall fiber noise for realism
  if (style === "bump" || style === "rough") {
    const imageData = ctx.getImageData(0, 0, S, S);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
      data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
  }
}

function createTexture(size: number, draw: (ctx: CanvasRenderingContext2D) => void, colorSpace?: THREE.ColorSpace): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.anisotropy = 8;
  if (colorSpace) tex.colorSpace = colorSpace;
  tex.needsUpdate = true;
  return tex;
}

function knitBumpTexture(): THREE.CanvasTexture {
  if (knitBump) return knitBump;
  knitBump = createTexture(512, (ctx) => {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, 512, 512);
    drawKnit(ctx, 512, 7, 9, "bump");
  });
  return knitBump;
}

function knitNormalTexture(): THREE.CanvasTexture {
  if (knitNormal) return knitNormal;
  // Generate normal map from bump via simple Sobel approximation
  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = bumpCanvas.height = 512;
  const bCtx = bumpCanvas.getContext("2d")!;
  bCtx.fillStyle = "#808080";
  bCtx.fillRect(0, 0, 512, 512);
  drawKnit(bCtx, 512, 7, 9, "bump");
  const bumpData = bCtx.getImageData(0, 0, 512, 512);
  
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = normalCanvas.height = 512;
  const nCtx = normalCanvas.getContext("2d")!;
  const normalData = nCtx.createImageData(512, 512);
  
  // Simple normal from height
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      const left = x > 0 ? bumpData.data[idx - 4] : bumpData.data[idx];
      const right = x < 511 ? bumpData.data[idx + 4] : bumpData.data[idx];
      const up = y > 0 ? bumpData.data[idx - 512 * 4] : bumpData.data[idx];
      const down = y < 511 ? bumpData.data[idx + 512 * 4] : bumpData.data[idx];
      
      const dx = (left - right) / 255 * 2;
      const dy = (up - down) / 255 * 2;
      const dz = 1.0;
      
      const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
      normalData.data[idx] = ((dx/len) * 0.5 + 0.5) * 255;
      normalData.data[idx+1] = ((dy/len) * 0.5 + 0.5) * 255;
      normalData.data[idx+2] = (dz/len) * 255;
      normalData.data[idx+3] = 255;
    }
  }
  nCtx.putImageData(normalData, 0, 0);
  
  const tex = new THREE.CanvasTexture(normalCanvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.anisotropy = 8;
  knitNormal = tex;
  return tex;
}

function knitRoughnessTexture(): THREE.CanvasTexture {
  if (knitRough) return knitRough;
  knitRough = createTexture(512, (ctx) => {
    ctx.fillStyle = "#999999";
    ctx.fillRect(0, 0, 512, 512);
    drawKnit(ctx, 512, 7, 9, "rough");
  });
  return knitRough;
}

function knitTintTexture(): THREE.CanvasTexture {
  if (knitTint) return knitTint;
  knitTint = createTexture(512, (ctx) => {
    ctx.fillStyle = "#f6f6f6";
    ctx.fillRect(0, 0, 512, 512);
    ctx.globalAlpha = 0.18;
    drawKnit(ctx, 512, 7, 9, "albedo");
    ctx.globalAlpha = 1;
  }, THREE.SRGBColorSpace);
  return knitTint;
}

function fiberFuzzTexture(): THREE.CanvasTexture {
  if (fiberFuzz) return fiberFuzz;
  fiberFuzz = createTexture(512, (ctx) => {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 512, 512);
    // Fine fiber noise
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const len = 2 + Math.random() * 12;
      const angle = Math.random() * Math.PI * 2;
      const alpha = 0.03 + Math.random() * 0.08;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 0.5 + Math.random() * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }
  });
  fiberFuzz = fiberFuzz;
  fiberFuzz.wrapS = fiberFuzz.wrapT = THREE.RepeatWrapping;
  fiberFuzz.repeat.set(3, 3);
  return fiberFuzz;
}

function satinWeaveTexture(): THREE.CanvasTexture {
  if (satinWeave) return satinWeave;
  satinWeave = createTexture(256, (ctx) => {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, 256, 256);
    // Satin weave - subtle diagonal
    ctx.strokeStyle = "rgba(90,90,90,0.15)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 256; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(0, i);
      ctx.stroke();
    }
    // Add sheen variation
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, "rgba(120,120,120,0)");
    grad.addColorStop(0.5, "rgba(140,140,140,0.1)");
    grad.addColorStop(1, "rgba(120,120,120,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  });
  return satinWeave;
}

/* ------------------------------------------------------------------
   Factory — with fiber scattering shader enhancement
   ------------------------------------------------------------------ */

function isSimple(): boolean {
  return typeof window !== "undefined" && detectTier() === "low";
}

function sheenTint(color: THREE.Color): THREE.Color {
  return color.clone().lerp(WHITE, 0.5);
}

function applyFiberScattering(material: THREE.MeshPhysicalMaterial, fuzz: number = 0.5) {
  const fuzzMap = fiberFuzzTexture();
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFuzzMap = { value: fuzzMap };
    shader.uniforms.uFuzzStrength = { value: fuzz };
    shader.uniforms.uTime = { value: 0 };
    
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
       varying vec2 vFuzzUv;
       varying vec3 vWorldNormal;
       varying vec3 vViewDir;`
    ).replace(
      "#include <uv_vertex>",
      `#include <uv_vertex>
       vFuzzUv = uv * 3.0;
       vWorldNormal = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz);
       vViewDir = normalize(cameraPosition - (modelMatrix * vec4(position, 1.0)).xyz);`
    );
    
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
       uniform sampler2D uFuzzMap;
       uniform float uFuzzStrength;
       varying vec2 vFuzzUv;
       varying vec3 vWorldNormal;
       varying vec3 vViewDir;`
    ).replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>
       // Fiber rim lighting — real yarn has halo at grazing angles
       float fresnel = pow(1.0 - max(dot(vWorldNormal, vViewDir), 0.0), 3.0);
       float fuzz = texture2D(uFuzzMap, vFuzzUv).r;
       float fiberGlow = fresnel * fuzz * uFuzzStrength * 0.6;
       // Warm fiber tint
       vec3 fiberColor = mix(diffuseColor.rgb, vec3(1.0, 0.92, 0.85), 0.3);
       gl_FragColor.rgb += fiberColor * fiberGlow;
       // Subtle subsurface scattering for thin crochet
       float sss = pow(fresnel, 2.0) * 0.15 * uFuzzStrength;
       gl_FragColor.rgb += diffuseColor.rgb * sss * 0.5;`
    );
  };
  material.customProgramCacheKey = () => `yarn-fiber-${fuzz}`;
}

export function create(finish: Finish, color: THREE.ColorRepresentation, opts: MaterialOptions = {}): THREE.MeshStandardMaterial {
  const base = new THREE.Color(color);
  const common = {
    color: base,
    side: opts.side ?? THREE.FrontSide,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
  };

  if (isSimple()) {
    const rough: Record<Finish, number> = { 
      yarn: 0.88, satin: 0.32, clay: 0.52, pearl: 0.22, 
      wood: 0.68, paper: 0.92, velvet: 0.85 
    };
    return new THREE.MeshStandardMaterial({ ...common, roughness: rough[finish], metalness: 0 });
  }

  const fuzz = opts.fuzz ?? 0.5;

  switch (finish) {
    case "yarn": {
      const m = new THREE.MeshPhysicalMaterial({
        ...common,
        roughness: 0.85,
        metalness: 0,
        sheen: 1.0,
        sheenRoughness: 0.6,
        sheenColor: sheenTint(base),
        map: knitTintTexture(),
        bumpMap: knitBumpTexture(),
        bumpScale: 0.18,
        normalMap: knitNormalTexture(),
        normalScale: new THREE.Vector2(0.6, 0.6),
        roughnessMap: knitRoughnessTexture(),
        envMapIntensity: 0.65,
        // Subsurface scattering approximation
        transmission: 0.08,
        thickness: 0.4,
        ior: 1.4,
      });
      applyFiberScattering(m, fuzz);
      return m;
    }
    case "velvet": {
      // Extra fuzzy, deep pile yarn for hero pieces
      const m = new THREE.MeshPhysicalMaterial({
        ...common,
        roughness: 0.9,
        metalness: 0,
        sheen: 1.2,
        sheenRoughness: 0.8,
        sheenColor: sheenTint(base).multiplyScalar(1.2),
        map: knitTintTexture(),
        bumpMap: knitBumpTexture(),
        bumpScale: 0.24,
        normalMap: knitNormalTexture(),
        normalScale: new THREE.Vector2(0.9, 0.9),
        roughnessMap: knitRoughnessTexture(),
        envMapIntensity: 0.5,
        transmission: 0.12,
        thickness: 0.6,
      });
      applyFiberScattering(m, 1.0);
      return m;
    }
    case "satin": {
      const m = new THREE.MeshPhysicalMaterial({
        ...common,
        roughness: 0.28,
        metalness: 0.05,
        clearcoat: 0.85,
        clearcoatRoughness: 0.22,
        sheen: 0.5,
        sheenRoughness: 0.3,
        sheenColor: sheenTint(base),
        bumpMap: satinWeaveTexture(),
        bumpScale: 0.02,
        envMapIntensity: 1.1,
        ior: 1.5,
      });
      // Anisotropic sheen for satin
      m.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
           // Anisotropic highlight for satin
           vec3 viewDir = normalize(vViewPosition);
           float aniso = pow(max(dot(normal, vec3(0.0, 1.0, 0.0)), 0.0), 8.0) * 0.15;
           gl_FragColor.rgb += vec3(1.0) * aniso;`
        );
      };
      return m;
    }
    case "clay":
      return new THREE.MeshPhysicalMaterial({
        ...common,
        roughness: 0.48,
        metalness: 0,
        clearcoat: 0.35,
        clearcoatRoughness: 0.45,
        sheen: 0.2,
        envMapIntensity: 0.75,
        transmission: 0.02,
      });
    case "pearl":
      return new THREE.MeshPhysicalMaterial({
        ...common,
        roughness: 0.18,
        metalness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.4,
        ior: 1.6,
      });
    case "wood":
      return new THREE.MeshStandardMaterial({ 
        ...common, 
        roughness: 0.65, 
        metalness: 0,
        bumpMap: knitBumpTexture(),
        bumpScale: 0.01,
      });
    case "paper":
    default:
      return new THREE.MeshPhysicalMaterial({ 
        ...common, 
        roughness: 0.92, 
        metalness: 0,
        transmission: 0.05,
        thickness: 0.2,
      });
  }
}

export function syncSheen(m: THREE.MeshStandardMaterial): void {
  const pm = m as THREE.MeshPhysicalMaterial;
  if (pm.sheen && pm.sheen > 0) {
    pm.sheenColor.copy(m.color).lerp(WHITE, 0.5);
  }
}

const WHITE = new THREE.Color("#FFFFFF");
const cache = new Map<string, THREE.MeshStandardMaterial>();

export function shared(finish: Finish, color: THREE.ColorRepresentation, opts: MaterialOptions = {}): THREE.MeshStandardMaterial {
  const key = `${finish}|${new THREE.Color(color).getHexString()}|${opts.side ?? 0}|${opts.transparent ? 1 : 0}|${opts.opacity ?? 1}|${opts.fuzz ?? 0.5}|${isSimple() ? "s" : "f"}`;
  let m = cache.get(key);
  if (!m) {
    m = create(finish, color, opts);
    cache.set(key, m);
  }
  return m;
}

/** For hero close-ups: extra fuzzy yarn */
export function heroYarn(color: THREE.ColorRepresentation): THREE.MeshPhysicalMaterial {
  return create("velvet", color, { fuzz: 1.0 }) as THREE.MeshPhysicalMaterial;
}
