"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Badge,
  Button,
  Icon,
  ProgressBar,
  ProgressBarOnDark,
  Stat,
  Surface,
  TickBar,
  cn,
} from "@/components/ui";

export default function ConsolePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: "appendicitis" }),
      });
      const data = (await res.json()) as { sessionId?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not start session");
        return;
      }
      if (!data.sessionId) {
        setError("Unexpected response");
        return;
      }
      router.push(`/sim/${data.sessionId}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      {/* HERO LEFT — Brand / start ============================== */}
      <Surface
        variant="hero"
        padding="none"
        radius="xl"
        className="lg:col-span-7"
      >
        <div className="relative flex h-full flex-col gap-7 p-8 md:p-10">
          {/* Soft warm halo */}
          <div
            className="pointer-events-none absolute -right-24 top-1/2 h-[360px] w-[360px] -translate-y-1/2 rounded-full opacity-70 blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(255,138,61,0.30), rgba(52,210,124,0.18) 50%, transparent 70%)",
            }}
            aria-hidden
          />
          <div className="relative flex items-start justify-between">
            <div className="text-[13px] font-medium text-[var(--color-on-dark-muted)]">
              Clinical Simulation
            </div>
            <Badge tone="dark" size="xs">
              v0.1 · live
            </Badge>
          </div>
          <div className="relative flex flex-col gap-5">
            <h1 className="text-balance text-[40px] font-bold leading-[1.05] tracking-tight text-white md:text-[56px]">
              The clinical encounter,{" "}
              <span className="grad-warm-text">re-engineered.</span>
            </h1>
            <p className="max-w-xl text-[15px] leading-relaxed text-[var(--color-on-dark-soft)]">
              Interview an AI standardized patient and perform a virtual physical exam on a
              live 3D body. Findings resolve through a deterministic case engine before any
              language model speaks.
            </p>
          </div>
          <div className="relative mt-2 flex flex-wrap items-center gap-3">
            <Button
              variant="on-dark"
              size="lg"
              loading={loading}
              onClick={() => void start()}
              trailingIcon={<Icon.ArrowUpRight size={16} />}
            >
              {loading ? "Provisioning…" : "Begin appendicitis"}
            </Button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.04] px-5 py-3 text-[14px] font-medium text-white smooth hover:bg-white/[0.08]"
            >
              <Icon.Play size={14} />
              Watch flow
            </button>
            {error ? (
              <span className="text-sm text-[#fda4af]">{error}</span>
            ) : null}
          </div>
        </div>
      </Surface>

      {/* HERO RIGHT — Engine telemetry =========================== */}
      <Surface
        variant="hero-2"
        padding="none"
        radius="xl"
        className="lg:col-span-5"
      >
        <div className="flex h-full flex-col gap-5 p-7">
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-semibold text-white">
              Engine telemetry
            </div>
            <Badge tone="dark" size="xs">
              <Icon.Calendar size={10} /> 18 Apr · live
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DarkStat
              title="Reveal latency"
              hint="Server-side resolve."
              value="184"
              unit="ms"
            />
            <DarkStat
              title="Cases loaded"
              hint="appendicitis · v1"
              value="01"
              unit=""
            />
          </div>

          <div className="mt-1 flex flex-1 flex-col items-center justify-end gap-2">
            <TickBar value={68} count={56} onDark className="w-full" />
            <div className="num text-[44px] font-bold leading-none text-white">
              68<span className="text-[20px] text-[var(--color-on-dark-muted)]">%</span>
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-on-dark-faint)]">
              Pipeline · readiness
            </div>
          </div>
        </div>
      </Surface>

      {/* MIDDLE ROW — Two metric cards + suggested-steps panel === */}
      <Stat
        label="Checklist coverage"
        value="92"
        unit="/100"
        status={{ label: "Normal", tone: "accent" }}
        className="lg:col-span-3"
      >
        <ProgressBar value={92} tone="accent" size="sm" />
        <div className="flex justify-between text-[11px] text-[var(--color-ink-faint)]">
          <span>Cohort avg</span>
          <span className="num text-[var(--color-ink-muted)]">78</span>
        </div>
      </Stat>

      <Stat
        label="Reveal rules"
        value="32"
        status={{ label: "Indexed", tone: "neutral" }}
        className="lg:col-span-3"
      >
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-ink-muted)]">
          <span className="num text-[var(--color-ink)] font-medium">~180 ms</span>
          <span>·</span>
          <span>p95 resolve</span>
        </div>
      </Stat>

      <Surface variant="card" padding="md" radius="lg" className="lg:col-span-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">
            Suggested next steps
          </h3>
          <Button size="sm" variant="primary" trailingIcon={<Icon.Plus size={12} />}>
            Create plan
          </Button>
        </div>
        <ul className="flex flex-col">
          <Step
            icon={<Icon.Stethoscope size={14} />}
            title="Diagnostic"
            tag="Now"
            items={[
              "Run the appendicitis case end-to-end",
              "Practice McBurney palpation sequence",
              "Confirm the rebound finding on second pass",
            ]}
          />
          <Step
            icon={<Icon.Brain size={14} />}
            title="Reasoning"
            tag="Today"
            items={[
              "Build a hypothesis ladder before exam",
              "Compare alternates: gastroenteritis, ovarian torsion",
            ]}
          />
          <Step
            icon={<Icon.Heart size={14} />}
            title="Communication"
            tag="Always"
            items={[
              "Open with non-leading questions",
              "Reflect emotional state before pivoting",
            ]}
          />
        </ul>
      </Surface>

      {/* BOTTOM ROW — Two light stat cards with comparison bars == */}
      <Surface variant="card" padding="md" radius="lg" className="lg:col-span-6">
        <div className="flex items-start justify-between">
          <div className="text-[13px] text-[var(--color-ink-muted)]">
            Empathy tone
          </div>
          <Badge tone="warn" size="xs" dot>
            Developing
          </Badge>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="num text-[34px] font-bold leading-none">68</span>
          <span className="num text-[16px] font-semibold text-[var(--color-ink-soft)]">
            /100
          </span>
        </div>
        <div className="mt-5 space-y-3">
          <CompareRow label="Cohort avg" value={78} display="78" tone="accent" />
          <CompareRow label="Your last" value={68} display="68" tone="warn" />
        </div>
      </Surface>

      <Surface variant="card" padding="md" radius="lg" className="lg:col-span-6">
        <div className="flex items-start justify-between">
          <div className="text-[13px] text-[var(--color-ink-muted)]">
            Diagnostic rigor
          </div>
          <Badge tone="accent" size="xs" dot>
            Normal
          </Badge>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="num text-[34px] font-bold leading-none">84</span>
          <span className="num text-[16px] font-semibold text-[var(--color-ink-soft)]">
            /100
          </span>
        </div>
        <div className="mt-5 space-y-3">
          <CompareRow label="Cohort avg" value={75} display="75" tone="warn" />
          <CompareRow label="Your last" value={84} display="84" tone="accent" />
        </div>
      </Surface>
    </div>
  );
}

function DarkStat({
  title,
  hint,
  value,
  unit,
}: {
  title: string;
  hint: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="text-[12px] font-medium text-white">{title}</div>
      <div className="text-[11px] leading-snug text-[var(--color-on-dark-muted)]">
        {hint}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="num text-[28px] font-bold leading-none text-white">
          {value}
        </span>
        {unit ? (
          <span className="num text-[14px] font-semibold text-[var(--color-on-dark-muted)]">
            {unit}
          </span>
        ) : null}
      </div>
      <div className="mt-1">
        <ProgressBarOnDark value={70} tone="warm" showThumb className="" />
      </div>
    </div>
  );
}

function CompareRow({
  label,
  value,
  display,
  tone,
}: {
  label: string;
  value: number;
  display: string;
  tone: "accent" | "warn";
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-[var(--color-ink-muted)]">
        <span>{label}</span>
        <span className="num text-[var(--color-ink)] font-medium">{display}</span>
      </div>
      <ProgressBar value={value} tone={tone} size="sm" />
    </div>
  );
}

function Step({
  icon,
  title,
  tag,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  tag: string;
  items: string[];
}) {
  return (
    <li className="grid grid-cols-[28px_1fr] gap-x-4 border-b border-[var(--color-line)] py-3 last:border-0 last:pb-0 first:pt-0">
      <span
        className={cn(
          "mt-0.5 grid h-7 w-7 place-items-center rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] text-[var(--color-ink-soft)]",
        )}
      >
        {icon}
      </span>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[var(--color-ink)]">{title}</span>
          <Badge tone="neutral" size="xs">
            {tag}
          </Badge>
        </div>
        <ul className="mt-1.5 space-y-1 text-[12.5px] leading-relaxed text-[var(--color-ink-soft)]">
          {items.map((it) => (
            <li key={it} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-ink-faint)]" />
              {it}
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}
