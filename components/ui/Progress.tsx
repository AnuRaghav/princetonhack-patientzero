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
  accent: "bg-[linear-gradient(90deg,_#16a34a,_#34d27c)]",
  warn: "bg-[linear-gradient(90deg,_#ea580c,_#ff8a3d)]",
  danger: "bg-[linear-gradient(90deg,_#dc2626,_#f87171)]",
  warm: "bg-[linear-gradient(90deg,_#ff5d3a_0%,_#ffb04a_45%,_#ffd84a_70%,_#34d27c_100%)]",
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
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--color-ink)] shadow-[0_2px_6px_-1px_rgba(15,17,22,0.4)]"
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
  accent: ["#34d27c", "#16a34a"],
  warn: ["#ff8a3d", "#ea580c"],
  danger: ["#f87171", "#dc2626"],
  warm: ["#ff5d3a", "#34d27c"],
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
          stroke="rgba(15,17,22,0.06)"
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
        const heightPct = 30 + Math.sin((i / count) * Math.PI) * 60;
        let bg: string;
        if (active) {
          if (t < 0.45) bg = "bg-[#ff5d3a]";
          else if (t < 0.7) bg = "bg-[#ffb04a]";
          else if (t < 0.85) bg = "bg-[#ffd84a]";
          else bg = "bg-[#34d27c]";
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
