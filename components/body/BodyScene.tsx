"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import { useSimUiStore } from "@/lib/store/simUiStore";
import type { ExamTarget } from "@/types/exam";

import { BodyHotspot } from "./BodyHotspot";
import { BodyLegend } from "./BodyLegend";
import { BodyModel } from "./BodyModel";

export type ExamIntent = {
  action: "palpate" | "auscultate" | "inspect";
  target: "head" | "chest" | "abdomen" | "rlq";
};

type Props = {
  onExam: (intent: ExamIntent) => void;
};

function mapRegionToIntent(region: ExamTarget): ExamIntent {
  switch (region) {
    case "head":
      return { action: "inspect", target: "head" };
    case "chest":
      return { action: "auscultate", target: "chest" };
    case "abdomen":
      return { action: "palpate", target: "abdomen" };
    case "rlq":
      return { action: "palpate", target: "rlq" };
  }
}

export function BodyScene({ onExam }: Props) {
  const highlight = useSimUiStore((s) => s.bodyHighlight);

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="pointer-events-none absolute right-3 top-3 z-10">
        <BodyLegend highlight={highlight} />
      </div>
      <Canvas shadows camera={{ position: [2.2, 1.6, 2.6], fov: 45 }}>
        <color attach="background" args={["#0b1220"]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 3]} intensity={1.1} castShadow />
        <BodyModel />
        <BodyHotspot
          id="head"
          position={[0, 1.55, 0.12]}
          onSelect={(id) => onExam(mapRegionToIntent(id))}
          selected={highlight === "head"}
        />
        <BodyHotspot
          id="chest"
          position={[0.18, 1.12, 0.22]}
          onSelect={(id) => onExam(mapRegionToIntent(id))}
          selected={highlight === "chest"}
        />
        <BodyHotspot
          id="abdomen"
          position={[0, 0.55, 0.28]}
          onSelect={(id) => onExam(mapRegionToIntent(id))}
          selected={highlight === "abdomen"}
        />
        <BodyHotspot
          id="rlq"
          position={[0.32, 0.35, 0.26]}
          onSelect={(id) => onExam(mapRegionToIntent(id))}
          selected={highlight === "rlq"}
        />
        <OrbitControls enablePan={false} minDistance={2} maxDistance={5} target={[0, 0.8, 0]} />
      </Canvas>
    </div>
  );
}
