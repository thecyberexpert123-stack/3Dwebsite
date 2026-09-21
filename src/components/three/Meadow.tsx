"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rnd } from "./geometry";
import { PuffyCloud } from "./parts";

/**
 * Meadow 2.0 — CINEMATIC OUTDOOR WORLD
 * 
 * Research from best 3D sites:
 * - Oryzo: one object with weight needs environment that gives it scale
 * - Explore Primland: landscape flythrough, place explorable from air
 * - Sleep Well Creative: editorial storytelling in 3D world
 * 
 * Upgrades:
 * - Hills: 3-octave noise, erosion ridges, color variation by slope + height
 * - Grass: 5-layer shader (AO root, body, tip, patch, wind light + translucency)
 * - Sky: atmospheric scattering with sun position, better horizon blend
 * - Volumetric: light shafts, aerial perspective fog, distant haze
 * - Life: butterflies with realistic flight, birds, better motes with PBR
 * - Depth: foreground bokeh grass, midground detail, background mountains
 */

export function hillHeight(x: number, z: number): number {
  // 3-octave with ridged noise for more natural terrain
  const n1 = Math.sin(x * 0.55 + 0.4) * 0.34 + Math.cos(z * 0.62 - 0.8) * 0.28;
  const n2 = Math.sin((x + z) * 1.05 + 1.1) * 0.08 + Math.cos(x * 1.8 - z * 1.2) * 0.04;
  const n3 = Math.sin(x * 2.3 + z * 1.7) * 0.02;
  // Ridged for erosion-like detail
  const ridge = 1 - Math.abs(Math.sin(x * 0.9 + z * 0.7)) * 0.15;
  return (n1 + n2 + n3) * ridge - 0.12;
}

type HeightFn = (x: number, z: number) => number;
function makePlateau(inner: number, outer: number): HeightFn {
  return (x, z) => {
    const d = Math.hypot(x, z);
    const k = THREE.MathUtils.smoothstep(d, inner, outer);
    // Smoothstep with extra ease for natural transition
    const eased = k * k * (3 - 2 * k);
    return THREE.MathUtils.lerp(0, hillHeight(x, z), eased);
  };
}

const GRASS_LIGHT = new THREE.Color("#b8d68a");
const GRASS_MID = new THREE.Color("#7eaa5a");
const GRASS_DEEP = new THREE.Color("#4a6b3a");
const GRASS_COOL = new THREE.Color("#6aa38a");
const GRASS_SUN = new THREE.Color("#d4e8a0");
const GRASS_SHADOW = new THREE.Color("#3d5a32");

function Hills({ size = 16, segments = 128, height }: { size?: number; segments?: number; height: HeightFn }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, segments, segments);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const normal = new THREE.Vector3();
    
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = height(x, z);
      pos.setY(i, y);
      
      // Calculate slope for shading
      const hx1 = height(x + 0.1, z);
      const hx2 = height(x - 0.1, z);
      const hz1 = height(x, z + 0.1);
      const hz2 = height(x, z - 0.1);
      normal.set(hx1 - hx2, 0.2, hz1 - hz2).normalize();
      const slope = 1 - Math.abs(normal.y);
      
      const h = THREE.MathUtils.clamp((y + 0.6) / 1.2, 0, 1);
      const mottle = (rnd(i * 0.37) - 0.5) * 0.12;
      const patch = Math.sin(x * 0.8) * Math.cos(z * 0.6) * 0.08;
      
      // Base gradient by height
      c.copy(GRASS_DEEP).lerp(GRASS_MID, THREE.MathUtils.clamp(h * 1.3 + mottle, 0, 1));
      c.lerp(GRASS_LIGHT, THREE.MathUtils.clamp((h - 0.5) * 1.5, 0, 1));
      
      // Slope darkening (steeper = more shadow)
      c.lerp(GRASS_SHADOW, slope * 0.3);
      
      // Sunlit ridges
      if (h > 0.6) c.lerp(GRASS_SUN, (h - 0.6) * 0.8);
      
      // Patch variation
      c.r += patch;
      c.g += patch * 0.8;
      
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, [size, segments, height]);
  
  useEffect(() => () => geo.dispose(), [geo]);
  
  return (
    <mesh geometry={geo} receiveShadow position={[0, -0.003, 0]}>
      <meshStandardMaterial 
        vertexColors 
        roughness={0.9} 
        metalness={0} 
        roughnessMap={null}
      />
    </mesh>
  );
}

