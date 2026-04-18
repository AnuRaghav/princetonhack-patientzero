"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useCallback, useMemo, useState } from "react";

import { useSimUiStore } from "@/lib/store/simUiStore";
import type { ExamAction, ExamTarget } from "@/types/exam";
import { BodyHotspot } from "./BodyHotspot";
import { BodyModel } from "./BodyModel";

export type ExamIntent = {
  action: ExamAction;
  target: ExamTarget;
};

type Props = {
  onExam: (intent: ExamIntent) => void;
};

type ModelBounds = {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
};

const REGION_INFO: Record<ExamTarget, { label: string; action: ExamAction; detail: string }> = {
  head: {
    label: "Head / general appearance",
    action: "inspect",
    detail: "General appearance and mental status inspection.",
  },
  chest: {
    label: "Chest / lungs",
    action: "auscultate",
    detail: "Lung and chest auscultation.",
  },
  abdomen: {
    label: "Abdomen",
    action: "palpate",
    detail: "General abdominal palpation.",
  },
  stomach: {
    label: "Stomach / abdomen",
    action: "palpate",
    detail: "Abdominal palpation for tenderness and guarding.",
  },
  rlq: {
    label: "Right lower quadrant",
    action: "palpate",
    detail: "Focused RLQ palpation for appendiceal signs.",
  },
  arms: {
    label: "Arms",
    action: "inspect",
    detail: "Upper extremity inspection for asymmetry and discomfort cues.",
  },
  legs: {
    label: "Legs",
    action: "inspect",
    detail: "Lower extremity inspection for posture and guarding.",
  },
  joints: {
    label: "Joints",
    action: "palpate",
    detail: "Joint-focused palpation for focal tenderness.",
  },
};

function mapRegionToIntent(region: ExamTarget): ExamIntent {
  return { action: REGION_INFO[region].action, target: region };
}

