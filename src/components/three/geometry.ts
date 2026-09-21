import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { dequantizePetal } from "@/lib/sketch";

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
  const geo = new THREE.SphereGeometry(0.5, 12, 14);
  geo.scale(width, length, thickness);
  geo.translate(0, 0.5, 0);
  // taper toward the base (where the petal is worked into the centre) and
  // cup the tip slightly forward — a lens, not a bead
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const yN = THREE.MathUtils.clamp(pos.getY(i) / length, 0, 1);
    const taper = 0.55 + 0.45 * Math.sin(Math.min(1, yN * 1.25) * Math.PI * 0.5);
    pos.setX(i, pos.getX(i) * taper);
    pos.setZ(i, pos.getZ(i) + Math.sin(yN * Math.PI) * thickness * 0.25);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return wobbleGeometry(geo, 0.018, seed);
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

/** A pointed petal (daisy/sunflower feel) pointing +Y, base at origin. */
export function makePointedPetalGeometry(width = 0.2, seed = 1): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(width, 1, 9, 3);
  geo.translate(0, 0.5, 0);
  return wobbleGeometry(geo, 0.03, seed);
}

/**
 * A petal from the sketch pad: the user's smoothed outline (quantized,
 * see lib/sketch.ts) becomes an extruded, gently cupped piece of crochet.
 * Same conventions as the other petals — pointing +Y, base at origin,
 * length ≈ 0.95.
 */
export function makeCustomPetalGeometry(data: number[], seed = 1): THREE.BufferGeometry {
  const pts = dequantizePetal(data);
  const L = 0.95; // petal length (matches the built-in petals)
  const W = 0.9; // normalized outlines are height 1, half-width ≤ 0.5

  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x * W, pts[0].y * L);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x * W, pts[i].y * L);
  shape.closePath();

  let geo: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.04,
    bevelSegments: 3,
    curveSegments: 3,
  });
  geo.translate(0, 0, -0.05); // centre the thickness on the outline plane

  // weld duplicated vertices so the surface shades smoothly
  geo = mergeVertices(geo, 1e-4);

  // cup the petal so it isn't paper-flat (a soft bow along its length)
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const yNorm = THREE.MathUtils.clamp(pos.getY(i) / L, 0, 1);
    pos.setZ(i, pos.getZ(i) + Math.sin(yNorm * Math.PI) * 0.07);
  }
  pos.needsUpdate = true;

  geo.computeVertexNormals();
  return wobbleGeometry(geo, 0.018, seed); // the handmade imperfection
}
