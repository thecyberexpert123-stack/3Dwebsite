"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { rnd } from "./geometry";
import { PuffyCloud } from "./parts";

/**
 * A soft outdoor set for the door: rolling hills, wind-blown grass, a warm
 * sun, a gradient sky. It replaces the studio table so the gift arrives in a
 * *place* — a picnic on a hill — instead of on a rendering stage.
 *
 * Everything here is procedural and cheap:
 *   - Hills: a subdivided plane with a two-octave sine height field, vertex
 *     colours (sunlit ridge → shaded valley), receives the key shadow.
 *   - Grass: one InstancedMesh of tapered blades; a tiny vertex-shader patch
 *     (onBeforeCompile) bends each blade in the wind from its own root, so
 *     the whole field moves for the price of one draw call.
 *   - Sky: a large inside-out sphere with a vertical gradient (shader), not
 *     a texture — it tone-maps with the scene.
 *   - Sun: an emissive disc + a bloom-friendly halo, positioned on the key
 *     light's axis so the shadows agree with what you see.
 */

/* ---------- height field shared by hills + grass placement ---------- */

export function hillHeight(x: number, z: number): number {
  return (
    Math.sin(x * 0.55 + 0.4) * 0.34 +
    Math.cos(z * 0.62 - 0.8) * 0.28 +
    Math.sin((x + z) * 1.05 + 1.1) * 0.08 +
    -0.12
  );
}

/** the flat "picnic spot": a smooth plateau around the origin */
function plateau(x: number, z: number): number {
  const d = Math.hypot(x, z);
  const k = THREE.MathUtils.smoothstep(d, 0.9, 2.4); // 0 at the box, 1 far away
  return THREE.MathUtils.lerp(0, hillHeight(x, z), k);
}

/* ---------- hills ---------- */

// a real lawn in afternoon light: olive in the shade, warm yellow-green on
// the sunlit side — never the neon "game grass" green
const GRASS_LIGHT = new THREE.Color("#b5cf78");
const GRASS_MID = new THREE.Color("#7ea955");
const GRASS_DEEP = new THREE.Color("#4e7a3b");

function Hills({ size = 14, segments = 96 }: { size?: number; segments?: number }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, segments, segments);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = plateau(x, z);
      pos.setY(i, y);
      // colour by height + a little deterministic mottling — a real lawn is
      // never one green
      const h = THREE.MathUtils.clamp((y + 0.6) / 1.2, 0, 1);
      const mottle = (rnd(i * 0.37) - 0.5) * 0.08;
      c.copy(GRASS_DEEP).lerp(GRASS_MID, THREE.MathUtils.clamp(h * 1.4 + mottle, 0, 1));
      c.lerp(GRASS_LIGHT, THREE.MathUtils.clamp((h - 0.55) * 1.6, 0, 1));
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, [size, segments]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} receiveShadow position={[0, -0.003, 0]}>
      <meshStandardMaterial vertexColors roughness={0.92} metalness={0} />
    </mesh>
  );
}

/* ---------- grass ---------- */

