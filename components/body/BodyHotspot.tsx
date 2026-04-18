"use client";

import { useMemo, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";

import type { ExamTarget } from "@/types/exam";

type Props = {
  id: ExamTarget;
  position: [number, number, number];
  radius?: number;
  color?: string;
  selected?: boolean;
  onSelect: (id: ExamTarget) => void;
};

export function BodyHotspot({
  id,
  position,
  radius = 0.22,
  color = "#38bdf8",
  selected,
  onSelect,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const emissive = useMemo(
    () => (selected || hovered ? color : "#000000"),
    [color, hovered, selected],
  );
  const opacity = selected ? 0.88 : hovered ? 0.4 : 0.4;
  const scale = selected ? 1.16 : hovered ? 1.06 : 1;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(id);
  };

  return (
    <mesh
      position={position}
      scale={[scale, scale, scale]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      <sphereGeometry args={[radius, 24, 24]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        emissive={emissive}
        emissiveIntensity={selected ? 0.75 : hovered ? 0.24 : 0.04}
        depthWrite={false}
      />
    </mesh>
  );
}
