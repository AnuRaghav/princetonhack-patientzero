import type { ReactNode } from "react";

import { cn } from "./cn";

type Tone = "neutral" | "accent" | "warn" | "danger" | "info" | "dark";

type Props = {
  tone?: Tone;
  size?: "xs" | "sm";
  dot?: boolean;
  pulse?: boolean;
  className?: string;
  children: ReactNode;
};

const toneClasses: Record<Tone, string> = {
  neutral:
    "text-[var(--color-ink-soft)] bg-[var(--color-surface-2)] border-[var(--color-line)]",
  accent:
    "text-[var(--color-accent-strong)] bg-[var(--color-accent-soft)] border-[rgba(52,210,124,0.22)]",
  warn:
    "text-[var(--color-warn-strong)] bg-[var(--color-warn-soft)] border-[rgba(255,138,61,0.22)]",
  danger:
    "text-[#dc2626] bg-[var(--color-danger-soft)] border-[rgba(239,68,68,0.22)]",
  info:
    "text-[#1d4ed8] bg-[var(--color-info-soft)] border-[rgba(59,130,246,0.22)]",
  dark:
    "text-white bg-[var(--color-ink)] border-transparent",
};

const dotColor: Record<Tone, string> = {
  neutral: "bg-[var(--color-ink-faint)]",
  accent: "bg-[var(--color-accent)]",
  warn: "bg-[var(--color-warn)]",
  danger: "bg-[var(--color-danger)]",
  info: "bg-[var(--color-info)]",
  dark: "bg-white",
};

export function Badge({
  tone = "neutral",
  size = "sm",
  dot,
  pulse,
  className,
  children,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        toneClasses[tone],
        className,
      )}
    >
      {dot ? (
        <span
          className={cn(
            "relative inline-flex h-1.5 w-1.5 rounded-full",
            dotColor[tone],
            pulse && "pulse-dot",
          )}
        />
      ) : null}
      {children}
    </span>
  );
}
