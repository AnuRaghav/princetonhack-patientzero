"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { CLINICAL_BUCKETS } from "@/lib/cases/bucketFilters";
import type { CaseListItem } from "@/lib/api/casesTypes";
import {
  Badge,
  Button,
  Icon,
  Surface,
  cn,
} from "@/components/ui";
import { SessionHeatmap, type HeatmapBucket } from "@/components/sim/SessionHeatmap";

const PAGE_SIZE = 25;

export function CasesBankClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") ?? "";
  const initialBucket = searchParams.get("bucket") ?? "";
  const initialPage = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);

  const [qInput, setQInput] = useState(initialQ);
  const [q, setQ] = useState(initialQ);
  const [bucket, setBucket] = useState(initialBucket);
  const [page, setPage] = useState(initialPage);
  const qDebounceIsFirst = useRef(true);

  const [data, setData] = useState<{
    cases: CaseListItem[];
    total: number;
    totalPages: number;
    page: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [randomLoading, setRandomLoading] = useState(false);

  const [activity, setActivity] = useState<{
    buckets: HeatmapBucket[];
    total: number;
    completed: number;
    uniqueCases: number;
    streak: number;
    bestDay: { date: string; count: number };
  } | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setQ(qInput);
      if (!qDebounceIsFirst.current) setPage(1);
      qDebounceIsFirst.current = false;
    }, 280);
    return () => window.clearTimeout(id);
  }, [qInput]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/sessions/activity");
        if (!res.ok) return;
        const json = (await res.json()) as {
          buckets?: HeatmapBucket[];
          total?: number;
          completed?: number;
          uniqueCases?: number;
          streak?: number;
          bestDay?: { date: string; count: number };
        };
        if (cancelled) return;
        setActivity({
          buckets: json.buckets ?? [],
          total: json.total ?? 0,
          completed: json.completed ?? 0,
          uniqueCases: json.uniqueCases ?? 0,
          streak: json.streak ?? 0,
          bestDay: json.bestDay ?? { date: "", count: 0 },
        });
      } catch {
        /* non-fatal — heatmap just shows zeros */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (q.trim()) params.set("q", q.trim());
        if (bucket && bucket !== "General medicine") params.set("bucket", bucket);

        const res = await fetch(`/api/cases?${params.toString()}`);
        const json = (await res.json()) as {
          cases?: CaseListItem[];
          total?: number;
          totalPages?: number;
          page?: number;
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) {
            setError(json.error ?? "Failed to load cases");
            setData(null);
          }
          return;
        }
        if (!cancelled) {
          setData({
            cases: json.cases ?? [],
            total: json.total ?? 0,
            totalPages: json.totalPages ?? 0,
            page: json.page ?? 1,
          });
          const next = new URLSearchParams();
          if (q.trim()) next.set("q", q.trim());
          if (bucket && bucket !== "General medicine") next.set("bucket", bucket);
          if (page > 1) next.set("page", String(page));
          const qs = next.toString();
          router.replace(`/cases${qs ? `?${qs}` : ""}`, { scroll: false });
        }
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, bucket, page, router]);

  const startCase = async (caseId: string) => {
    setStartingId(caseId);
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
      setStartingId(null);
    }
  };

  const randomCase = async () => {
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

  const total = data?.total ?? 0;
  const totalDisplay = useMemo(() => total.toLocaleString(), [total]);

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      {/* HERO — Case bank header ================================ */}
      <Surface variant="hero" padding="none" radius="xl" className="lg:col-span-12">
        <div className="relative grid gap-6 p-7 md:p-8 lg:grid-cols-[1.4fr_1fr]">
          <div
            className="pointer-events-none absolute -right-20 top-1/2 h-[300px] w-[300px] -translate-y-1/2 rounded-full opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(255,138,61,0.28), rgba(52,210,124,0.16) 50%, transparent 70%)",
            }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Badge tone="dark" size="xs" dot pulse>
                Case bank
              </Badge>
              <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-on-dark-faint)]">
                Live · Supabase
              </span>
            </div>
            <h1 className="text-balance text-[34px] font-bold leading-[1.05] tracking-tight text-white md:text-[42px]">
              Pick a case.{" "}
              <span className="grad-warm-text">Run the encounter.</span>
            </h1>
            <p className="max-w-xl text-[14px] leading-relaxed text-[var(--color-on-dark-soft)]">
              Clinical vignettes as graded problems. Search the catalog, filter by
              specialty, or draw a uniformly random case. Solve to enter the encounter.
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <Button
                variant="on-dark"
                size="md"
                loading={randomLoading}
                disabled={startingId !== null}
                onClick={() => void randomCase()}
                leadingIcon={<Icon.Sparkles size={14} />}
              >
                Random case
              </Button>
              <span className="num text-[12px] text-[var(--color-on-dark-muted)]">
                <span className="font-semibold text-white">{totalDisplay}</span> cases indexed
              </span>
            </div>
          </div>

          <div className="relative flex min-w-0 flex-col gap-4 rounded-[var(--radius-md)] border border-white/[0.06] bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-on-dark-faint)]">
                  Case-solving activity
                </div>
                <div className="mt-1 truncate text-[13px] font-semibold text-white">
                  Last {Math.max(1, Math.round((activity?.buckets.length ?? 84) / 7))} weeks · {(activity?.total ?? 0).toLocaleString()} sessions
                </div>
              </div>
              <Badge tone="dark" size="xs" dot pulse>
                live
              </Badge>
            </div>

            <SessionHeatmap buckets={activity?.buckets ?? []} />

            <div className="grid grid-cols-4 gap-3 border-t border-white/[0.06] pt-3">
              <HeroStat label="Started" value={String(activity?.total ?? 0)} />
              <HeroStat label="Completed" value={String(activity?.completed ?? 0)} />
              <HeroStat label="Streak" value={`${activity?.streak ?? 0}d`} />
              <HeroStat
                label="Catalog"
                value={total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total)}
              />
            </div>
          </div>
        </div>
      </Surface>

      {/* FILTERS + SEARCH ==================================== */}
      <Surface variant="card" padding="md" radius="lg" className="lg:col-span-12">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-md flex-1">
              <Icon.Search
                size={14}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]"
              />
              <input
                type="search"
                placeholder="Search diseases or symptoms…"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                className="h-10 w-full rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] pl-9 pr-4 text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none smooth focus:border-[var(--color-ink)] focus:bg-[var(--color-surface)]"
              />
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[var(--color-ink-muted)]">
              <span className="num">
                {loading
                  ? "Loading…"
                  : `${(data?.cases.length ?? 0).toLocaleString()} of ${totalDisplay}`}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              active={!bucket}
              onClick={() => {
                setBucket("");
                setPage(1);
              }}
            >
              All
            </FilterChip>
            {CLINICAL_BUCKETS.map((b) => (
              <FilterChip
                key={b}
                active={bucket === b}
                onClick={() => {
                  setBucket((prev) => (prev === b ? "" : b));
                  setPage(1);
                }}
              >
                {b}
              </FilterChip>
            ))}
          </div>
        </div>
      </Surface>

      {/* RESULTS ============================================ */}
      <Surface variant="card" padding="none" radius="lg" className="lg:col-span-12">
        {error ? (
          <div className="border-b border-[var(--color-line)] bg-[var(--color-danger-soft)] px-5 py-3 text-[13px] text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
                <th className="px-5 py-3 font-semibold">#</th>
                <th className="px-5 py-3 font-semibold">Case</th>
                <th className="px-5 py-3 font-semibold">Specialty</th>
                <th className="px-5 py-3 text-right font-semibold">Symptoms</th>
                <th className="px-5 py-3 font-semibold">Difficulty</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--color-line)]">
                    <td className="px-5 py-4">
                      <div className="h-3 w-8 rounded bg-[var(--color-surface-3)]" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-48 rounded bg-[var(--color-surface-3)]" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3 w-24 rounded bg-[var(--color-surface-3)]" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="ml-auto h-3 w-6 rounded bg-[var(--color-surface-3)]" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-5 w-14 rounded-full bg-[var(--color-surface-3)]" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="ml-auto h-7 w-16 rounded-full bg-[var(--color-surface-3)]" />
                    </td>
                  </tr>
                ))
              ) : !data?.cases.length ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-[13px] text-[var(--color-ink-muted)]"
                  >
                    No cases match your filters.
                  </td>
                </tr>
              ) : (
                data.cases.map((row) => (
                  <tr
                    key={row.id}
                    className="group border-b border-[var(--color-line)] smooth hover:bg-[var(--color-surface-2)]"
                  >
                    <td className="px-5 py-3.5 num-mono text-[11px] text-[var(--color-ink-faint)]">
                      {row.id}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => void startCase(row.id)}
                        className="num-mono text-left text-[13px] font-semibold tracking-tight text-[var(--color-ink)] hover:underline"
                      >
                        Case #{row.id}
                      </button>
                    </td>
                    <td
                      className="max-w-[220px] truncate px-5 py-3.5 text-[12px] text-[var(--color-ink-muted)]"
                      title={row.bucket}
                    >
                      {row.bucket}
                    </td>
                    <td className="px-5 py-3.5 text-right num text-[12px] text-[var(--color-ink-soft)]">
                      {row.symptomCount}
                    </td>
                    <td className="px-5 py-3.5">
                      <DifficultyBadge d={row.difficulty} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        size="sm"
                        loading={startingId === row.id}
                        disabled={startingId !== null || randomLoading}
                        onClick={() => void startCase(row.id)}
                        trailingIcon={<Icon.ArrowUpRight size={12} />}
                      >
                        Solve
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] px-5 py-4">
            <div className="text-[12px] text-[var(--color-ink-muted)]">
              Page <span className="num font-medium text-[var(--color-ink)]">{data.page}</span> of{" "}
              <span className="num font-medium text-[var(--color-ink)]">{data.totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= data.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Surface>

      {/* FOOTER NOTES ========================================= */}
      <Surface variant="muted" padding="md" radius="lg" className="lg:col-span-12">
        <div className="grid gap-3 md:grid-cols-3">
          <FootNote
            icon={<Icon.Sparkles size={12} />}
            label="Random"
            body="Uniform pick across the full Supabase row count."
          />
          <FootNote
            icon={<Icon.Layers size={12} />}
            label="Specialties"
            body="Keyword heuristic on Disease + symptom columns."
          />
          <FootNote
            icon={<Icon.Activity size={12} />}
            label="Difficulty"
            body="Derived from how many symptom slots are filled (Easy / Med / Hard)."
          />
        </div>
      </Surface>
    </div>
  );
}

/* ----------------------------------------------------------------- */

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.16em] text-white/35">
        {label}
      </span>
      <span className="num text-[16px] font-bold leading-none text-white">
        {value}
      </span>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium smooth",
        active
          ? "border-transparent bg-[var(--color-ink)] text-white"
          : "border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]",
      )}
    >
      {children}
    </button>
  );
}

function DifficultyBadge({ d }: { d: CaseListItem["difficulty"] }) {
  const tone = d === "Easy" ? "accent" : d === "Medium" ? "warn" : "danger";
  return (
    <Badge tone={tone} size="xs" dot>
      {d === "Medium" ? "Med." : d}
    </Badge>
  );
}

function FootNote({
  icon,
  label,
  body,
}: {
  icon: React.ReactNode;
  label: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink-soft)]">
        {icon}
      </span>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink)]">
          {label}
        </div>
        <div className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">{body}</div>
      </div>
    </div>
  );
}
