"use client";

import {
  Badge,
  Icon,
  ProgressBar,
  Surface,
  TickBar,
  cn,
} from "@/components/ui";

type Props = {
  checklistScore: number;
  empathyScore: number;
  diagnosticScore: number;
  summary: string;
  misses: string[];
  strengths: string[];
};

const tier = (n: number): {
  label: string;
  tone: "accent" | "warn" | "danger" | "neutral";
} => {
  if (n >= 85) return { label: "Excellent", tone: "accent" };
  if (n >= 70) return { label: "Solid", tone: "accent" };
  if (n >= 55) return { label: "Developing", tone: "warn" };
  return { label: "Needs work", tone: "danger" };
};

export function DebriefCard({
  checklistScore,
  empathyScore,
  diagnosticScore,
  summary,
  misses,
  strengths,
}: Props) {
  const overall = Math.round((checklistScore + empathyScore + diagnosticScore) / 3);
  const overallTier = tier(overall);

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      {/* HERO — Overall (dark) =================================== */}
      <Surface
        variant="hero"
        padding="none"
        radius="xl"
        className="lg:col-span-12"
      >
        <div className="grid grid-cols-1 gap-6 p-7 md:grid-cols-[1fr_1.4fr] md:p-8">
          {/* Left — meta + ring */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <Badge tone="dark" size="xs">
                <Icon.Calendar size={10} /> debrief
              </Badge>
              <Badge tone="dark" size="xs">
                appendicitis · v1
              </Badge>
            </div>
            <h2 className="text-balance text-[32px] font-bold leading-tight tracking-tight text-white md:text-[40px]">
              {overallTier.label} performance, {" "}
              <span className="grad-warm-text">on track.</span>
            </h2>
            <p className="max-w-md text-[14px] leading-relaxed text-white/65">
              Scores blend deterministic checklist coverage with lightweight communication
              heuristics. Use them as directional, not definitive.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <DarkMini label="Checklist" value={checklistScore} />
              <DarkMini label="Empathy" value={empathyScore} />
              <DarkMini label="Reasoning" value={diagnosticScore} />
            </div>
          </div>

          {/* Right — overall histogram + value */}
          <div className="flex flex-col items-center justify-end gap-3">
            <div className="num leading-none text-white">
              <span className="text-[88px] font-bold md:text-[120px]">{overall}</span>
              <span className="text-[24px] font-semibold text-white/45">/100</span>
            </div>
            <TickBar value={overall} count={64} onDark className="w-full max-w-md" />
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
              Overall index
            </div>
          </div>
        </div>
      </Surface>

      {/* SCORE CARDS (light) ===================================== */}
      <ScoreCard
        icon={<Icon.Clipboard size={14} />}
        label="Checklist"
        score={checklistScore}
        hint="Required history & exam items captured."
        className="lg:col-span-4"
      />
      <ScoreCard
        icon={<Icon.Heart size={14} />}
        label="Empathy"
        score={empathyScore}
        hint="Open questions, validation, pacing."
        className="lg:col-span-4"
      />
      <ScoreCard
        icon={<Icon.Brain size={14} />}
        label="Diagnostic reasoning"
        score={diagnosticScore}
        hint="Hypothesis-driven probing & focus."
        className="lg:col-span-4"
      />

      {/* SUMMARY ================================================= */}
      <Surface variant="card" padding="lg" radius="lg" className="lg:col-span-12">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">
            Session summary
          </h3>
          <Badge tone="neutral" size="xs">auto-generated</Badge>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-ink)]">
          {summary}
        </p>
      </Surface>

      {/* STRENGTHS / MISSES ====================================== */}
      <ListPanel
        tone="accent"
        title="Strengths"
        icon={<Icon.Check size={12} />}
        items={strengths}
        emptyText="None highlighted yet."
        className="lg:col-span-6"
      />
      <ListPanel
        tone="danger"
        title="Misses"
        icon={<Icon.X size={12} />}
        items={misses}
        emptyText="Nothing flagged — clean run."
        className="lg:col-span-6"
      />
    </div>
  );
}

function DarkMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="text-[11px] text-white/55">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="num text-[22px] font-bold text-white">{value}</span>
        <span className="num text-[11px] font-semibold text-white/40">/100</span>
      </div>
    </div>
  );
}

function ScoreCard({
  icon,
  label,
  score,
  hint,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  score: number;
  hint: string;
  className?: string;
}) {
  const t = tier(score);
  return (
    <Surface
      variant="card"
      padding="md"
      radius="lg"
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] text-[var(--color-ink-soft)]">
            {icon}
          </span>
          <span className="text-[13px] text-[var(--color-ink-muted)]">{label}</span>
        </div>
        <Badge tone={t.tone} size="xs" dot>
          {t.label}
        </Badge>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="num text-[44px] font-bold leading-none text-[var(--color-ink)]">
          {score}
        </span>
        <span className="num text-[16px] font-semibold text-[var(--color-ink-soft)]">
          /100
        </span>
      </div>
      <ProgressBar
        value={score}
        tone={t.tone === "danger" ? "danger" : t.tone === "warn" ? "warn" : "accent"}
        size="md"
      />
      <p className="text-[12px] leading-relaxed text-[var(--color-ink-muted)]">{hint}</p>
    </Surface>
  );
}

function ListPanel({
  tone,
  title,
  icon,
  items,
  emptyText,
  className,
}: {
  tone: "accent" | "danger";
  title: string;
  icon: React.ReactNode;
  items: string[];
  emptyText: string;
  className?: string;
}) {
  const accent =
    tone === "accent"
      ? "text-[var(--color-accent-strong)] border-[rgba(52,210,124,0.28)] bg-[var(--color-accent-soft)]"
      : "text-[#dc2626] border-[rgba(239,68,68,0.28)] bg-[var(--color-danger-soft)]";

  return (
    <Surface variant="card" padding="md" radius="lg" className={className}>
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-[var(--color-ink)]">{title}</div>
        <span className="num text-[11px] text-[var(--color-ink-muted)]">
          {items.length}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {items.length === 0 ? (
          <li className="text-[13px] text-[var(--color-ink-muted)]">{emptyText}</li>
        ) : (
          items.map((it) => (
            <li
              key={it}
              className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[13px] text-[var(--color-ink)]"
            >
              <span
                className={cn(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                  accent,
                )}
              >
                {icon}
              </span>
              <span className="leading-relaxed">{it}</span>
            </li>
          ))
        )}
      </ul>
    </Surface>
  );
}