export function BodyScene({ onExam }: Props) {
  const highlight = useSimUiStore((s) => s.bodyHighlight);
  const [bounds, setBounds] = useState<ModelBounds | null>(null);

  const handleSelect = (target: ExamTarget) => {
    onExam(mapRegionToIntent(target));
  };

  const handleBoundsChange = useCallback((nextBounds: ModelBounds) => {
    setBounds(nextBounds);
  }, []);

  const hotspotLayout = useMemo(() => {
    if (!bounds) return null;
    const [minX, minY, minZ] = bounds.min;
    const [sizeX, sizeY, sizeZ] = bounds.size;
    const maxZ = bounds.max[2];
    const jointsFrontZ = maxZ + sizeZ * 0.05;

    const at = (x: number, y: number, z: number): [number, number, number] => [
      minX + sizeX * x,
      minY + sizeY * y,
      minZ + sizeZ * z,
    ];
    const atFront = (x: number, y: number): [number, number, number] => [
      minX + sizeX * x,
      minY + sizeY * y,
      jointsFrontZ,
    ];

    return {
      head: { position: at(0.5, 0.9, 0.88), radius: sizeY * 0.06 },
      chest: { position: at(0.5, 0.68, 0.84), radius: sizeY * 0.075 },
      stomach: { position: at(0.5, 0.49, 0.84), radius: sizeY * 0.072 },
      armsLeft: { position: at(0.3, 0.62, 0.84), radius: sizeY * 0.058 },
      armsRight: { position: at(0.7, 0.62, 0.84), radius: sizeY * 0.058 },
      legsLeft: { position: at(0.42, 0.22, 0.85), radius: sizeY * 0.062 },
      legsRight: { position: at(0.58, 0.22, 0.85), radius: sizeY * 0.062 },
      jointsShoulderLeft: { position: atFront(0.34, 0.73), radius: sizeY * 0.04 },
      jointsShoulderRight: { position: atFront(0.66, 0.73), radius: sizeY * 0.04 },
      jointsKneeLeft: { position: atFront(0.45, 0.3), radius: sizeY * 0.04 },
      jointsKneeRight: { position: atFront(0.55, 0.3), radius: sizeY * 0.04 },
      rlq: { position: at(0.43, 0.4, 0.88), radius: sizeY * 0.055 },
    };
  }, [bounds]);

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-3xl border border-sky-400/20 bg-linear-to-b from-[#07112a] via-[#050d22] to-[#030916] shadow-[0_30px_80px_rgba(2,6,23,0.7)]">

      <Canvas camera={{ position: [0, 0.6, 7], fov: 35 }}>
        <color attach="background" args={["#050b1a"]} />
        <ambientLight intensity={0.4} />

        {/* Key light */}
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />

        {/* Fill light (front) */}
        <directionalLight position={[0, 2, 5]} intensity={0.6} />

        {/* Rim light (back highlight) */}
        <directionalLight position={[0, 3, -5]} intensity={0.5} />
        <group position={[0, -0.5, 0]}>
          <BodyModel onBoundsChange={handleBoundsChange} />
          {hotspotLayout ? (
            <>
              <BodyHotspot
                id="head"
                position={hotspotLayout.head.position}
                radius={hotspotLayout.head.radius}
                onSelect={handleSelect}
                selected={highlight === "head"}
              />
              <BodyHotspot
                id="chest"
                position={hotspotLayout.chest.position}
                radius={hotspotLayout.chest.radius}
                color="#60a5fa"
                onSelect={handleSelect}
                selected={highlight === "chest"}
              />
              <BodyHotspot
                id="stomach"
                position={hotspotLayout.stomach.position}
                radius={hotspotLayout.stomach.radius}
                color="#22d3ee"
                onSelect={handleSelect}
                selected={highlight === "stomach"}
              />
              <BodyHotspot
                id="arms"
                position={hotspotLayout.armsLeft.position}
                radius={hotspotLayout.armsLeft.radius}
                color="#a78bfa"
                onSelect={handleSelect}
                selected={highlight === "arms"}
              />
              <BodyHotspot
                id="arms"
                position={hotspotLayout.armsRight.position}
                radius={hotspotLayout.armsRight.radius}
                color="#a78bfa"
                onSelect={handleSelect}
                selected={highlight === "arms"}
              />
              <BodyHotspot
                id="legs"
                position={hotspotLayout.legsLeft.position}
                radius={hotspotLayout.legsLeft.radius}
                color="#34d399"
                onSelect={handleSelect}
                selected={highlight === "legs"}
              />
              <BodyHotspot
                id="legs"
                position={hotspotLayout.legsRight.position}
                radius={hotspotLayout.legsRight.radius}
                color="#34d399"
                onSelect={handleSelect}
                selected={highlight === "legs"}
              />
              <BodyHotspot
                id="joints"
                position={hotspotLayout.jointsShoulderLeft.position}
                radius={hotspotLayout.jointsShoulderLeft.radius}
                color="#f59e0b"
                onSelect={handleSelect}
                selected={highlight === "joints"}
              />
              <BodyHotspot
                id="joints"
                position={hotspotLayout.jointsShoulderRight.position}
                radius={hotspotLayout.jointsShoulderRight.radius}
                color="#f59e0b"
                onSelect={handleSelect}
                selected={highlight === "joints"}
              />
              <BodyHotspot
                id="joints"
                position={hotspotLayout.jointsKneeLeft.position}
                radius={hotspotLayout.jointsKneeLeft.radius}
                color="#f59e0b"
                onSelect={handleSelect}
                selected={highlight === "joints"}
              />
              <BodyHotspot
                id="joints"
                position={hotspotLayout.jointsKneeRight.position}
                radius={hotspotLayout.jointsKneeRight.radius}
                color="#f59e0b"
                onSelect={handleSelect}
                selected={highlight === "joints"}
              />
              <BodyHotspot
                id="rlq"
                position={hotspotLayout.rlq.position}
                radius={hotspotLayout.rlq.radius}
                color="#38bdf8"
                onSelect={handleSelect}
                selected={highlight === "rlq"}
              />
            </>
          ) : null}
        </group>
        <OrbitControls
          enablePan={false}
          target={[0, 1.2, 0]}
          minDistance={5.5}
          maxDistance={8}
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 1.9}
          minPolarAngle={Math.PI / 2.9}
        />
      </Canvas>
    </div>
  );
}
