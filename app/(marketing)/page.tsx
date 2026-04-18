"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CLINICAL_BUCKETS } from "@/lib/cases/bucketFilters";
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
import type { CaseListItem } from "@/lib/api/casesTypes";

type FeaturedResp = {
  cases: CaseListItem[];
  total: number;
};

export default function ConsolePage() {
  const router = useRouter();
  const [stats, setStats] = useState<{ total: number; preview: CaseListItem[] } | null>(null);
  const [randomLoading, setRandomLoading] = useState(false);
  const [solveLoading, setSolveLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/cases/featured?limit=4");
        const json = (await res.json()) as FeaturedResp & { error?: string };
        if (!res.ok) {
          if (!cancelled) setError(json.error ?? "Could not load featured cases");
          return;
        }
        if (!cancelled) {
          setStats({ total: json.total ?? 0, preview: json.cases ?? [] });
        }
      } catch {
        if (!cancelled) setError("Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startRandom = async () => {
    setRandomLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cases/random");
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !json.id) {
        setError(json.error ?? "Random pick failed");
        return;
      }
      await startCase(json.id);
    } catch {
      setError("Network error");
    } finally {
      setRandomLoading(false);
    }
  };

  const startCase = async (caseId: string) => {
    setSolveLoading(caseId);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const json = (await res.json()) as { sessionId?: string; error?: string };
      if (!res.ok || !json.sessionId) {
        setError(json.error ?? "Could not start session");
        return;
      }
      router.push(`/sim/${json.sessionId}`);
    } catch {
      setError("Network error");
    } finally {
      setSolveLoading(null);
    }
  };

  const totalDisplay = stats?.total ?? 0;
  const totalK = totalDisplay >= 1000 ? `${(totalDisplay / 1000).toFixed(1)}k` : String(totalDisplay);

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      {/* HERO LEFT — Brand / start ============================== */}
      <Surface variant="hero" padding="none" radius="xl" className="lg:col-span-7">
        <div className="relative flex h-full flex-col gap-7 p-8 md:p-10">
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
            <Badge tone="dark" size="xs" dot pulse>
              Live · v0.1
            </Badge>
          </div>
          <div className="relative flex flex-col gap-5">
            <h1 className="text-balance text-[40px] font-bold leading-[1.05] tracking-tight text-white md:text-[56px]">
              LeetCode for clinical encounters,{" "}
              <span className="grad-warm-text">re-engineered.</span>
            </h1>
            <p className="max-w-xl text-[15px] leading-relaxed text-[var(--color-on-dark-soft)]">
              {totalK} graded patient cases. Interview an AI standardized patient,
              perform a structured physical exam, submit your working diagnosis. Findings
              resolve through a deterministic case engine before any model speaks.
            </p>
          </div>
          <div className="relative mt-2 flex flex-wrap items-center gap-3">
            <Button
              variant="on-dark"
              size="lg"
              onClick={() => router.push("/cases")}
              trailingIcon={<Icon.ArrowUpRight size={16} />}
            >
              Open case bank
            </Button>
            <button
              type="button"
              onClick={() => void startRandom()}
              disabled={randomLoading || solveLoading !== null}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.04] px-5 py-3 text-[14px] font-medium text-white smooth hover:bg-white/[0.08] disabled:opacity-50"
            >
              {randomLoading ? (
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
                  aria-hidden
                />
              ) : (
                <Icon.Sparkles size={14} />
              )}
              {randomLoading ? "Picking…" : "Random case"}
            </button>
            {error ? <span className="text-sm text-[#fda4af]">{error}</span> : null}
          </div>
        </div>
      </Surface>

      {/* HERO RIGHT — Case bank snapshot ========================== */}
      <Surface variant="hero-2" padding="none" radius="xl" className="lg:col-span-5">
        <div className="flex h-full flex-col gap-5 p-7">
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-semibold text-white">Case bank</div>
            <Badge tone="dark" size="xs">
              <Icon.Clipboard size={10} /> {CLINICAL_BUCKETS.length} specialties
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DarkStat
              title="Cases indexed"
              hint="Live from Supabase"
              value={totalK}
              unit=""
            />
            <DarkStat
              title="Specialties"
              hint="Heuristic on disease text"
              value={String(CLINICAL_BUCKETS.length)}
              unit=""
            />
          </div>

          <div className="mt-1 flex flex-1 flex-col items-center justify-end gap-2">
            <TickBar value={Math.min(100, totalDisplay / 50)} count={56} onDark className="w-full" />
            <div className="num text-[44px] font-bold leading-none text-white">
              {totalK}
              <span className="text-[20px] text-[var(--color-on-dark-muted)]"> cases</span>
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-on-dark-faint)]">
              Catalog · ready
            </div>
          </div>
        </div>
      </Surface>

      {/* MIDDLE ROW — quick stats + suggested-steps ============== */}
      <Stat
        label="Reveal latency"
        value="~180"
        unit="ms"
        status={{ label: "Healthy", tone: "accent" }}
        className="lg:col-span-3"
      >
        <div className="text-[11px] text-[var(--color-ink-muted)]">
          Server-side resolve before any LLM call.
        </div>
      </Stat>

      <Stat
        label="Findings projection"
        value="0"
        unit="ms"
        status={{ label: "Deterministic", tone: "neutral" }}
        className="lg:col-span-3"
      >
        <div className="text-[11px] text-[var(--color-ink-muted)]">
          EncounterFindings recomputed pure on every read.
        </div>
      </Stat>

      <Surface variant="card" padding="md" radius="lg" className="lg:col-span-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">
            How a session works
          </h3>
          <Link
            href="/cases"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-ink)] hover:underline"
          >
            Browse cases <Icon.ArrowRight size={12} />
          </Link>
        </div>
        <ul className="flex flex-col">
          <Step
            n="01"
            icon={<Icon.Clipboard size={14} />}
            title="Pick a case"
            tag="catalog"
            items={[
              "Filter by specialty, search disease or symptom",
              "Solve to enter the encounter — or hit Random",
            ]}
          />
          <Step
            n="02"
            icon={<Icon.Stethoscope size={14} />}
            title="Interview & examine"
            tag="encounter"
            items={[
              "Open-ended history taking · structured exam actions",
              "Body cues + findings update live as you discover them",
            ]}
          />
          <Step
            n="03"
            icon={<Icon.Brain size={14} />}
            title="Diagnose & debrief"
            tag="scoring"
            items={[
              "Submit working diagnoses with confidence + rationale",
              "Get a checklist + empathy + reasoning score",
            ]}
          />
        </ul>
      </Surface>

      {/* BOTTOM ROW — Featured cases =========================== */}
      <Surface variant="card" padding="md" radius="lg" className="lg:col-span-12">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">
              Featured cases
            </h3>
            <p className="text-[12px] text-[var(--color-ink-muted)]">
              A fresh draw across specialties — diagnoses hidden. Refresh for a new slate.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => router.push("/cases")}
            trailingIcon={<Icon.ArrowRight size={12} />}
          >
            See all {totalDisplay.toLocaleString()}
          </Button>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {(stats?.preview ?? Array.from({ length: 4 })).slice(0, 4).map((c, i) =>
            c ? (
              <CasePreviewCard
                key={(c as CaseListItem).id}
                item={c as CaseListItem}
                onSolve={() => void startCase((c as CaseListItem).id)}
                loading={solveLoading === (c as CaseListItem).id}
                disabled={solveLoading !== null || randomLoading}
              />
            ) : (
              <CasePreviewSkeleton key={i} />
            ),
          )}
        </div>
      </Surface>
    </div>
  );
}