const bladeGeometry = (() => {
  // a tapered 3-segment blade, pivot at the root so the wind bends it from the ground
  const w = 0.012;
  const h = 1;
  const g = new THREE.BufferGeometry();
  const verts = new Float32Array([
    -w, 0, 0, w, 0, 0, -w * 0.8, h * 0.35, 0,
    w, 0, 0, w * 0.8, h * 0.35, 0, -w * 0.8, h * 0.35, 0,
    -w * 0.8, h * 0.35, 0, w * 0.8, h * 0.35, 0, -w * 0.45, h * 0.7, 0,
    w * 0.8, h * 0.35, 0, w * 0.45, h * 0.7, 0, -w * 0.45, h * 0.7, 0,
    -w * 0.45, h * 0.7, 0, w * 0.45, h * 0.7, 0, 0, h, 0,
  ]);
  g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
  // uv.y = height along the blade (the shader uses it as bend weight)
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
  radius = 6.2,
  reduced,
  clear = 0.7,
}: {
  count: number;
  radius?: number;
  reduced: boolean;
  /** radius around the origin kept clear (the picnic spot) */
  clear?: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: "#ffffff", // × instanceColor
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform float uTime;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           // bend from the root: weight grows with height^2 so tips move most.
           // Instance position gives each blade its own phase; two waves = gusts.
           float bw = uv.y * uv.y;
           vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
           float gust = sin(uTime * 1.3 + ip.x * 0.9 + ip.z * 0.6) * 0.55
                      + sin(uTime * 2.7 + ip.z * 1.7 - ip.x * 1.1) * 0.25;
           transformed.x += gust * 0.16 * bw;
           transformed.z += gust * 0.06 * bw;
           transformed.y -= abs(gust) * 0.03 * bw;`,
        );
    };
    m.customProgramCacheKey = () => "whimlet-grass";
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
    for (let i = 0; i < count * 3 && placed < count; i++) {
      const a = rnd(i * 1.13 + 3) * Math.PI * 2;
      const r = Math.sqrt(rnd(i * 2.71 + 5)) * radius;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x, z) < clear) continue;
      // nothing right under the lens (camera sits at z ≈ 3) or on the far
      // back slope it never sees
      if (z > 1.7 || z < -radius * 0.7) continue;
      const y = plateau(x, z);
      dummy.position.set(x, y - 0.01, z);
      dummy.rotation.set((rnd(i * 4.1) - 0.5) * 0.45, rnd(i * 5.3) * Math.PI, (rnd(i * 6.7) - 0.5) * 0.45);
      const s = 0.07 + rnd(i * 7.9) * 0.1;
      dummy.scale.set(0.9 + rnd(i * 9.1) * 0.6, s, 1);
      dummy.updateMatrix();
      m.setMatrixAt(placed, dummy.matrix);
      color.copy(GRASS_DEEP).lerp(GRASS_LIGHT, 0.25 + rnd(i * 3.3) * 0.7);
      colors[placed * 3] = color.r;
      colors[placed * 3 + 1] = color.g;
      colors[placed * 3 + 2] = color.b;
      placed++;
    }
    m.count = placed;
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    m.instanceColor.needsUpdate = true;
  }, [count, radius, clear]);

  useFrame(({ clock }) => {
    uniforms.uTime.value = reduced ? 0 : clock.elapsedTime;
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

/* ---------- little wild flowers dotted in the grass ---------- */

function WildFlowers({ count, radius = 4.5 }: { count: number; radius?: number }) {
  const heads = useRef<THREE.InstancedMesh>(null!);
  const geo = useMemo(() => new THREE.SphereGeometry(0.035, 8, 6), []);
  useEffect(() => () => geo.dispose(), [geo]);
  const palette = useMemo(() => ["#ffffff", "#ffd6e4", "#ffe9a8", "#e6d8ff", "#ff9fb8"].map((c) => new THREE.Color(c)), []);
  useEffect(() => {
    const m = heads.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = rnd(i * 1.7 + 21) * Math.PI * 2;
      const r = 1.1 + Math.sqrt(rnd(i * 2.9 + 22)) * (radius - 1.1);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      d.position.set(x, plateau(x, z) + 0.06 + rnd(i * 3.1) * 0.05, z);
      d.scale.setScalar(0.8 + rnd(i * 4.3) * 0.7);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      const c = palette[Math.floor(rnd(i * 5.9 + 23) * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
  }, [count, radius, palette]);
  return (
    <instancedMesh ref={heads} args={[geo, undefined, count]} frustumCulled={false} userData={{ noShadow: true }}>
      <meshStandardMaterial roughness={0.7} />
    </instancedMesh>
  );
}

/* ---------- sky dome + sun ---------- */

const skyMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    top: { value: new THREE.Color("#6fb0e6") },
    horizon: { value: new THREE.Color("#cfe2f4") },
    haze: { value: new THREE.Color("#ffe6ea") },
  },
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform vec3 top; uniform vec3 horizon; uniform vec3 haze;
    varying vec3 vDir;
    void main() {
      float h = clamp(vDir.y, -0.1, 1.0);
      vec3 c = mix(horizon, top, smoothstep(-0.02, 0.32, h));
      // warm haze just above the horizon on the sun side (+x)
      float warm = smoothstep(0.35, -0.05, h) * (0.5 + 0.5 * vDir.x);
      c = mix(c, haze, warm * 0.55);
      gl_FragColor = vec4(c, 1.0);
    }`,
});
skyMaterial.toneMapped = false;
skyMaterial.fog = false;

