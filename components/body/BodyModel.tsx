"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Mesh, Vector3, type Group } from "three";

type ModelBounds = {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
};

type Props = {
  onBoundsChange?: (bounds: ModelBounds) => void;
};

export function BodyModel({ onBoundsChange }: Props) {
  const { scene } = useGLTF("/models/male_body.glb");
  const rootRef = useRef<Group>(null);

  useEffect(() => {
    scene.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [scene]);

  useLayoutEffect(() => {
    if (!rootRef.current || !onBoundsChange) return;
    const box = new Box3().setFromObject(rootRef.current);
    const size = new Vector3();
    box.getSize(size);
    onBoundsChange({
      min: [box.min.x, box.min.y, box.min.z],
      max: [box.max.x, box.max.y, box.max.z],
      size: [size.x, size.y, size.z],
    });
  }, [onBoundsChange, scene]);

  return (
    <group ref={rootRef}>
      <primitive object={scene} rotation={[0, Math.PI, 0]} scale={0.02} />
    </group>
  );
}

useGLTF.preload("/models/male_body.glb");
