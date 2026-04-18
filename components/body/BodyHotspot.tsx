"use client";

import { useMemo } from "react";
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
  const emissive = useMemo(() => (selected ? "#0ea5e9" : "#000000"), [selected]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(id);
  };

  return (
    <mesh position={position} onClick={handleClick}>
      <sphereGeometry args={[radius, 24, 24]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={selected ? 0.55 : 0.22}
        emissive={emissive}
        emissiveIntensity={selected ? 0.6 : 0}
      />
    </mesh>
  );
}
