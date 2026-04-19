"use client";

import { cn } from "@/components/ui/cn";

type Variant = "thinking" | "speaking" | "listening";

type Props = {
  variant?: Variant;
  className?: string;
  label?: string;
};

const COLOR: Record<Variant, string> = {
  thinking: "bg-[var(--color-ink-muted)]",
  speaking: "bg-[var(--color-accent)]",
  listening: "bg-[#ef4444]",
};

/**
 * Compact animated dots used to convey one of three transient states:
 * thinking (model is composing a reply), speaking (assistant audio is
 * playing), or listening (mic is open).
 */
export function SpeakingIndicator({
  variant = "thinking",
  className,
  label,
}: Props) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-live="polite"
    >
      <span className="inline-flex items-end gap-0.5" aria-hidden>
        <Dot color={COLOR[variant]} delay="0ms" />
        <Dot color={COLOR[variant]} delay="120ms" />
        <Dot color={COLOR[variant]} delay="240ms" />
      </span>
      {label ? (
        <span className="text-[12px] text-[var(--color-ink-muted)]">{label}</span>
      ) : null}
    </span>
  );
}

function Dot({ color, delay }: { color: string; delay: string }) {
  return (
    <span
      className={cn("h-1.5 w-1.5 rounded-full", color)}
      style={{
        animation: "encounter-dot 1s ease-in-out infinite",
        animationDelay: delay,
      }}
    />
  );
}
