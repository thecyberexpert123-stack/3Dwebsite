import * as THREE from "three";

/** Deterministic pseudo-random in [0,1) from a seed — stable across renders,
 *  so "handmade imperfection" never flickers between frames. */
export function rnd(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Jitter vertices slightly for an imperfect, handmade look. */
export function wobbleGeometry(
  geo: THREE.BufferGeometry,
  amount: number,
  seed: number
): THREE.BufferGeometry {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const r1 = rnd(seed + i * 0.37);
    const r2 = rnd(seed + i * 0.91 + 7.3);
    const r3 = rnd(seed + i * 0.53 + 13.7);
    pos.setXYZ(
      i,
      pos.getX(i) + (r1 - 0.5) * amount,
      pos.getY(i) + (r2 - 0.5) * amount,
      pos.getZ(i) + (r3 - 0.5) * amount
    );
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** A crochet petal pointing +Y with its base at the origin (unit-ish scale). */
export function makePetalGeometry(
  width = 0.36,
  length = 0.95,
  thickness = 0.16,
  seed = 1
): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.5, 10, 12);
  geo.scale(width, length, thickness);
  geo.translate(0, 0.5, 0);
  return wobbleGeometry(geo, 0.035, seed);
}

/** A soft extruded heart, centred, with a handmade wobble. */
export function makeHeartGeometry(seed = 5): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.6);
  s.bezierCurveTo(-0.12, -0.35, -0.62, -0.05, -0.62, 0.25);
  s.bezierCurveTo(-0.62, 0.55, -0.2, 0.62, 0, 0.32);
  s.bezierCurveTo(0.2, 0.62, 0.62, 0.55, 0.62, 0.25);
  s.bezierCurveTo(0.62, -0.05, 0.12, -0.35, 0, -0.6);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.07,
    bevelSegments: 3,
    curveSegments: 14,
  });
  geo.center();
  return wobbleGeometry(geo, 0.02, seed);
}

/** A loose yarn thread draped along a smooth curve. */
export function makeThreadGeometry(
  points: [number, number, number][],
  radius = 0.015
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.TubeGeometry(curve, 72, radius, 8, false);
}
