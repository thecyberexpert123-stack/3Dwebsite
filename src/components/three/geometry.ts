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

/**
 * A crochet petal pointing +Y with its base at the origin (unit-ish scale).
 *
 * Shape notes (from the product photos): a worked petal is a plump lens that
 *  - tapers into the centre where it is stitched on,
 *  - cups *across* its width (the edges curl toward the face, like a spoon),
 *  - bows *along* its length so the tip leans out,
 *  - has a softly scalloped rim — the row of stitches around the edge —
 *    not a razor-clean ellipse.
 * Segment counts are a little higher than before so the scallop and the
 * crease actually show in the silhouette (16×18 → 322 verts, still tiny).
 */
export function makePetalGeometry(
  width = 0.36,
  length = 0.95,
  thickness = 0.16,
  seed = 1
): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.5, 16, 18);
  geo.scale(width, length, thickness);
  geo.translate(0, 0.5, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const scallops = 5 + Math.floor(rnd(seed + 0.5) * 2); // 5–6 stitch bumps per side
  const halfW = width * 0.5;
  for (let i = 0; i < pos.count; i++) {
    const yN = THREE.MathUtils.clamp(pos.getY(i) / length, 0, 1);
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // taper toward the base (worked into the centre)
    const taper = 0.55 + 0.45 * Math.sin(Math.min(1, yN * 1.25) * Math.PI * 0.5);
    // scalloped rim: modulate the radial extent with the sphere's azimuth (uv.x)
    const rim = Math.abs(x) / halfW; // 0 at the midrib, 1 at the edge
    const scallop = 1 + 0.045 * Math.sin(uv.getX(i) * Math.PI * 2 * scallops + seed) * rim * Math.sin(yN * Math.PI);
    const nx = x * taper * scallop;
    // cross-cup: edges curl toward the face; length-bow: tip leans out
    const curl = (nx / halfW) ** 2 * thickness * 0.55 * (0.4 + 0.6 * yN);
    const bow = Math.sin(yN * Math.PI) * thickness * 0.25;
    pos.setX(i, nx);
    pos.setZ(i, z * scallop + curl + bow);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return wobbleGeometry(geo, 0.014, seed);
}

/**
 * A crochet leaf: a pointed lens with a folded midrib, base at the origin,
 * pointing +Y. Distinct from a petal — leaves are longer, come to a tip,
 * and crease down the middle so light catches each half differently.
 */
export function makeLeafGeometry(width = 0.34, length = 1, thickness = 0.1, seed = 1): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.5, 14, 16);
  geo.scale(width, length, thickness);
  geo.translate(0, 0.5, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const halfW = width * 0.5;
  for (let i = 0; i < pos.count; i++) {
    const yN = THREE.MathUtils.clamp(pos.getY(i) / length, 0, 1);
    const x = pos.getX(i);
    // pointed at both ends: widest at 40 % of the length
    const profile = Math.pow(Math.sin(Math.PI * Math.pow(yN, 0.8)), 0.75);
    const nx = x * (0.12 + 0.88 * profile);
    // midrib fold (V across the width) + gentle upward bow along the length
    const fold = Math.abs(nx / halfW) * thickness * 0.9;
    const bow = Math.sin(yN * Math.PI) * thickness * 0.5;
    pos.setX(i, nx);
    pos.setZ(i, pos.getZ(i) * (0.6 + 0.4 * profile) + fold + bow);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return wobbleGeometry(geo, 0.012, seed);
}

/**
 * A gently bending stem: a tube along a 3-point curve so no stem is a ruler.
 * Returns the curve too so callers can place leaves and the head *on* it.
 * `lean` is the sideways drift at the top in world units.
 */
export function makeStemCurve(height: number, seed = 1, lean = 0.05): THREE.CatmullRomCurve3 {
  const a = rnd(seed + 3.3) * Math.PI * 2;
  const mid = 0.55 + rnd(seed + 6.1) * 0.15;
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(Math.cos(a) * lean * 0.55, height * mid, Math.sin(a) * lean * 0.55),
    new THREE.Vector3(Math.cos(a) * lean, height, Math.sin(a) * lean),
  ]);
}

export function makeStemGeometry(curve: THREE.CatmullRomCurve3, radius = 0.024): THREE.BufferGeometry {
  return new THREE.TubeGeometry(curve, 12, radius, 8, false);
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
