"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { Mesh } from "three";

export function BodyModel() {
  const { scene } = useGLTF("/models/male_body.glb");

  useEffect(() => {
    scene.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [scene]);

  return <primitive object={scene} rotation={[0, Math.PI, 0]} scale={0.03} />;
}

useGLTF.preload("/models/male_body.glb");
