"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { GizmoHelper, GizmoViewport, Grid, OrbitControls, Outlines, TransformControls } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { AdaptiveCanvas, SoftGround, StudioLights, StudioShadows } from "./Stage";
import { Post } from "./Post";
import { create as createMat } from "./materials";
import { applyYarnType } from "./studioMaterials";
import { basePrimitive } from "./makerGeometry";

/*
 * drei <Outlines>: the pixel-constant branch (`screenspace={false}`) divides
 * by a `size` uniform that ended up (0,0) here → offsets of Infinity → a
 * spiky halo (seen in QA). The `screenspace` branch pushes vertices along
 * the normal in *object* units, which is deterministic — so we use that and
 * divide the thickness by the part's mean scale to keep the rim ~2–3 px at
 * the working zoom. `angle={0}` shares the live geometry, so the rim
 * follows sculpting.
 */
const OUTLINE_WORLD = 0.02;
import { useQuality } from "@/lib/quality";
import { type MakerDoc, type MakerFinish, type MakerPart } from "@/lib/maker";
import { applyDab, applyGrab, beginGrab, buildAdjacency, encodeOffsets, decodeOffsets, type BrushParams, type GrabState } from "@/lib/sculpt";

/**
 * MakerScene — the 3D half of the free-form Maker (/maker).
 *
 * Two modes, borrowed from Blender's split between Object Mode and Sculpt
 * Mode, because they need different pointer behaviour:
 *  - "object": click selects, drag on empty space orbits, the transform
 *    gizmo (move / rotate / scale) edits the selected part; changes commit
 *    on pointer-up so undo is one step per drag.
 *  - "sculpt": the pointer paints on the selected part only; orbit is
 *    disabled while a stroke is down (left button) but pan/zoom on the
 *    other buttons and two-finger gestures still work. Offsets are kept
 *    per part in a Float32Array and committed (quantised) on stroke end.
 *
 * Rendering reuses the studio's stage: StudioLights, SoftGround, contact
 * shadows, the AAA Post stack on capable tiers, the yarn material system.
 */

export type MakerMode = "object" | "sculpt";
export type GizmoMode = "translate" | "rotate" | "scale";

export type MakerView = {
  mode: MakerMode;
  gizmo: GizmoMode;
  snap: boolean;
  grid: boolean;
  wireframe: boolean;
  turntable: boolean;
  brush: BrushParams;
};

export const DEFAULT_MAKER_VIEW: MakerView = {
  mode: "object",
  gizmo: "translate",
  snap: false,
  grid: true,
  wireframe: false,
  turntable: false,
  brush: { kind: "draw", radius: 0.25, strength: 0.6, falloff: "smooth", invert: false, symmetryX: true },
};

export type SceneApi = {
  /** PNG data URL of the current frame */
  snapshot: () => string | null;
  /** the assembled group, for export */
  root: () => THREE.Group | null;
};

type Props = {
  doc: MakerDoc;
  selectedId: string | null;
  view: MakerView;
  onSelect: (id: string | null) => void;
  /** commit a part change (one undo step) */
  onCommit: (id: string, patch: Partial<MakerPart>) => void;
  /** live, uncommitted transform preview → shown in the numeric fields */
  onPreview?: (id: string, patch: Partial<MakerPart>) => void;
  apiRef?: React.RefObject<SceneApi | null>;
  className?: string;
  /** ⌘/Ctrl held (invert) and Shift held (smooth) — tracked by the page */
  modifiers: React.RefObject<{ ctrl: boolean; shift: boolean }>;
};

/* ------------------------------------------------------------------ */
/* Materials                                                            */
/* ------------------------------------------------------------------ */

function finishMaterial(finish: MakerFinish, color: string): THREE.MeshStandardMaterial {
  const c = new THREE.Color(color);
  switch (finish) {
    case "satin":
      return createMat("satin", c);
    case "pearl":
      return createMat("pearl", c);
    default: {
      const m = createMat("yarn", c);
      applyYarnType(m, finish, c);
      return m;
    }
  }
}

/* ------------------------------------------------------------------ */
/* One part                                                             */
/* ------------------------------------------------------------------ */

