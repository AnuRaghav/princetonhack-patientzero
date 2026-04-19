"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CLINICAL_BUCKETS } from "@/lib/cases/bucketFilters";
import { CURATED_CASES, type CuratedCase } from "@/lib/curatedCases";
import {
  Badge,
  Button,
  Icon,
  Stat,
  Surface,
  cn,
} from "@/components/ui";
import type { CaseListItem } from "@/lib/api/casesTypes";

type FeaturedResp = {
  cases: CaseListItem[];
  total: number;
};

const PRIMARY_CURATED = CURATED_CASES[0];

export default function ConsolePage() {
  const [stats, setStats] = useState<{ total: number; preview: CaseListItem[] } | null>(null);
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

  const totalDisplay = stats?.total ?? 0;
  const totalK = totalDisplay >= 1000 ? `${(totalDisplay / 1000).toFixed(1)}k` : String(totalDisplay);

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* HERO LEFT — Brand / curated drills positioning ============ */}
      <Surface
        variant="hero"
        padding="none"
        radius="xl"
        className="lg:col-span-8 !bg-transparent"
      >
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          <div
            className="absolute inset-0 bg-cover bg-[position:62%_28%] md:bg-center"
            style={{ backgroundImage: "url(/dna.png)" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(145deg, rgba(7,11,20,0.94) 0%, rgba(10,16,32,0.82) 38%, rgba(7,11,20,0.92) 100%), radial-gradient(ellipse 75% 55% at 88% 22%, rgba(99,102,241,0.24), transparent 58%)",
            }}
          />
        </div>
        <div className="relative z-[1] flex h-full flex-col gap-7 p-8 md:p-10">
          <div className="relative flex items-start justify-between">
            <div className="text-[13px] font-medium text-[var(--color-on-dark-muted)]">
              Curated clinical drills
            </div>
            <Badge tone="dark" size="xs" dot pulse>
              2 cases live
            </Badge>
          </div>
          <div className="relative flex flex-col gap-5">
            <h1 className="text-balance text-[40px] font-bold leading-[1.05] tracking-tight text-white md:text-[56px]">
              Competitive mystery case drills,{" "}
              <span className="grad-warm-text">diagnosis hidden.</span>
            </h1>
            <p className="max-w-xl text-[15px] leading-relaxed text-[var(--color-on-dark-soft)]">
              Two curated mystery patients. Fixed identity, fixed flow, fixed
              URL — the diagnosis is yours to find. Run them on repeat to
              master the reasoning, Zetamac-style.
            </p>
          </div>
          <div className="relative mt-2 flex flex-wrap items-center gap-3">
            <Link
              href={PRIMARY_CURATED.route}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[14px] font-semibold text-[var(--color-ink)] shadow-[0_1px_0_rgba(15,17,22,0.10)_inset] smooth hover:bg-[#f5f5f7]"
            >
              Meet {PRIMARY_CURATED.title}
              <Icon.ArrowUpRight size={16} />
            </Link>
            <Link
              href="/cases"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.04] px-5 text-[14px] font-medium text-white smooth hover:bg-white/[0.08]"
            >
              <Icon.Clipboard size={14} />
              Browse full case bank
            </Link>
            {error ? <span className="text-sm text-[#fda4af]">{error}</span> : null}
          </div>
          <div className="relative mt-2 flex flex-wrap items-center gap-2 text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-on-dark-faint)]">
            <span>Mystery</span>
            <span>·</span>
            <span>Deterministic</span>
            <span>·</span>
            <span>Diagnosis hidden</span>
            <span>·</span>
            <span>Built to be re-run</span>
          </div>
        </div>
      </Surface>

      {/* HERO RIGHT — Case bank snapshot (secondary) =============== */}
      <Surface variant="hero-2" padding="none" radius="xl" className="lg:col-span-4">
        <div className="flex h-full flex-col justify-between gap-6 p-7">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-semibold text-white">Full case bank</div>
              <Badge tone="dark" size="xs">
                <Icon.Clipboard size={10} /> {CLINICAL_BUCKETS.length} specialties
              </Badge>
            </div>

            <p className="text-[12.5px] leading-relaxed text-[var(--color-on-dark-soft)]">
              Open sandbox with the broader simulation library. Curated drills
              stay sharper — the catalog is here when you want range.
            </p>

            <div className="flex items-baseline gap-2">
              <span className="num text-[56px] font-bold leading-none text-white">
                {totalK}
              </span>
              <span className="text-[14px] font-medium text-[var(--color-on-dark-muted)]">
                cases indexed
              </span>
            </div>
            <div className="text-[10.5px] uppercase tracking-[0.2em] text-[var(--color-on-dark-faint)]">
              Catalog · sandbox · live
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {CLINICAL_BUCKETS.slice(0, 6).map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-white/[0.10] bg-white/[0.04] px-2 py-0.5 text-[10.5px] font-medium text-[var(--color-on-dark-soft)]"
                >
                  {b}
                </span>
              ))}
              <span className="rounded-full border border-white/[0.10] bg-white/[0.04] px-2 py-0.5 text-[10.5px] font-medium text-[var(--color-on-dark-faint)]">
                +{Math.max(0, CLINICAL_BUCKETS.length - 6)}
              </span>
            </div>
            <Link
              href="/cases"
              className="inline-flex h-10 items-center justify-between gap-2 rounded-full border border-white/[0.14] bg-white/[0.04] px-4 text-[13px] font-medium text-white smooth hover:bg-white/[0.08]"
            >
              Open the bank
              <Icon.ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </Surface>

      {/* PRIMARY — Curated case features =========================== */}
      <Surface variant="card" padding="lg" radius="xl" className="lg:col-span-12">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="num-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              Featured patients
            </span>
            <h2 className="text-[22px] font-semibold tracking-tight text-[var(--color-ink)]">
              Two mystery patients available now
            </h2>
            <p className="max-w-xl text-[12.5px] text-[var(--color-ink-muted)]">
              Same patient every time. The diagnosis is hidden — interview,
              examine, and commit. Repeat until the pattern is automatic.
            </p>
          </div>
          <Badge tone="accent" size="sm" dot pulse>
            Diagnosis hidden
          </Badge>
        </div>

        <div className="nested-module-tray p-3 md:p-4">
          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            {CURATED_CASES.map((c, idx) => (
              <CuratedCaseCard key={c.slug} curatedCase={c} index={idx} />
            ))}
          </div>
        </div>
      </Surface>

      {/* SECONDARY — Stats + how-it-works ========================== */}
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
            How a drill works
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
            title="Pick a curated case"
            tag="catalog"
            items={[
              "Two fixed encounters at fixed URLs",
              "Same patient, same flow — repeatable on demand",
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
    </div>
  );
}

