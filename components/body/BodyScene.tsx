"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import { useSimUiStore } from "@/lib/store/simUiStore";
import { BodyLegend } from "./BodyLegend";
import { BodyModel } from "./BodyModel";

export type ExamIntent = {
  action: "palpate" | "auscultate" | "inspect";
  target: "head" | "chest" | "abdomen" | "rlq";
};

type Props = {
  onExam: (_intent: ExamIntent) => void;
};

export function BodyScene({ onExam }: Props) {
  const highlight = useSimUiStore((s) => s.bodyHighlight);
  void onExam;

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-2xl border border-white/10 bg-linear-to-b from-slate-900 to-slate-950">
      <div className="pointer-events-none absolute right-3 top-3 z-10">
        <BodyLegend highlight={highlight} />
      </div>

      <Canvas camera={{ position: [0, 0.6, 7], fov: 35 }}>
        <color attach="background" args={["#0b1220"]} />
        <ambientLight intensity={0.4} />

        {/* Key light */}
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />

        {/* Fill light (front) */}
        <directionalLight position={[0, 2, 5]} intensity={0.6} />

        {/* Rim light (back highlight) */}
        <directionalLight position={[0, 3, -5]} intensity={0.5} />
        <group position={[0, -0.5, 0]}>
          <BodyModel />
        </group>

        <OrbitControls
          enablePan={false}
          target={[0, 1.2, 0]}
          minDistance={5.5}
          maxDistance={8}
        />
      </Canvas>
    </div>
  );
}
