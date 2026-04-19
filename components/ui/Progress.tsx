import { cn } from "./cn";

type Tone = "accent" | "warn" | "danger" | "warm";

type BarProps = {
  value: number;
  max?: number;
  label?: string;
  trailing?: string;
  tone?: Tone;
  size?: "sm" | "md";
  showThumb?: boolean;
  className?: string;
};

const fillClass: Record<Tone, string> = {
  accent: "bg-[linear-gradient(90deg,_#4f46e5,_#6366f1)]",
  warn: "bg-[linear-gradient(90deg,_#ea580c,_#f97316)]",
  danger: "bg-[linear-gradient(90deg,_#dc2626,_#f87171)]",
  warm: "bg-[linear-gradient(90deg,_#a78bfa_0%,_#6366f1_40%,_#22d3ee_100%)]",
};

export function ProgressBar({
  value,
  max = 100,
  label,
  trailing,
  tone = "accent",
  size = "md",
  showThumb = false,
  className,
}: BarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || trailing) && (
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[var(--color-ink-muted)]">{label}</span>
          <span className="num text-[var(--color-ink)] font-medium">{trailing}</span>
        </div>
      )}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-[var(--color-surface-3)]",
          size === "sm" ? "h-1.5" : "h-2",
        )}
      >
        <div
          className={cn("h-full rounded-full smooth", fillClass[tone])}
          style={{ width: `${pct}%` }}
        />
        {showThumb ? (
          <span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--color-accent)] shadow-[0_2px_6px_-1px_rgba(99,102,241,0.45)]"
            style={{ left: `${pct}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}

/* On-dark variant for use inside hero panels */
export function ProgressBarOnDark({
  value,
  max = 100,
  label,
  trailing,
  tone = "warm",
  showThumb = true,
  className,
}: BarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || trailing) && (
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[var(--color-on-dark-muted)]">{label}</span>
          <span className="num text-white font-medium">{trailing}</span>
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className={cn("h-full rounded-full smooth", fillClass[tone])}
          style={{ width: `${pct}%` }}
        />
        {showThumb ? (
          <span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--color-dark)] bg-white shadow-[0_2px_6px_-1px_rgba(0,0,0,0.6)]"
            style={{ left: `${pct}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}

type RingProps = {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  label?: string;
  tone?: Tone;
  centerValue?: string | number;
};

const ringStops: Record<Tone, [string, string]> = {
  accent: ["#6366f1", "#4f46e5"],
  warn: ["#f97316", "#ea580c"],
  danger: ["#f87171", "#dc2626"],
  warm: ["#a78bfa", "#22d3ee"],
};

export function ProgressRing({
  value,
  max = 100,
  size = 120,
  thickness = 10,
  label,
  tone = "accent",
  centerValue,
}: RingProps) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const [start, end] = ringStops[tone];
  const gradId = `ring-${tone}-${size}`;
  const display = centerValue ?? Math.round(pct * 100);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={start} />
            <stop offset="100%" stopColor={end} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(15,23,42,0.07)"
          strokeWidth={thickness}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradId})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="num text-[28px] font-bold leading-none text-[var(--color-ink)]">
          {display}
        </span>
        {label ? (
          <span className="mt-1 text-[11px] text-[var(--color-ink-muted)]">
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* A horizontal "histogram" bar made of tick marks — the signature
   visual flourish from the reference. */
type TickBarProps = {
  value: number;
  max?: number;
  count?: number;
  className?: string;
  onDark?: boolean;
};

export function TickBar({
  value,
  max = 100,
  count = 56,
  className,
  onDark = false,
}: TickBarProps) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div
      className={cn(
        "relative flex h-12 items-end gap-[2px] overflow-hidden",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => {
        const t = i / (count - 1);
        const active = t <= pct;
        const heightPct = (30 + Math.sin((i / count) * Math.PI) * 60).toFixed(
          4,
        );
        let bg: string;
        if (active) {
          if (t < 0.35) bg = "bg-[#a78bfa]";
          else if (t < 0.55) bg = "bg-[#6366f1]";
          else if (t < 0.75) bg = "bg-[#38bdf8]";
          else bg = "bg-[#22d3ee]";
        } else {
          bg = onDark ? "bg-white/[0.10]" : "bg-[var(--color-surface-3)]";
        }
        return (
          <span
            key={i}
            className={cn("w-[3px] rounded-full smooth", bg)}
            style={{ height: `${heightPct}%` }}
          />
        );
      })}
    </div>
  );
}