// Distant mountains for depth
function DistantHills() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(60, 20, 64, 16);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i) - 12; // Behind main hills
      const h = Math.sin(x * 0.15) * 1.2 + Math.cos(x * 0.08 + z * 0.1) * 0.8 + Math.sin((x+z)*0.05) * 0.5;
      pos.setY(i, h * Math.max(0, 1 - Math.abs(x)/25));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  
  useEffect(() => () => geo.dispose(), [geo]);
  
  return (
    <mesh geometry={geo} position={[0, 0.2, -8]} receiveShadow={false}>
      <meshStandardMaterial color="#8aa87a" roughness={1} transparent opacity={0.6} fog={true} />
    </mesh>
  );
}

const bladeGeometry = (() => {
  const w = 0.014;
  const h = 1;
  const g = new THREE.BufferGeometry();
  const verts = new Float32Array([
    -w, 0, 0, w, 0, 0, -w * 0.85, h * 0.32, 0,
    w, 0, 0, w * 0.85, h * 0.32, 0, -w * 0.85, h * 0.32, 0,
    -w * 0.85, h * 0.32, 0, w * 0.85, h * 0.32, 0, -w * 0.5, h * 0.68, 0,
    w * 0.85, h * 0.32, 0, w * 0.5, h * 0.68, 0, -w * 0.5, h * 0.68, 0,
    -w * 0.5, h * 0.68, 0, w * 0.5, h * 0.68, 0, -w * 0.15, h * 0.92, 0,
    w * 0.5, h * 0.68, 0, w * 0.15, h * 0.92, 0, -w * 0.15, h * 0.92, 0,
    -w * 0.15, h * 0.92, 0, w * 0.15, h * 0.92, 0, 0, h, 0,
  ]);
  g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
  const uv = new Float32Array(verts.length / 3 * 2);
  for (let i = 0; i < verts.length / 3; i++) {
    uv[i * 2] = 0.5;
    uv[i * 2 + 1] = verts[i * 3 + 1];
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
})();

function Grass({
  count,
  radius = 6.8,
  reduced,
  clear = 0.7,
  nearZ = 1.7,
  height,
  scale = 1,
  sunDir,
}: {
  count: number;
  radius?: number;
  reduced: boolean;
  clear?: number;
  nearZ?: number;
  height: HeightFn;
  scale?: number;
  sunDir: [number, number, number];
}) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const uniforms = useMemo(
    () => ({ 
      uTime: { value: 0 }, 
      uSunDir: { value: new THREE.Vector3(...sunDir).normalize() },
      uWindStrength: { value: 1.0 }
    }),
    [sunDir],
  );
  
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uSunDir = uniforms.uSunDir;
      shader.uniforms.uWindStrength = uniforms.uWindStrength;
      
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform float uTime;
           uniform float uWindStrength;
           varying float vBlade;
           varying float vPatch;
           varying float vGust;
           varying float vHeight;
           varying vec3 vWorldPos;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           float bw = uv.y * uv.y * (0.8 + uv.y * 0.4);
           vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
           // Multi-frequency wind
           float wind1 = sin(uTime * 0.9 + ip.x * 0.7 + ip.z * 0.5) * 0.6;
           float wind2 = sin(uTime * 2.1 + ip.z * 1.3 - ip.x * 0.9) * 0.3;
           float wind3 = sin(uTime * 0.4 + ip.x * 0.3) * 0.2;
           float gust = (wind1 + wind2 + wind3) * uWindStrength;
           // Height-based wind response
           float windResponse = bw * (1.0 + uv.y * 0.5);
           transformed.x += gust * 0.18 * windResponse;
           transformed.z += gust * 0.08 * windResponse;
           transformed.y -= abs(gust) * 0.04 * windResponse;
           // Add slight twist
           transformed.x += sin(uv.y * 3.0 + uTime * 0.5) * 0.01 * bw;
           vBlade = uv.y;
           vGust = gust;
           vHeight = ip.y;
           vWorldPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
           // Large patches + small detail
           vPatch = sin(ip.x * 0.5 + 1.7) * sin(ip.z * 0.6 - 0.4) * 0.5
                  + sin(ip.x * 1.8 - ip.z * 1.2) * 0.25
                  + sin(ip.x * 4.2 + ip.z * 3.1) * 0.1;`,
        );
      
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform vec3 uSunDir;
           varying float vBlade;
           varying float vPatch;
           varying float vGust;
           varying float vHeight;
           varying vec3 vWorldPos;`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
           // 5-layer grass: AO root, body, sun tip, patch, wind light
           vec3 rootColor = diffuseColor.rgb * vec3(0.5, 0.58, 0.45);
           vec3 midColor = diffuseColor.rgb;
           vec3 tipColor = mix(diffuseColor.rgb, vec3(0.9, 0.95, 0.6), 0.6);
           tipColor = mix(tipColor, vec3(1.0, 0.98, 0.75), 0.3);
           
           float heightFactor = smoothstep(0.0, 0.35, vBlade);
           float tipFactor = smoothstep(0.5, 1.0, vBlade);
           float aoFactor = 1.0 - smoothstep(0.0, 0.25, vBlade) * 0.35;
           
           vec3 g = mix(rootColor, midColor, heightFactor);
           g = mix(g, tipColor, tipFactor);
           g *= aoFactor;
           g *= 1.0 + vPatch * 0.18;
           g *= 1.0 + vGust * 0.06 * vBlade;
           
           // Height-based desaturation for distance
           float dist = length(vWorldPos.xz);
           float desat = smoothstep(4.0, 8.0, dist) * 0.15;
           g = mix(g, vec3(dot(g, vec3(0.299, 0.587, 0.114))), desat);
           
           diffuseColor.rgb = g;`,
        )
        .replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
           // Translucency + sun scatter
           vec3 V = normalize(vViewPosition);
           vec3 S = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
           float back = clamp(dot(V, -S), 0.0, 1.0);
           float trans = pow(back, 2.5) * vBlade * vBlade * 0.45;
           float edge = pow(1.0 - max(dot(normal, V), 0.0), 2.0) * 0.3;
           gl_FragColor.rgb += vec3(0.95, 0.98, 0.65) * trans;
           gl_FragColor.rgb += vec3(0.8, 0.9, 0.6) * edge * vBlade;`,
        );
    };
    m.customProgramCacheKey = () => "whimlet-grass-2.0";
    return m;
  }, [uniforms]);
  
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const colors = new Float32Array(count * 3);
    let placed = 0;
    
    for (let i = 0; i < count * 4 && placed < count; i++) {
      const a = rnd(i * 1.13 + 3) * Math.PI * 2;
      const r = Math.sqrt(rnd(i * 2.71 + 5)) * radius;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x, z) < clear) continue;
      if (z > nearZ || z < -radius * 0.75) continue;
      
      const y = height(x, z);
      dummy.position.set(x, y - 0.015, z);
      
      // More natural rotation distribution
      const rotY = rnd(i * 5.3) * Math.PI * 2;
      const tiltX = (rnd(i * 4.1) - 0.5) * 0.5;
      const tiltZ = (rnd(i * 6.7) - 0.5) * 0.5;
      dummy.rotation.set(tiltX, rotY, tiltZ);
      
      const s = (0.08 + rnd(i * 7.9) * 0.12) * scale;
      const widthVar = 0.85 + rnd(i * 9.1) * 0.5;
      dummy.scale.set(widthVar, s, 1);
      dummy.updateMatrix();
      m.setMatrixAt(placed, dummy.matrix);
      
      // More varied colors
      const colorRand = rnd(i * 3.3);
      if (colorRand < 0.15) {
        color.copy(GRASS_COOL);
      } else if (colorRand < 0.25) {
        color.copy(GRASS_SUN);
      } else {
        color.copy(GRASS_DEEP).lerp(GRASS_LIGHT, 0.2 + rnd(i * 3.3 + 1) * 0.75);
      }
      
      // Slight variation
      color.r += (rnd(i * 11.3) - 0.5) * 0.05;
      color.g += (rnd(i * 13.7) - 0.5) * 0.05;
      
      colors[placed * 3] = color.r;
      colors[placed * 3 + 1] = color.g;
      colors[placed * 3 + 2] = color.b;
      placed++;
    }
    
    m.count = placed;
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    m.instanceColor.needsUpdate = true;
  }, [count, radius, clear, nearZ, height, scale]);

  useFrame(({ clock }) => {
    uniforms.uTime.value = reduced ? 0 : clock.elapsedTime;
    // Wind varies over time
    uniforms.uWindStrength.value = reduced ? 0 : 0.8 + Math.sin(clock.elapsedTime * 0.2) * 0.3;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[bladeGeometry, material, count]}
      frustumCulled={false}
      castShadow={false}
      receiveShadow
      userData={{ noShadow: true }}
    />
  );
}

