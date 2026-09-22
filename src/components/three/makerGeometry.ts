import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { makeHeartGeometry, makeLeafGeometry, makePetalGeometry } from "./geometry";
import { PRIMITIVE_SEGMENTS, type PrimitiveKind } from "@/lib/maker";

/**
 * Maker primitives — one deterministic, *welded* geometry per kind.
 *
 * Welding (mergeVertices) matters for sculpting: three's SphereGeometry has
 * a duplicated seam column and pole fans; without welding, a brush would
 * tear the seam open. After welding every vertex is unique, so the sculpt
 * offset array indexes the mesh 1:1 and smooth normals are continuous.
 *
 * All primitives fit roughly inside a unit cube centred at the origin
 * (1 unit = 5 cm), so `scale` in the document is intuitive.
 */

const cache = new Map<PrimitiveKind, THREE.BufferGeometry>();

function build(kind: PrimitiveKind): THREE.BufferGeometry {
  const s = PRIMITIVE_SEGMENTS[kind];
  let g: THREE.BufferGeometry;
  switch (kind) {
    case "ball":
      g = new THREE.SphereGeometry(0.5, s.a, s.b);
      break;
    case "egg": {
      g = new THREE.SphereGeometry(0.5, s.a, s.b);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i) / 0.5; // -1..1
        // narrower at the top, fuller at the bottom
        const k = 1 - 0.18 * y;
        p.setX(i, p.getX(i) * k);
        p.setZ(i, p.getZ(i) * k);
        p.setY(i, p.getY(i) * 1.15);
      }
      break;
    }
    case "tube":
      g = new THREE.CapsuleGeometry(0.25, 0.6, s.b, s.a);
      break;
    case "cone":
      g = new THREE.ConeGeometry(0.5, 1, s.a, s.b, false);
      break;
    case "ring":
      g = new THREE.TorusGeometry(0.36, 0.14, s.a, s.b);
      break;
    case "heart":
      g = makeHeartGeometry(3, 0);
      g.scale(0.8, 0.8, 1);
      break;
    case "petal":
      g = makePetalGeometry(0.6, 1, 0.22, 4, 0);
      g.translate(0, -0.5, 0);
      break;
    case "leaf":
      g = makeLeafGeometry(0.5, 1, 0.14, 2, 0);
      g.translate(0, -0.5, 0);
      break;
    case "cube":
      g = new RoundedBoxGeometry(0.9, 0.9, 0.9, s.a, 0.12);
      break;
    case "disc":
      g = new THREE.CylinderGeometry(0.5, 0.5, 0.16, s.a, 1);
      break;
  }
  // mergeVertices hashes *every* attribute, so seam columns (different UVs)
  // and hard-edge duplicates (different normals) would survive — weld on
  // position alone, then rebuild normals and a simple spherical UV so the
  // knit textures still have something to map onto.
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  const welded = mergeVertices(g, 1e-4);
  g.dispose();
  const pos = welded.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    uv[i * 2] = (Math.atan2(z, x) / (Math.PI * 2) + 0.5) * 3;
    uv[i * 2 + 1] = (Math.atan2(y, Math.hypot(x, z)) / Math.PI + 0.5) * 2;
  }
  welded.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  welded.computeVertexNormals();
  welded.computeBoundingSphere();
  return welded;
}

/** Shared base geometry (never mutated; parts clone it before sculpting). */
export function basePrimitive(kind: PrimitiveKind): THREE.BufferGeometry {
  let g = cache.get(kind);
  if (!g) {
    g = build(kind);
    cache.set(kind, g);
  }
  return g;
}

/** Vertex count of a primitive — the contract a sculpt offset array must match. */
export function primitiveVertexCount(kind: PrimitiveKind): number {
  return basePrimitive(kind).attributes.position.count;
}