type PartHandle = {
  mesh: THREE.Mesh;
  /** live offsets (local space), same length as the geometry position array */
  offsets: Float32Array;
  adjacency: Int32Array[];
  base: Float32Array;
  dirty: boolean;
};

function PartMesh({
  part,
  selected,
  view,
  onPointerDown,
  register,
}: {
  part: MakerPart;
  selected: boolean;
  view: MakerView;
  onPointerDown: (e: ThreeEvent<PointerEvent>, id: string) => void;
  register: (id: string, h: PartHandle | null) => void;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const mirrorRef = useRef<THREE.Mesh>(null!);
  const base = basePrimitive(part.kind);
  const count = base.attributes.position.count;

  // own geometry: base positions + sculpt offsets
  const geo = useMemo(() => {
    const g = base.clone();
    g.attributes.position = (base.attributes.position as THREE.BufferAttribute).clone();
    g.attributes.normal = (base.attributes.normal as THREE.BufferAttribute).clone();
    return g;
  }, [base]);

  const handle = useRef<PartHandle>({
    mesh: null!,
    offsets: new Float32Array(count * 3),
    adjacency: [],
    base: (base.attributes.position as THREE.BufferAttribute).array as Float32Array,
    dirty: false,
  });

  // (re)apply stored sculpt when the document changes it (undo/redo/open)
  const sculptKey = part.sculpt ? `${part.sculpt.count}:${part.sculpt.scale}:${part.sculpt.data.length}:${part.sculpt.data.slice(0, 24)}` : "";
  useLayoutEffect(() => {
    const h = handle.current;
    const stored = part.sculpt ? decodeOffsets(part.sculpt, count) : null;
    h.offsets = stored ?? new Float32Array(count * 3);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i++) arr[i] = h.base[i] + h.offsets[i];
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sculptKey, geo, count]);

  useEffect(() => {
    const h = handle.current;
    h.mesh = ref.current;
    h.adjacency = buildAdjacency((geo.index as THREE.BufferAttribute).array, count);
    register(part.id, h);
    return () => register(part.id, null);
  }, [part.id, geo, count, register]);

  useEffect(() => () => geo.dispose(), [geo]);

  const mat = useMemo(() => finishMaterial(part.finish, part.color), [part.finish]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => mat.dispose(), [mat]);
  const target = useRef(new THREE.Color(part.color));
  useEffect(() => void target.current.set(part.color), [part.color]);
  useFrame((_, dt) => {
    mat.color.lerp(target.current, 1 - Math.exp(-9 * dt));
    const pm = mat as THREE.MeshPhysicalMaterial;
    if ("sheenColor" in pm && part.finish !== "satin" && part.finish !== "pearl") pm.sheenColor.copy(mat.color).lerp(WHITE, part.finish === "fuzzy" ? 0.6 : part.finish === "velvet" ? 0.15 : 0.45);
    mat.wireframe = view.wireframe;
    if (mirrorRef.current) {
      // the twin follows the source transform, mirrored across X
      const m = mirrorRef.current;
      m.position.set(-part.position[0], part.position[1], part.position[2]);
      m.rotation.set(part.rotation[0], -part.rotation[1], -part.rotation[2]);
      m.scale.set(-part.scale[0], part.scale[1], part.scale[2]);
    }
  });

  if (!part.visible) return null;
  const meanScale = Math.max(0.05, (Math.abs(part.scale[0]) + Math.abs(part.scale[1]) + Math.abs(part.scale[2])) / 3);
  return (
    <>
      <mesh
        ref={ref}
        name={part.id}
        geometry={geo}
        material={mat}
        position={part.position}
        rotation={part.rotation}
        scale={part.scale}
        castShadow
        receiveShadow
        onPointerDown={(e) => onPointerDown(e, part.id)}
        userData={{ partId: part.id }}
      >
        {selected && <Outlines screenspace thickness={OUTLINE_WORLD / meanScale} color="#B8456F" opacity={0.9} transparent angle={0} />}
      </mesh>
      {part.mirror && (
        <mesh ref={mirrorRef} geometry={geo} material={mat} castShadow receiveShadow onPointerDown={(e) => onPointerDown(e, part.id)} userData={{ partId: part.id, twin: true }}>
          {selected && <Outlines screenspace thickness={OUTLINE_WORLD / meanScale} color="#B8456F" opacity={0.5} transparent angle={0} />}
        </mesh>
      )}
    </>
  );
}

