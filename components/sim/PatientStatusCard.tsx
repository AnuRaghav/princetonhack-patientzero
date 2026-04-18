"use client";

import { Badge, ProgressBar, Surface } from "@/components/ui";

type Props = {
  painLevel: number;
  emotionalState: string;
};

const affectTone = (state: string): "accent" | "warn" | "danger" | "neutral" => {
  const s = state.toLowerCase();
  if (s.includes("calm")) return "accent";
  if (s.includes("anxious") || s.includes("worried")) return "warn";
  if (s.includes("distress") || s.includes("severe")) return "danger";
  return "neutral";
};

const painTone = (level: number): "accent" | "warn" | "danger" => {
  if (level <= 3) return "accent";
  if (level <= 6) return "warn";
  return "danger";
};

export function PatientStatusCard({ painLevel, emotionalState }: Props) {
  return (
    <Surface variant="card" padding="md" radius="lg">
      <div className="flex items-start justify-between">
        <div className="text-[13px] text-[var(--color-ink-muted)]">Patient vitals</div>
        <Badge tone={affectTone(emotionalState)} size="xs" dot>
          {emotionalState}
        </Badge>
      </div>
      <div className="mt-4 grid grid-cols-3 items-end gap-4">
        <div className="col-span-2">
          <ProgressBar
            value={painLevel}
            max={10}
            tone={painTone(painLevel)}
            label="Pain · 0–10"
            trailing={`${painLevel}/10`}
            showThumb
          />
        </div>
        <div className="flex flex-col items-end">
          <span className="num text-[40px] font-bold leading-none text-[var(--color-ink)]">
            {painLevel}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
            Index
          </span>
        </div>
      </div>
    </Surface>
  );
}