function Sky() {
  return (
    <mesh material={skyMaterial} renderOrder={-2} userData={{ noShadow: true }} frustumCulled={false}>
      <sphereGeometry args={[40, 32, 16]} />
    </mesh>
  );
}

function Sun({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} userData={{ noShadow: true }}>
      <mesh userData={{ noShadow: true }}>
        <circleGeometry args={[0.9, 48]} />
        {/* emissive well above 1 so Bloom picks it up — bloom IS the halo */}
        <meshBasicMaterial color={[2.4, 2.0, 1.4]} toneMapped={false} fog={false} />
      </mesh>
    </group>
  );
}

/* ---------- pollen / seeds drifting in the sun ---------- */

function Motes({ count, reduced }: { count: number; reduced: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (rnd(i * 2.3 + 41) - 0.5) * 5,
        y: 0.2 + rnd(i * 4.1 + 42) * 2.4,
        z: (rnd(i * 6.7 + 43) - 0.5) * 3 - 0.5,
        phase: rnd(i * 1.9 + 44) * Math.PI * 2,
        size: 0.012 + rnd(i * 3.7 + 45) * 0.016,
      })),
    [count],
  );
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const t = reduced ? 0 : clock.elapsedTime;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      dummy.position.set(p.x + Math.sin(t * 0.3 + p.phase) * 0.25, p.y + Math.sin(t * 0.5 + p.phase * 1.3) * 0.12, p.z);
      dummy.scale.setScalar(p.size * (0.6 + 0.4 * Math.sin(t * 1.7 + p.phase)));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false} userData={{ noShadow: true }}>
      <sphereGeometry args={[1, 6, 5]} />
      <meshBasicMaterial color={[1.6, 1.5, 1.2]} transparent opacity={0.7} toneMapped={false} depthWrite={false} />
    </instancedMesh>
  );
}

/* ---------- the set ---------- */

export function Meadow({
  density,
  simple,
  reduced,
  sun = [7, 7.5, -14],
}: {
  density: number;
  simple: boolean;
  reduced: boolean;
  sun?: [number, number, number];
}) {
  return (
    <group>
      <Sky />
      <Sun position={sun} />
      <Hills segments={simple ? 48 : 96} />
      <Grass count={Math.round((simple ? 3000 : 9000) * Math.max(0.5, density))} reduced={reduced} />
      {!simple && <WildFlowers count={Math.round(70 * density)} />}
      {!simple && <Motes count={Math.round(40 * density)} reduced={reduced} />}
      {/* clouds — large and far so they sit in the sky, not on the hill */}
      <group scale={2.6}>
        <PuffyCloud position={[-1.7, 0.95, -2.8]} scale={1.15} color="#FFFFFF" reduced={reduced} phase={0} />
        <PuffyCloud position={[1.6, 1.2, -3.4]} scale={0.85} color="#FFF6F9" reduced={reduced} phase={2} />
        <PuffyCloud position={[0.1, 1.35, -4.2]} scale={0.6} color="#FFFFFF" reduced={reduced} phase={4} />
        <PuffyCloud position={[-0.9, 1.5, -4.8]} scale={0.45} color="#FFFFFF" reduced={reduced} phase={1} />
      </group>
    </group>
  );
}