function WildFlowers({ count, radius = 4.8, height, inner = 1.1 }: { count: number; radius?: number; height: HeightFn; inner?: number }) {
  const heads = useRef<THREE.InstancedMesh>(null!);
  const stems = useRef<THREE.InstancedMesh>(null!);
  const geo = useMemo(() => new THREE.SphereGeometry(0.038, 8, 6), []);
  const stemGeo = useMemo(() => new THREE.CylinderGeometry(0.002, 0.003, 0.12, 4), []);
  
  useEffect(() => () => {
    geo.dispose();
    stemGeo.dispose();
  }, [geo, stemGeo]);
  
  const palette = useMemo(() => [
    "#ffffff", "#ffd6e4", "#ffe9a8", "#e6d8ff", "#ff9fb8", "#d4f1ea", "#fff0c2"
  ].map((c) => new THREE.Color(c)), []);
  
  useEffect(() => {
    const m = heads.current;
    const s = stems.current;
    if (!m || !s) return;
    const d = new THREE.Object3D();
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const a = rnd(i * 1.7 + 21) * Math.PI * 2;
      const r = inner + Math.sqrt(rnd(i * 2.9 + 22)) * (radius - inner);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = height(x, z);
      
      d.position.set(x, y + 0.08 + rnd(i * 3.1) * 0.06, z);
      d.rotation.set(0, rnd(i * 5.1) * Math.PI * 2, 0);
      d.scale.setScalar(0.75 + rnd(i * 4.3) * 0.8);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      
      // Stem
      d.position.set(x, y + 0.04, z);
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      s.setMatrixAt(i, d.matrix);
      
      const c = palette[Math.floor(rnd(i * 5.9 + 23) * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    m.instanceMatrix.needsUpdate = true;
    s.instanceMatrix.needsUpdate = true;
    m.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
  }, [count, radius, palette, height, inner]);
  
  return (
    <group>
      <instancedMesh ref={stems} args={[stemGeo, undefined, count]} frustumCulled={false} userData={{ noShadow: true }}>
        <meshStandardMaterial color="#6a9a5a" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[geo, undefined, count]} frustumCulled={false} userData={{ noShadow: true }}>
        <meshStandardMaterial roughness={0.65} metalness={0.05} />
      </instancedMesh>
    </group>
  );
}

const skyMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    top: { value: new THREE.Color("#5a9bd4") },
    horizon: { value: new THREE.Color("#c8ddf0") },
    haze: { value: new THREE.Color("#ffe4e8") },
    sunPos: { value: new THREE.Vector3(7, 7.5, -14) },
    time: { value: 0 },
  },
  vertexShader: `
    varying vec3 vDir;
    varying vec3 vWorldPos;
    void main() {
      vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz);
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform vec3 top; uniform vec3 horizon; uniform vec3 haze;
    uniform vec3 sunPos; uniform float time;
    varying vec3 vDir;
    varying vec3 vWorldPos;
    void main() {
      float h = clamp(vDir.y, -0.15, 1.0);
      // Atmospheric perspective
      float atm = pow(1.0 - h, 1.5);
      vec3 c = mix(horizon, top, smoothstep(-0.05, 0.45, h));
      // Sun haze with soft glow
      vec3 sunDir = normalize(sunPos);
      float sunDot = dot(vDir, sunDir);
      float sunGlow = pow(max(sunDot, 0.0), 32.0) * 0.8;
      float sunHaze = pow(max(sunDot, 0.0), 4.0) * 0.5;
      // Warm haze near horizon on sun side
      float warm = smoothstep(0.4, -0.08, h) * (0.4 + 0.6 * max(vDir.x * sunDir.x, 0.0));
      c = mix(c, haze, warm * 0.6);
      c += vec3(1.0, 0.9, 0.7) * sunGlow * 0.6;
      c = mix(c, vec3(1.0, 0.92, 0.8), sunHaze * 0.4);
      // Subtle color variation for realism
      c += sin(vDir.x * 8.0 + time * 0.05) * 0.01;
      gl_FragColor = vec4(c, 1.0);
    }`,
});
skyMaterial.toneMapped = false;
skyMaterial.fog = false;

