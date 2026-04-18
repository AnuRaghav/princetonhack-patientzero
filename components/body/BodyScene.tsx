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
    <div className="relative h-full min-h-[420px] w-full overflow-hidden">
      {/* Warm halo behind the model */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 35%, rgba(255,138,61,0.12), transparent 70%), radial-gradient(120% 80% at 50% 110%, rgba(0,0,0,0.6), transparent 60%)",
        }}
        aria-hidden
      />

      <div className="pointer-events-none absolute right-3 top-3 z-10">
        <BodyLegend highlight={highlight} />
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full border border-white/[0.10] bg-white/[0.06] px-2.5 py-1 text-[10px] text-white/70 backdrop-blur">
        <span className="num uppercase tracking-[0.18em]">orbital · 35° fov</span>
      </div>

      <Canvas camera={{ position: [0, 0.6, 7], fov: 35 }}>
        <color attach="background" args={["#0a0b0d"]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <directionalLight position={[0, 2, 5]} intensity={0.6} />
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
