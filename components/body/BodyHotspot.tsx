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
  /** Brief highlight when an interview symptom maps to this hotspot region */
  pulse?: boolean;
  onSelect: (id: ExamTarget) => void;
};

type VisualState = "pulse" | "selected" | "hovered" | "idle";

function resolveVisualState(
  pulse: boolean | undefined,
  selected: boolean | undefined,
  hovered: boolean,
): VisualState {
  if (pulse) return "pulse";
  if (selected) return "selected";
  if (hovered) return "hovered";
  return "idle";
}

const VISUAL_STYLES: Record<
  VisualState,
  { opacity: number; scale: number; emissiveIntensity: number }
> = {
  pulse: { opacity: 0.95, scale: 1.22, emissiveIntensity: 0.95 },
  selected: { opacity: 0.88, scale: 1.16, emissiveIntensity: 0.75 },
  hovered: { opacity: 0.4, scale: 1.06, emissiveIntensity: 0.24 },
  idle: { opacity: 0.4, scale: 1, emissiveIntensity: 0.04 },
};

function resolveEmissive(state: VisualState, color: string): string {
  if (state === "pulse") return "#fcd34d";
  if (state === "selected" || state === "hovered") return color;
  return "#000000";
}

export function BodyHotspot({
  id,
  position,
  radius = 0.22,
  color = "#38bdf8",
  selected,
  pulse,
  onSelect,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const state = resolveVisualState(pulse, selected, hovered);
  const emissive = useMemo(() => resolveEmissive(state, color), [state, color]);
  const { opacity, scale, emissiveIntensity } = VISUAL_STYLES[state];

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
        emissiveIntensity={emissiveIntensity}
        depthWrite={false}
      />
    </mesh>
  );
}