/* ----------------------------------------------------------------- */

function CuratedCaseCard({
  curatedCase,
  index,
}: {
  curatedCase: CuratedCase;
  index: number;
}) {
  const tone = curatedCase.difficulty === "Medium" ? "warn" : "danger";
  const number = String(index + 1).padStart(2, "0");

  return (
    <Link
      href={curatedCase.route}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-line-emphasis)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] smooth hover:-translate-y-[1px] hover:border-[color-mix(in_srgb,var(--color-accent)_35%,var(--color-line-emphasis))] hover:shadow-[var(--shadow-card-lg)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[var(--color-accent-soft)] opacity-0 blur-3xl smooth group-hover:opacity-100"
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="num-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
            Patient {number}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
            · diagnosis hidden
          </span>
        </div>
        <Badge tone="dark" size="xs">
          Mystery
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-[22px] font-bold tracking-tight text-[var(--color-ink)]">
          {curatedCase.title}
        </h3>
        <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
          {curatedCase.description}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={tone} size="xs" dot>
          {curatedCase.difficulty}
        </Badge>
        <Badge tone="neutral" size="xs">
          <Icon.Calendar size={10} /> ~{curatedCase.estimatedMinutes} min
        </Badge>
        <Badge tone="info" size="xs">
          Diagnosis hidden
        </Badge>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-[var(--color-line-strong)] pt-4">
        <span className="text-[11px] text-[var(--color-ink-muted)]">
          Fixed URL ·{" "}
          <span className="num-mono text-[var(--color-ink-soft)]">
            {curatedCase.route}
          </span>
        </span>
        <Button size="sm" trailingIcon={<Icon.ArrowUpRight size={12} />}>
          Open case
        </Button>
      </div>
    </Link>
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
    <li className="grid grid-cols-[28px_1fr] gap-x-4 border-b border-[var(--color-line-strong)] py-3 last:border-0 last:pb-0 first:pt-0">
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