const WHITE = new THREE.Color("#FFFFFF");

/* ------------------------------------------------------------------ */
/* Brush cursor: a ring that hugs the surface under the pointer          */
/* ------------------------------------------------------------------ */

function BrushCursor({ cursor }: { cursor: React.RefObject<{ point: THREE.Vector3; normal: THREE.Vector3; radius: number; visible: boolean }> }) {
  const ref = useRef<THREE.Mesh>(null!);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const up = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  useFrame(() => {
    const c = cursor.current;
    const m = ref.current;
    if (!m) return;
    m.visible = c.visible;
    if (!c.visible) return;
    m.position.copy(c.point).addScaledVector(c.normal, 0.004);
    q.setFromUnitVectors(up, c.normal);
    m.quaternion.copy(q);
    m.scale.setScalar(c.radius);
  });
  return (
    <mesh ref={ref} renderOrder={10} userData={{ noShadow: true }}>
      <ringGeometry args={[0.92, 1, 48]} />
      <meshBasicMaterial color="#B8456F" transparent opacity={0.9} depthTest={false} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* The scene                                                            */
/* ------------------------------------------------------------------ */

function Inner({ doc, selectedId, view, onSelect, onCommit, onPreview, apiRef, modifiers }: Props) {
  const { gl, scene, camera, size } = useThree();
  const reduce = !!useReducedMotion();
  const quality = useQuality();
  const orbit = useRef<OrbitControlsImpl>(null!);
  const root = useRef<THREE.Group>(null!);
  const handles = useRef(new Map<string, PartHandle>());
  const register = useCallback((id: string, h: PartHandle | null) => {
    if (h) handles.current.set(id, h);
    else handles.current.delete(id);
  }, []);

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      snapshot: () => {
        try {
          gl.render(scene, camera);
          return gl.domElement.toDataURL("image/png");
        } catch {
          return null;
        }
      },
      root: () => root.current,
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, gl, scene, camera]);

  const selected = doc.parts.find((p) => p.id === selectedId) ?? null;
  const selectedMesh = selected ? handles.current.get(selected.id)?.mesh ?? null : null;
  const [gizmoTarget, setGizmoTarget] = useState<THREE.Mesh | null>(null);
  useEffect(() => {
    // handles register after mount; resolve on the next frame
    const id = requestAnimationFrame(() => setGizmoTarget(selected ? handles.current.get(selected.id)?.mesh ?? null : null));
    return () => cancelAnimationFrame(id);
  }, [selected, doc.parts.length]);
  void selectedMesh;

  /* ---------- object mode: selection + gizmo ---------- */
  const dragging = useRef(false);
  const onGizmoChange = useCallback(() => {
    const m = gizmoTarget;
    if (!m || !selected || !onPreview) return;
    onPreview(selected.id, { position: m.position.toArray() as [number, number, number], rotation: [m.rotation.x, m.rotation.y, m.rotation.z], scale: m.scale.toArray() as [number, number, number] });
  }, [gizmoTarget, selected, onPreview]);
  const onGizmoUp = useCallback(() => {
    dragging.current = false;
    if (orbit.current) orbit.current.enabled = true;
    const m = gizmoTarget;
    if (!m || !selected) return;
    // guard against negative / zero scale from the gizmo
    const s = m.scale.toArray().map((v) => Math.max(0.05, Math.abs(v))) as [number, number, number];
    m.scale.fromArray(s);
    onCommit(selected.id, { position: m.position.toArray() as [number, number, number], rotation: [m.rotation.x, m.rotation.y, m.rotation.z], scale: s });
  }, [gizmoTarget, selected, onCommit]);
  const onGizmoDown = useCallback(() => {
    dragging.current = true;
    if (orbit.current) orbit.current.enabled = false;
  }, []);

  /* ---------- sculpt mode ---------- */
  const stroke = useRef<{ active: boolean; id: string | null; grab: GrabState | null; last: THREE.Vector3; lastNdc: THREE.Vector2; plane: THREE.Plane; start: THREE.Vector3 }>({
    active: false,
    id: null,
    grab: null,
    last: new THREE.Vector3(),
    lastNdc: new THREE.Vector2(),
    plane: new THREE.Plane(),
    start: new THREE.Vector3(),
  });
  const cursor = useRef({ point: new THREE.Vector3(), normal: new THREE.Vector3(0, 1, 0), radius: 0.25, visible: false });
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), n: new THREE.Vector3(), inv: new THREE.Matrix4(), nm: new THREE.Matrix3(), ray: new THREE.Ray() }), []);

  const ndc = (e: PointerEvent | ThreeEvent<PointerEvent>): THREE.Vector2 => {
    const rect = gl.domElement.getBoundingClientRect();
    const ev = "nativeEvent" in e ? e.nativeEvent : e;
    return new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
  };

  /** Raycast the selected part; returns local point + local normal. */
  const hitSelected = (pointer: THREE.Vector2): { point: THREE.Vector3; normal: THREE.Vector3; world: THREE.Vector3; worldNormal: THREE.Vector3 } | null => {
    if (!selected) return null;
    const h = handles.current.get(selected.id);
    if (!h?.mesh) return null;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(h.mesh, false);
    const hit = hits[0];
    if (!hit?.face) return null;
    const face = hit.face;
    const world = hit.point.clone();
    tmp.inv.copy(h.mesh.matrixWorld).invert();
    const point = world.clone().applyMatrix4(tmp.inv);
    tmp.nm.getNormalMatrix(h.mesh.matrixWorld);
    const worldNormal = face.normal.clone().applyMatrix3(tmp.nm).normalize();
    const normal = face.normal.clone();
    return { point, normal, world, worldNormal };
  };

  const brushParams = (): BrushParams => {
    const mods = modifiers.current;
    const b = view.brush;
    return { ...b, kind: mods.shift ? "smooth" : b.kind, invert: mods.ctrl !== b.invert };
  };

  /** local-space radius for the selected part (brush radius is in world units) */
  const localRadius = (h: PartHandle) => {
    const s = h.mesh.scale;
    const mean = (Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.z)) / 3 || 1;
    return view.brush.radius / mean;
  };

  const refreshGeometry = (h: PartHandle) => {
    const g = h.mesh.geometry as THREE.BufferGeometry;
    const pos = g.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i++) arr[i] = h.base[i] + h.offsets[i];
    pos.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
    h.dirty = true;
  };

  const dab = (h: PartHandle, local: THREE.Vector3, localNormal: THREE.Vector3) => {
    const g = h.mesh.geometry as THREE.BufferGeometry;
    const pos = g.attributes.position as THREE.BufferAttribute;
    const nrm = g.attributes.normal as THREE.BufferAttribute;
    const p = brushParams();
    const params: BrushParams = { ...p, radius: localRadius(h) };
    const arr = pos.array as Float32Array;
    const moved = applyDab(arr, nrm.array, h.adjacency, pos.count, params, { point: [local.x, local.y, local.z], normal: [localNormal.x, localNormal.y, localNormal.z] });
    if (!moved) return;
    for (let i = 0; i < arr.length; i++) h.offsets[i] = arr[i] - h.base[i];
    pos.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
    h.dirty = true;
  };

  const endStroke = () => {
    const s = stroke.current;
    if (!s.active) return;
    s.active = false;
    if (orbit.current) orbit.current.enabled = true;
    const h = s.id ? handles.current.get(s.id) : null;
    if (h && h.dirty && s.id) {
      h.dirty = false;
      const g = h.mesh.geometry as THREE.BufferGeometry;
      onCommit(s.id, { sculpt: encodeOffsets(h.offsets, g.attributes.position.count) });
    }
    s.grab = null;
    s.id = null;
  };

  const onPartPointerDown = (e: ThreeEvent<PointerEvent>, id: string) => {
    if (view.mode === "object") {
      if (dragging.current) return;
      e.stopPropagation();
      onSelect(id);
      return;
    }
    // sculpt: only the selected part is paintable; clicking another selects it
    if (id !== selectedId) {
      e.stopPropagation();
      onSelect(id);
      return;
    }
    if (e.button !== 0) return;
    e.stopPropagation();
    const h = handles.current.get(id);
    if (!h) return;
    const pointer0 = ndc(e);
    const hit = hitSelected(pointer0);
    if (!hit) return;
    if (orbit.current) orbit.current.enabled = false;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const s = stroke.current;
    s.active = true;
    s.id = id;
    s.last.copy(hit.world);
    s.lastNdc.copy(pointer0);
    const p = brushParams();
    if (p.kind === "grab") {
      const g = h.mesh.geometry as THREE.BufferGeometry;
      s.grab = beginGrab((g.attributes.position as THREE.BufferAttribute).array as Float32Array, g.attributes.position.count, { ...p, radius: localRadius(h) }, [hit.point.x, hit.point.y, hit.point.z]);
      // drag on a camera-facing plane through the hit point
      s.plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(tmp.n).negate(), hit.world);
      s.start.copy(hit.world);
    } else {
      dab(h, hit.point, hit.normal);
    }
  };

  // pointer move / up on the canvas element (works even when the pointer leaves the mesh)
  useEffect(() => {
    const el = gl.domElement;
    const move = (ev: PointerEvent) => {
      const s = stroke.current;
      if (view.mode !== "sculpt") {
        cursor.current.visible = false;
        return;
      }
      const pointer = ndc(ev);
      if (s.active && s.id) {
        const h = handles.current.get(s.id);
        if (!h) return;
        if (s.grab) {
          raycaster.setFromCamera(pointer, camera);
          const hitP = raycaster.ray.intersectPlane(s.plane, tmp.v);
          if (!hitP) return;
          // world delta → local delta
          tmp.inv.copy(h.mesh.matrixWorld).invert();
          const a = s.start.clone().applyMatrix4(tmp.inv);
          const b = hitP.clone().applyMatrix4(tmp.inv);
          const g = h.mesh.geometry as THREE.BufferGeometry;
          applyGrab((g.attributes.position as THREE.BufferAttribute).array as Float32Array, s.grab, [b.x - a.x, b.y - a.y, b.z - a.z]);
          const arr = (g.attributes.position as THREE.BufferAttribute).array as Float32Array;
          for (let i = 0; i < arr.length; i++) h.offsets[i] = arr[i] - h.base[i];
          (g.attributes.position as THREE.BufferAttribute).needsUpdate = true;
          g.computeVertexNormals();
          h.dirty = true;
          cursor.current.point.copy(hitP);
          return;
        }
        const hit = hitSelected(pointer);
        if (!hit) return;
        // Blender-style stroke spacing: dabs land every ~quarter radius
        // *along the path*, interpolated in screen space and re-projected
        // onto the surface, so a fast flick and a slow drag leave the same
        // ridge (instead of piling dabs at the last sample).
        const spacing = view.brush.radius * 0.25;
        const dist = hit.world.distanceTo(s.last);
        const steps = Math.min(8, Math.max(1, Math.round(dist / spacing)));
        if (steps === 1) dab(h, hit.point, hit.normal);
        else {
          for (let k = 1; k <= steps; k++) {
            const t = k / steps;
            const p2 = s.lastNdc.clone().lerp(pointer, t);
            const hk = k === steps ? hit : hitSelected(p2);
            if (hk) dab(h, hk.point, hk.normal);
          }
        }
        s.last.copy(hit.world);
        s.lastNdc.copy(pointer);
        cursor.current.point.copy(hit.world);
        cursor.current.normal.copy(hit.worldNormal);
        cursor.current.visible = true;
      } else {
        const hit = hitSelected(pointer);
        if (hit) {
          cursor.current.point.copy(hit.world);
          cursor.current.normal.copy(hit.worldNormal);
          cursor.current.radius = view.brush.radius;
          cursor.current.visible = true;
        } else cursor.current.visible = false;
      }
    };
    const up = () => endStroke();
    const leave = () => {
      cursor.current.visible = false;
    };
    el.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("pointerleave", leave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, camera, view, selectedId, size]);

  useEffect(() => {
    cursor.current.radius = view.brush.radius;
  }, [view.brush.radius]);

  // turntable
  useFrame((_, dt) => {
    if (view.turntable && !reduce && root.current && !stroke.current.active && !dragging.current) root.current.rotation.y += dt * 0.35;
  });

  // when refreshGeometry is needed after undo we rely on PartMesh's layout effect
  void refreshGeometry;

  const showGizmo = view.mode === "object" && gizmoTarget && selected?.visible;

  return (
    <>
      <fog attach="fog" args={["#FFE6EE", 12, 30]} />
      <StudioLights target={[0, 0.8, 0]} keyIntensity={1.05} shadowSize={4} />
      <group ref={root}>
        {doc.parts.map((p) => (
          <PartMesh key={p.id} part={p} selected={p.id === selectedId} view={view} onPointerDown={onPartPointerDown} register={register} />
        ))}
        {view.mode === "sculpt" && <BrushCursor cursor={cursor} />}
      </group>
      {showGizmo && (
        <TransformControls
          object={gizmoTarget!}
          mode={view.gizmo}
          size={0.85}
          translationSnap={view.snap ? 0.1 : null}
          rotationSnap={view.snap ? Math.PI / 12 : null}
          scaleSnap={view.snap ? 0.1 : null}
          onMouseDown={onGizmoDown}
          onMouseUp={onGizmoUp}
          onObjectChange={onGizmoChange}
        />
      )}
      {/* click on empty space clears the selection (object mode) */}
      <mesh
        position={[0, -0.16, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(e) => {
          if (view.mode === "object" && e.button === 0 && !dragging.current) onSelect(null);
        }}
        visible={false}
        userData={{ noShadow: true }}
      >
        <planeGeometry args={[200, 200]} />
      </mesh>
      <group position={[0, -0.15, 0]}>
        <SoftGround radius={5} color="#FFE9EF" />
      </group>
      {view.grid && <Grid position={[0, -0.145, 0]} args={[10, 10]} cellSize={0.2} cellThickness={0.6} cellColor="#E9B7C8" sectionSize={1} sectionThickness={1.1} sectionColor="#B8456F" fadeDistance={11} fadeStrength={1.2} infiniteGrid />}
      <StudioShadows position={[0, -0.15, 0]} opacity={0.26} scale={9} far={3} resolution={quality.shadowRes} />
      <OrbitControls ref={orbit} makeDefault target={[0, 0.95, 0]} enableDamping dampingFactor={0.08} minDistance={1} maxDistance={14} maxPolarAngle={Math.PI * 0.58} />
      <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
        <GizmoViewport axisColors={["#E38AA8", "#9AC29A", "#8FB5E6"]} labelColor="#5A3E48" hideNegativeAxes />
      </GizmoHelper>
      <Post quality={quality} aoRadius={0.26} aoIntensity={1.3} bloomIntensity={0.5} vignette={0.18} />
    </>
  );
}

/** Soft gradient sky dome (same recipe as the studio backdrop). */
function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { uTop: { value: new THREE.Color("#FFD9E4") }, uHorizon: { value: new THREE.Color("#FFF3F6") } },
        vertexShader: `varying float vH; void main(){ vH = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; varying float vH; void main(){ float t = smoothstep(-0.05, 0.75, vH); gl_FragColor = vec4(mix(uHorizon, uTop, t), 1.0); }`,
      }),
    []
  );
  useEffect(() => () => mat.dispose(), [mat]);
  const { camera } = useThree();
  useEffect(() => {
    camera.layers.enable(1);
  }, [camera]);
  return (
    <mesh material={mat} userData={{ noShadow: true }} frustumCulled={false} layers={1}>
      <sphereGeometry args={[30, 24, 16]} />
    </mesh>
  );
}

export default function MakerScene(props: Props) {
  const quality = useQuality();
  return (
    <AdaptiveCanvas
      statsLabel="maker"
      quality={quality}
      className={props.className ?? "!absolute inset-0"}
      camera={{ position: [2.9, 2.5, 5.2], fov: 35 }}
      gl={{ alpha: false, preserveDrawingBuffer: true }}
      aria-hidden="true"
    >
      <Sky />
      <Inner {...props} />
    </AdaptiveCanvas>
  );
}
