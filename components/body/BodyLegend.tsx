"use client";

import type { ExamTarget } from "@/types/exam";

const REGIONS: { id: ExamTarget; label: string }[] = [
  { id: "head", label: "Head / general appearance" },
  { id: "chest", label: "Chest / lungs" },
  { id: "stomach", label: "Stomach / abdomen" },
  { id: "arms", label: "Arms" },
  { id: "legs", label: "Legs" },
  { id: "joints", label: "Joints" },
  { id: "rlq", label: "Right lower quadrant" },
];

type Props = {
  highlight?: string | null;
};

export function BodyLegend({ highlight }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-white/90 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200/70">Regions</div>
      <ul className="space-y-1.5">
        {REGIONS.map((r) => (
          <li
            key={r.id}
            className={
              highlight === r.id
                ? "flex items-center gap-2 rounded-lg bg-sky-400/10 px-2 py-1 font-semibold text-sky-200"
                : "flex items-center gap-2 rounded-lg px-2 py-1 text-white/75"
            }
          >
            <span className={highlight === r.id ? "h-1.5 w-1.5 rounded-full bg-sky-300" : "h-1.5 w-1.5 rounded-full bg-white/35"} />
            <span>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
