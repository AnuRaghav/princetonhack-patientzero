"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import {
  Box3,
  Color,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhysicalMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  SkinnedMesh,
  SRGBColorSpace,
  Texture,
  Vector3,
  type Group,
  type Material,
} from "three";

/** World-space AABB → axis-aligned box in `parent` local space (matches sibling hotspot coordinates). */
function worldBoundsToParentLocal(box: Box3, parent: Group): ModelBounds {
  parent.updateWorldMatrix(true, true);
  const inv = new Matrix4().copy(parent.matrixWorld).invert();
  const lb = new Box3();
  const corners: [number, number, number][] = [
    [box.min.x, box.min.y, box.min.z],
    [box.max.x, box.min.y, box.min.z],
    [box.min.x, box.max.y, box.min.z],
    [box.min.x, box.min.y, box.max.z],
    [box.max.x, box.max.y, box.min.z],
    [box.max.x, box.min.y, box.max.z],
    [box.min.x, box.max.y, box.max.z],
    [box.max.x, box.max.y, box.max.z],
  ];
  for (const [x, y, z] of corners) {
    lb.expandByPoint(new Vector3(x, y, z).applyMatrix4(inv));
  }
  const size = new Vector3();
  lb.getSize(size);
  return {
    min: [lb.min.x, lb.min.y, lb.min.z],
    max: [lb.max.x, lb.max.y, lb.max.z],
    size: [size.x, size.y, size.z],
  };
}

/** Tag diffuse-family maps so they decode as sRGB (fixes muddy / gray albedo). */
function setSRGBTexture(tex: Texture | null | undefined) {
  if (!tex) return;
  tex.colorSpace = SRGBColorSpace;
}

/** Any material type that might carry glTF base color maps. */
function tuneMaterial(mat: Material) {
  setSRGBTexture(getMap(mat, "map"));
  setSRGBTexture(getMap(mat, "emissiveMap"));

  if (mat instanceof MeshStandardMaterial || mat instanceof MeshPhysicalMaterial) {
    mat.envMapIntensity = Math.max(mat.envMapIntensity, 1.12);
    if (mat.metalness > 0.45) mat.metalness *= 0.82;
  } else if (mat instanceof MeshLambertMaterial || mat instanceof MeshPhongMaterial) {
    mat.envMapIntensity = Math.max(mat.envMapIntensity ?? 1, 1.12);
  }

  // Truly neutral baseColor + no diffuse map reads monochrome — slight warm bias.
  if (
    mat instanceof MeshStandardMaterial ||
    mat instanceof MeshPhysicalMaterial ||
    mat instanceof MeshLambertMaterial ||
    mat instanceof MeshPhongMaterial ||
    mat instanceof MeshToonMaterial
  ) {
    if (!mat.map && achromaticRoughly(mat.color)) {
      mat.color.multiply(new Color("#fff1e8"));
    }
  }

  mat.needsUpdate = true;
}

function getMap(mat: Material, key: string): Texture | null | undefined {
  const v = (mat as unknown as Record<string, unknown>)[key];
  return v instanceof Texture ? v : undefined;
}

/** Near-gray diffuse color (#ccc-style), common on placeholder rigs. */
function achromaticRoughly(c: Color): boolean {
  const r = c.r;
  const g = c.g;
  const b = c.b;
  const m = Math.max(r, g, b);
  const n = Math.min(r, g, b);
  const spread = m - n;
  const lum = (r + g + b) / 3;
  return lum > 0.22 && lum < 0.92 && spread < 0.08;
}

type ModelBounds = {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
};

const DEFAULT_MODEL_SRC = "/models/male_body.glb";

/** Normalize each GLB to a consistent world size so curated assets aren’t microscopic next to fixed scale={0.02}. */
const FIT_TARGET_MAX_DIMENSION = 2.45;

type Props = {
  /** Served from `public/models/` (must match filename casing on disk). */
  modelSrc?: string;
  onBoundsChange?: (bounds: ModelBounds) => void;
};

export function BodyModel({ modelSrc = DEFAULT_MODEL_SRC, onBoundsChange }: Props) {
  const { scene } = useGLTF(modelSrc);
  const rootRef = useRef<Group>(null);

  useEffect(() => {
    scene.traverse((obj) => {
      if (obj instanceof Mesh || obj instanceof SkinnedMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
      const mats: Material[] = [];
      if (obj instanceof Mesh || obj instanceof SkinnedMesh) {
        const m = obj.material;
        mats.push(...(Array.isArray(m) ? m : [m]));
      }
      for (const mat of mats) {
        if (mat instanceof MeshBasicMaterial) {
          setSRGBTexture(mat.map);
          mat.needsUpdate = true;
          continue;
        }
        tuneMaterial(mat);
      }
    });
  }, [scene]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    root.scale.setScalar(1);
    root.updateWorldMatrix(true, true);

    const fitBox = new Box3().setFromObject(root);
    const fitSize = new Vector3();
    fitBox.getSize(fitSize);
    const maxDim = Math.max(fitSize.x, fitSize.y, fitSize.z, 1e-6);
    root.scale.setScalar(FIT_TARGET_MAX_DIMENSION / maxDim);
    root.updateWorldMatrix(true, true);

    if (!onBoundsChange) return;
    const worldBox = new Box3().setFromObject(root);
    const parent = root.parent as Group | null;
    const payload =
      parent != null ? worldBoundsToParentLocal(worldBox, parent) : (() => {
        const size = new Vector3();
        worldBox.getSize(size);
        return {
          min: [worldBox.min.x, worldBox.min.y, worldBox.min.z] as [number, number, number],
          max: [worldBox.max.x, worldBox.max.y, worldBox.max.z] as [number, number, number],
          size: [size.x, size.y, size.z] as [number, number, number],
        };
      })();
    onBoundsChange(payload);
  }, [onBoundsChange, modelSrc, scene]);

  return (
    <group ref={rootRef}>
      <primitive object={scene} rotation={[0, Math.PI, 0]} />
    </group>
  );
}

useGLTF.preload(DEFAULT_MODEL_SRC);
useGLTF.preload("/models/maria.glb");
useGLTF.preload("/models/jason.glb");