/* ----------------------------------------------------------------- */

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
      <div className="text-[11px] leading-snug text-[var(--color-on-dark-muted)]">{hint}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="num text-[28px] font-bold leading-none text-white">{value}</span>
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

function Step({
  n,
  icon,
  title,
  tag,
  items,
}: {
  n: string;
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
          <span className="num-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
            {n}
          </span>
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

function CasePreviewCard({
  item,
  onSolve,
  loading,
  disabled,
}: {
  item: CaseListItem;
  onSolve: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  const tone =
    item.difficulty === "Easy" ? "accent" : item.difficulty === "Medium" ? "warn" : "danger";

  return (
    <div className="group relative flex flex-col gap-3 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4 smooth hover:-translate-y-[1px] hover:border-[var(--color-line-strong)] hover:shadow-[var(--shadow-card)]">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[var(--color-accent-soft)] opacity-0 blur-2xl smooth group-hover:opacity-100"
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="num-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
            Case #{item.id.padStart(3, "0")}
          </span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-faint)]">
            · {item.bucket}
          </span>
        </div>
        <Badge tone={tone} size="xs" dot>
          {item.difficulty}
        </Badge>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="num-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
          chief complaint
        </span>
        <p className="line-clamp-3 text-[13.5px] font-semibold italic leading-snug text-[var(--color-ink)]">
          “{item.chiefComplaintPreview}.”
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-[var(--color-line)] pt-3">
        <span className="text-[11px] text-[var(--color-ink-muted)]">
          <span className="num font-medium text-[var(--color-ink)]">
            {item.symptomCount}
          </span>{" "}
          symptoms · undiagnosed
        </span>
        <Button
          size="sm"
          loading={loading}
          disabled={disabled}
          onClick={onSolve}
          trailingIcon={<Icon.ArrowUpRight size={12} />}
        >
          Solve
        </Button>
      </div>
    </div>
  );
}

function CasePreviewSkeleton() {
  return (
    <div className="flex h-[148px] flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
      <div className="h-3 w-12 rounded bg-[var(--color-surface-3)]" />
      <div className="h-4 w-3/4 rounded bg-[var(--color-surface-3)]" />
      <div className="h-3 w-1/2 rounded bg-[var(--color-surface-3)]" />
      <div className="mt-auto h-7 w-16 rounded-full bg-[var(--color-surface-3)]" />
    </div>
  );
}
