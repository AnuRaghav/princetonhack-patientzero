"use client";

import { cn } from "@/components/ui";
import type { ExamTarget } from "@/types/exam";

const REGIONS: { id: ExamTarget; label: string; hint: string }[] = [
  { id: "head", label: "Head", hint: "Inspect · appearance" },
  { id: "chest", label: "Chest", hint: "Auscultate · lungs" },
  { id: "abdomen", label: "Abdomen", hint: "Palpate · general" },
  { id: "stomach", label: "Stomach", hint: "Palpate · tender · guard" },
  { id: "rlq", label: "RLQ", hint: "McBurney · rebound" },
  { id: "arms", label: "Arms", hint: "Inspect · symmetry" },
  { id: "legs", label: "Legs", hint: "Inspect · posture" },
  { id: "joints", label: "Joints", hint: "Palpate · focal" },
];

type Props = {
  highlight?: string | null;
  /** When set, each row is clickable to select that body region (same as 3D hotspots when shown). */
  onRegionSelect?: (id: ExamTarget) => void;
  /** Regions to briefly emphasize (e.g. new symptom → related area). */
  pulseTargets?: readonly ExamTarget[];
};

export function BodyLegend({ highlight, onRegionSelect, pulseTargets }: Props) {
  const interactive = Boolean(onRegionSelect);

  return (
    <div className="pointer-events-auto max-w-[min(100vw-2rem,280px)] rounded-[var(--radius-md)] border border-white/[0.08] bg-white/[0.04] p-3 text-[12px] text-white backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold text-white">Regions</div>
        <span className="num text-[10px] text-white/40">{REGIONS.length} active</span>
      </div>
      <ul className="flex flex-col gap-1">
        {REGIONS.map((r) => {
          const active = highlight === r.id;
          const pulse = pulseTargets?.includes(r.id) ?? false;
          const rowClass = cn(
            "flex w-full items-center justify-between gap-3 rounded-full px-2.5 py-1 smooth",
            active
              ? "bg-white text-[var(--color-ink)]"
              : "text-white/70 hover:bg-white/[0.05] hover:text-white",
            interactive &&
              !active &&
              "cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35",
            pulse &&
              "ring-2 ring-amber-400/60 ring-offset-2 ring-offset-black/30",
          );

          const inner = (
            <>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    active
                      ? "bg-[var(--color-accent)]"
                      : pulse
                        ? "bg-amber-300"
                        : "bg-white/30",
                  )}
                />
                <span className="truncate font-medium">{r.label}</span>
              </span>
              <span
                className={cn(
                  "shrink-0 text-[10px]",
                  active ? "text-[var(--color-ink-muted)]" : "text-white/35",
                )}
              >
                {r.hint}
              </span>
            </>
          );

          if (interactive && onRegionSelect) {
            return (
              <li key={r.id}>
                <button type="button" className={rowClass} onClick={() => onRegionSelect(r.id)}>
                  {inner}
                </button>
              </li>
            );
          }

          return (
            <li key={r.id} className={rowClass}>
              {inner}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
