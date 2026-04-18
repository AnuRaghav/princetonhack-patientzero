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
  const emissive = useMemo(() => (selected ? "#0ea5e9" : "#000000"), [selected]);
  const opacity = selected ? 0.22 : hovered ? 0.12 : 0.025;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(id);
  };

  return (
    <mesh
      position={position}
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
        emissiveIntensity={selected ? 0.26 : hovered ? 0.08 : 0}
        depthWrite={false}
      />
    </mesh>
  );
}
