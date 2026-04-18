"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PresentationControls } from "@react-three/drei";

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

      <Canvas shadows camera={{ position: [0, 1.2, 5], fov: 40 }}>
        <color attach="background" args={["#0b1220"]} />

        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />

        <PresentationControls
          global={false}
          cursor
          snap={false}
          speed={1.2}
          polar={[0, 0]} // lock vertical tilt (optional but good)
          azimuth={[-Math.PI, Math.PI]} // FULL 360
        >
          <group position={[0, -1.5, 0]}>
            <BodyModel />
          </group>
        </PresentationControls>

        <OrbitControls
          enablePan={false}
          enableRotate={false}
          enableZoom={false}
        />
      </Canvas>
    </div>
  );
}