function Sky({ sun }: { sun: [number, number, number] }) {
  const matRef = useRef(skyMaterial);
  useFrame(({ clock }) => {
    matRef.current.uniforms.time.value = clock.elapsedTime;
    matRef.current.uniforms.sunPos.value.set(sun[0], sun[1], sun[2]);
  });
  return (
    <mesh material={matRef.current} renderOrder={-2} userData={{ noShadow: true }} frustumCulled={false}>
      <sphereGeometry args={[50, 32, 20]} />
    </mesh>
  );
}

function Sun({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!group.current) return;
    // Subtle sun pulse
    const s = 1 + Math.sin(clock.elapsedTime * 0.3) * 0.02;
    group.current.scale.setScalar(s);
  });
  
  return (
    <group ref={group} position={position} userData={{ noShadow: true }}>
      <mesh userData={{ noShadow: true }}>
        <circleGeometry args={[1.1, 48]} />
        <meshBasicMaterial color={[2.8, 2.3, 1.6]} toneMapped={false} fog={false} />
      </mesh>
      {/* Outer glow */}
      <mesh scale={1.8} userData={{ noShadow: true }}>
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial color={[1.8, 1.4, 0.9]} transparent opacity={0.15} toneMapped={false} fog={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

// Volumetric light shafts
function LightShafts({ sun }: { sun: [number, number, number] }) {
  const mesh = useRef<THREE.Mesh>(null!);
  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        sunPos: { value: new THREE.Vector3(...sun) },
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 sunPos;
        uniform float time;
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(sunPos - vWorldPos);
          float shaft = pow(max(dot(dir, vec3(0.0, 1.0, 0.0)), 0.0), 2.0);
          shaft *= 0.15;
          // Noise for volumetric effect
          float noise = sin(vWorldPos.x * 0.5 + time * 0.2) * sin(vWorldPos.z * 0.5) * 0.5 + 0.5;
          shaft *= 0.7 + noise * 0.3;
          // Fade with distance and height
          float fade = smoothstep(0.0, 2.0, vWorldPos.y) * (1.0 - smoothstep(4.0, 8.0, length(vWorldPos.xz)));
          gl_FragColor = vec4(1.0, 0.95, 0.8, shaft * fade * 0.4);
        }`,
    });
  }, [sun]);
  
  useFrame(({ clock }) => {
    mat.uniforms.time.value = clock.elapsedTime;
  });
  
  return (
    <mesh ref={mesh} material={mat} position={[0, 2, 0]} scale={[12, 6, 12]} userData={{ noShadow: true }}>
      <boxGeometry args={[1, 1, 1]} />
    </mesh>
  );
}

function Motes({ count, reduced }: { count: number; reduced: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (rnd(i * 2.3 + 41) - 0.5) * 6,
        y: 0.2 + rnd(i * 4.1 + 42) * 3,
        z: (rnd(i * 6.7 + 43) - 0.5) * 4 - 0.5,
        phase: rnd(i * 1.9 + 44) * Math.PI * 2,
        size: 0.01 + rnd(i * 3.7 + 45) * 0.018,
        speed: 0.2 + rnd(i * 2.1 + 46) * 0.4,
      })),
    [count],
  );
  
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = reduced ? 0 : clock.elapsedTime;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const sway = Math.sin(t * p.speed + p.phase) * 0.3;
      const bob = Math.sin(t * p.speed * 0.7 + p.phase * 1.3) * 0.15;
      dummy.position.set(
        p.x + sway,
        p.y + bob + Math.sin(t * 0.1 + p.phase) * 0.1,
        p.z + Math.cos(t * p.speed * 0.5 + p.phase) * 0.1
      );
      // Twinkle
      const twinkle = 0.5 + 0.5 * Math.sin(t * 1.8 + p.phase);
      dummy.scale.setScalar(p.size * (0.6 + twinkle * 0.6));
      dummy.rotation.set(t * 0.3 + p.phase, t * 0.2 + p.phase, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false} userData={{ noShadow: true }}>
      <sphereGeometry args={[1, 6, 5]} />
      <meshPhysicalMaterial 
        color="#fff8e0" 
        emissive="#fff4c0"
        emissiveIntensity={0.3}
        transparent 
        opacity={0.8} 
        transmission={0.2}
        roughness={0.2}
        toneMapped={false} 
        depthWrite={false} 
      />
    </instancedMesh>
  );
}

const BUTTERFLY_COLORS = ["#ffd1dc", "#e6d8ff", "#fff1a8", "#ffffff", "#ffb7c9", "#d4f1ea"];

function Butterfly({ seed, reduced, area }: { seed: number; reduced: boolean; area: [number, number, number] }) {
  const root = useRef<THREE.Group>(null!);
  const left = useRef<THREE.Mesh>(null!);
  const right = useRef<THREE.Mesh>(null!);
  const body = useRef<THREE.Mesh>(null!);
  const color = BUTTERFLY_COLORS[seed % BUTTERFLY_COLORS.length];
  
  const p = useMemo(
    () => ({
      ax: 0.7 + rnd(seed * 1.3) * (area[0] * 0.5),
      ay: 0.18 + rnd(seed * 2.1) * 0.3,
      az: 0.5 + rnd(seed * 3.7) * (area[2] * 0.5),
      fx: 0.09 + rnd(seed * 4.9) * 0.07,
      fy: 0.45 + rnd(seed * 5.3) * 0.35,
      fz: 0.08 + rnd(seed * 6.1) * 0.06,
      ph: rnd(seed * 7.7) * Math.PI * 2,
      flap: 10 + rnd(seed * 8.3) * 5,
      cx: (rnd(seed * 9.1) - 0.5) * area[0],
      cy: area[1] * 0.5 + rnd(seed * 9.7) * area[1] * 0.6,
      cz: (rnd(seed * 10.3) - 0.5) * area[2],
      scale: 0.07 + rnd(seed * 11.1) * 0.04,
      drift: rnd(seed * 12.1) * 0.5,
    }),
    [seed, area],
  );
  
  const prev = useMemo(() => new THREE.Vector3(), []);
  
  useFrame(({ clock }) => {
    const g = root.current;
    if (!g) return;
    const t = reduced ? p.ph : clock.elapsedTime + p.ph;
    
    // More natural flight path with some randomness
    const x = p.cx + Math.sin(t * p.fx * Math.PI * 2) * p.ax + Math.sin(t * 0.3 + p.drift) * 0.15;
    const z = p.cz + Math.cos(t * p.fz * Math.PI * 2) * p.az + Math.cos(t * 0.25 + p.drift) * 0.12;
    const y = p.cy + Math.sin(t * p.fy * Math.PI * 2) * p.ay + Math.sin(t * p.flap * 0.1) * 0.02;
    
    prev.copy(g.position);
    g.position.set(x, y, z);
    
    if (!reduced && prev.distanceToSquared(g.position) > 1e-8) {
      const dir = new THREE.Vector3().subVectors(g.position, prev).normalize();
      if (dir.length() > 0.001) {
        g.lookAt(prev.x, prev.y, prev.z);
        g.rotateY(Math.PI);
        // Bank into turns
        g.rotateZ(dir.x * 0.3);
      }
    }
    
    const flap = reduced ? 0.5 : 0.25 + Math.abs(Math.sin(t * p.flap)) * 1.1;
    if (left.current) left.current.rotation.z = flap;
    if (right.current) right.current.rotation.z = -flap;
    if (body.current) {
      body.current.rotation.x = Math.sin(t * p.flap * 0.5) * 0.1;
    }
  });
  
  return (
    <group ref={root} scale={p.scale} userData={{ noShadow: true }}>
      <mesh ref={body} position={[0, 0, 0]} userData={{ noShadow: true }}>
        <capsuleGeometry args={[0.02, 0.12, 4, 6]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.8} />
      </mesh>
      <mesh ref={left} position={[0.02, 0, 0]} userData={{ noShadow: true }}>
        <planeGeometry args={[0.5, 0.4]} />
        <meshPhysicalMaterial 
          color={color} 
          roughness={0.4} 
          transmission={0.1}
          thickness={0.05}
          side={THREE.DoubleSide} 
        />
      </mesh>
      <mesh ref={right} position={[-0.02, 0, 0]} userData={{ noShadow: true }}>
        <planeGeometry args={[0.5, 0.4]} />
        <meshPhysicalMaterial 
          color={color} 
          roughness={0.4} 
          transmission={0.1}
          thickness={0.05}
          side={THREE.DoubleSide} 
        />
      </mesh>
    </group>
  );
}

function Butterflies({ count, reduced, area }: { count: number; reduced: boolean; area: [number, number, number] }) {
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <Butterfly key={i} seed={i * 17 + 5} reduced={reduced} area={area} />
      ))}
    </group>
  );
}

export function Meadow({
  density,
  simple,
  reduced,
  sun = [7, 7.5, -14],
  plateauInner = 0.9,
  plateauOuter = 2.4,
  grassClear = 0.7,
  grassNearZ = 1.7,
  grassScale = 1,
  grassCount = 9000,
  butterflies = 0,
  butterflyArea = [3.2, 1.6, 2.4],
}: {
  density: number;
  simple: boolean;
  reduced: boolean;
  sun?: [number, number, number];
  plateauInner?: number;
  plateauOuter?: number;
  grassClear?: number;
  grassNearZ?: number;
  grassScale?: number;
  grassCount?: number;
  butterflies?: number;
  butterflyArea?: [number, number, number];
}) {
  const height = useMemo(() => makePlateau(plateauInner, plateauOuter), [plateauInner, plateauOuter]);
  
  return (
    <group>
      <Sky sun={sun} />
      <Sun position={sun} />
      {!simple && <LightShafts sun={sun} />}
      <DistantHills />
      <Hills size={simple ? 14 : 18} segments={simple ? 64 : 128} height={height} />
      <Grass
        count={Math.round((simple ? grassCount / 3 : grassCount) * Math.max(0.5, density))}
        reduced={reduced}
        clear={grassClear}
        nearZ={grassNearZ}
        height={height}
        scale={grassScale}
        sunDir={sun}
      />
      {!simple && <WildFlowers count={Math.round(85 * density)} height={height} inner={Math.max(1.1, grassClear + 0.4)} />}
      {!simple && <Motes count={Math.round(50 * density)} reduced={reduced} />}
      {!simple && butterflies > 0 && <Butterflies count={butterflies} reduced={reduced} area={butterflyArea} />}
      <group scale={2.8}>
        <PuffyCloud position={[-1.8, 1.0, -2.9]} scale={1.2} color="#FFFFFF" reduced={reduced} phase={0} />
        <PuffyCloud position={[1.7, 1.25, -3.5]} scale={0.9} color="#FFF6F9" reduced={reduced} phase={2} />
        <PuffyCloud position={[0.15, 1.4, -4.4]} scale={0.65} color="#FFFFFF" reduced={reduced} phase={4} />
        <PuffyCloud position={[-0.95, 1.55, -5.0]} scale={0.5} color="#FFFFFF" reduced={reduced} phase={1} />
      </group>
    </group>
  );
}
