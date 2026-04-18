import type { ReactNode } from "react";

import { Badge } from "./Badge";
import { cn } from "./cn";
import { Surface } from "./Surface";

type Tone = "accent" | "warn" | "danger" | "neutral";

type Props = {
  label: string;
  value: ReactNode;
  unit?: ReactNode;
  status?: { label: string; tone: Tone };
  hint?: ReactNode;
  children?: ReactNode;
  variant?: "card" | "muted";
  className?: string;
};

const toneToBadge = (t: Tone): "accent" | "warn" | "danger" | "neutral" => t;

export function Stat({
  label,
  value,
  unit,
  status,
  hint,
  children,
  variant = "card",
  className,
}: Props) {
  return (
    <Surface
      variant={variant}
      padding="md"
      radius="lg"
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[13px] text-[var(--color-ink-muted)]">{label}</div>
        {status ? (
          <Badge tone={toneToBadge(status.tone)} size="xs" dot>
            {status.label}
          </Badge>
        ) : null}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="num text-[34px] font-bold leading-none text-[var(--color-ink)]">
          {value}
        </span>
        {unit ? (
          <span className="num text-[20px] font-semibold leading-none text-[var(--color-ink-soft)]">
            {unit}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? (
        <div className="text-[12px] text-[var(--color-ink-muted)]">{hint}</div>
      ) : null}
    </Surface>
  );
}
