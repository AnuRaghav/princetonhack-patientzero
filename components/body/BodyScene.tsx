"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { AgXToneMapping, SRGBColorSpace } from "three";
import { Suspense, useCallback, useMemo, useState } from "react";

import { useSimUiStore } from "@/lib/store/simUiStore";
import type { ExamAction, ExamTarget } from "@/types/exam";
import { BodyHotspot } from "./BodyHotspot";
import { BodyLegend } from "./BodyLegend";
import { BodyModel } from "./BodyModel";
import { REGION_INFO } from "./regionInfo";

export type ExamIntent = {
  action: ExamAction;
  target: ExamTarget;
};

type Props = {
  onExam: (intent: ExamIntent) => void;
  /** GLB under `public/models/`. Omit to use the default male mesh (sim lab). */
  modelSrc?: string;
};

type ModelBounds = {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
};

function mapRegionToIntent(region: ExamTarget): ExamIntent {
  return { action: REGION_INFO[region].action, target: region };
}

export function BodyScene({ onExam, modelSrc }: Props) {
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
      head: { position: at(0.5, 1.05, 0.58), radius: sizeY * 0.06 },
      chest: { position: at(0.5, 0.88, 0.58), radius: sizeY * 0.075 },
      stomach: { position: at(0.5, 0.75, 0.45), radius: sizeY * 0.072 },

      armsLeft: { position: at(0.25, 0.85, 0.64), radius: sizeY * 0.058 },
      armsRight: { position: at(0.75, 0.85, 0.64), radius: sizeY * 0.058 },

      legsLeft: { position: at(0.38, 0.5, 0.6), radius: sizeY * 0.062 },
      legsRight: { position: at(0.62, 0.5, 0.6), radius: sizeY * 0.062 },

      jointsShoulderLeft: {
        position: atFront(0.34, 0.73),
        radius: sizeY * 0.04,
      },
      jointsShoulderRight: {
        position: atFront(0.66, 0.73),
        radius: sizeY * 0.04,
      },
      jointsKneeLeft: { position: atFront(0.45, 0.3), radius: sizeY * 0.04 },
      jointsKneeRight: { position: atFront(0.55, 0.3), radius: sizeY * 0.04 },
    };
  }, [bounds]);

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden">
      {/* Warm halo behind the model — matches the BioSync warm-accent palette */}
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

      <Canvas
        camera={{ position: [0, 0.6, 7], fov: 35 }}
        gl={{
          alpha: false,
          // AgX tends to preserve color better than ACES on stylized / game assets.
          toneMapping: AgXToneMapping,
          toneMappingExposure: 1.15,
          outputColorSpace: SRGBColorSpace,
        }}
      >
        <color attach="background" args={["#0a0b0d"]} />
        <hemisphereLight args={["#ffe8dc", "#3a3540"]} intensity={0.55} />
        <ambientLight intensity={0.28} color="#f0e8e4" />
        <directionalLight position={[5, 8, 5]} intensity={1.25} color="#fff5ef" castShadow />
        <directionalLight position={[-5.5, 5, -2]} intensity={0.65} color="#c8dcff" />
        <directionalLight position={[0, 3, -5]} intensity={0.4} color="#ffe0cc" />
        <pointLight position={[2.2, 1.6, 4.5]} intensity={1.35} color="#ffb090" distance={14} decay={2} />
        <pointLight position={[-3, 2, 3]} intensity={0.55} color="#a8c8ff" distance={14} decay={2} />
        {/* useGLTF + Environment suspend — isolated so lights/camera stay stable */}
        <Suspense fallback={null}>
          <Environment preset="sunset" environmentIntensity={1.35} />
          <group position={[0, -0.5, 0]}>
            <BodyModel modelSrc={modelSrc} onBoundsChange={handleBoundsChange} />
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
            </>
          ) : null}
          </group>
        </Suspense>
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

export { REGION_INFO } from "./regionInfo";
