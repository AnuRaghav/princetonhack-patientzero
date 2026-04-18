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
};

export function BodyLegend({ highlight }: Props) {
  return (
    <div className="rounded-[var(--radius-md)] border border-white/[0.08] bg-white/[0.04] p-3 text-[12px] text-white backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold text-white">Regions</div>
        <span className="num text-[10px] text-white/40">
          {REGIONS.length} active
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {REGIONS.map((r) => {
          const active = highlight === r.id;
          return (
            <li
              key={r.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-full px-2.5 py-1 smooth",
                active
                  ? "bg-white text-[var(--color-ink)]"
                  : "text-white/70 hover:bg-white/[0.05] hover:text-white",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    active ? "bg-[var(--color-accent)]" : "bg-white/30",
                  )}
                />
                <span className="font-medium">{r.label}</span>
              </span>
              <span
                className={cn(
                  "text-[10px]",
                  active ? "text-[var(--color-ink-muted)]" : "text-white/35",
                )}
              >
                {r.hint}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
