"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { CaseListItem } from "@/lib/api/casesTypes";
import {
  Badge,
  Button,
  Icon,
  ProgressBarOnDark,
  Surface,
  TickBar,
} from "@/components/ui";

const PAGE_SIZE = 25;

function cleanPatientName(name: string): string {
  return name.replace(/\d+/g, "").replace(/\s+/g, " ").trim();
}

export function CasesBankClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") ?? "";
  const initialPage = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);

  const [qInput, setQInput] = useState(initialQ);
  const [q, setQ] = useState(initialQ);
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
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (q.trim()) params.set("q", q.trim());
        // bucket filter removed for Synthea-backed patients

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
        // bucket filter removed for Synthea-backed patients
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
  }, [q, page, router]);

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
      {/* HERO - Case bank header ================================ */}
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

          <div className="relative grid grid-cols-2 gap-3">
            <DarkPanel
              title="Total cases"
              hint="Catalog size"
              value={total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total)}
            />
            <DarkPanel title="Schema" hint="Synthea import" value="3 tables" />
            <div className="col-span-2 flex flex-col gap-2 rounded-[var(--radius-md)] border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-on-dark-faint)]">
                Catalog readiness
              </div>
              <TickBar value={Math.min(100, total / 50)} count={48} onDark className="w-full" />
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
                placeholder="Search patients by name or Id..."
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                className="h-10 w-full rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] pl-9 pr-4 text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none smooth focus:border-[var(--color-ink)] focus:bg-[var(--color-surface)]"
              />
            </div>
            <div className="flex items-center gap-2 text-[12px] text-[var(--color-ink-muted)]">
              <span className="num">
                {loading
                  ? "Loading..."
                  : `${(data?.cases.length ?? 0).toLocaleString()} of ${totalDisplay}`}
              </span>
            </div>
          </div>

          <div className="text-[12px] text-[var(--color-ink-muted)]">
            Patients imported from Synthea (`patients`, `conditions`, `observations`).
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
                <th className="px-5 py-3 font-semibold">Patient</th>
                <th className="px-5 py-3 font-semibold">Gender</th>
                <th className="px-5 py-3 font-semibold">Birthdate</th>
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
                      <div className="ml-auto h-7 w-16 rounded-full bg-[var(--color-surface-3)]" />
                    </td>
                  </tr>
                ))
              ) : !data?.cases.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-16 text-center text-[13px] text-[var(--color-ink-muted)]"
                  >
                    No cases match your filters.
                  </td>
                </tr>
              ) : (
                data.cases.map((row, i) => (
                  <tr
                    key={row.id}
                    className="group border-b border-[var(--color-line)] smooth hover:bg-[var(--color-surface-2)]"
                  >
                    <td className="px-5 py-3.5 num-mono text-[11px] text-[var(--color-ink-faint)]">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => void startCase(row.id)}
                        className="num-mono text-left text-[13px] font-semibold tracking-tight text-[var(--color-ink)] hover:underline"
                      >
                        {cleanPatientName(row.title)}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-[var(--color-ink-muted)]">
                      {row.bucket}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-[var(--color-ink-muted)]">
                      {row.chiefComplaintPreview}
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
            label="Encounters"
            body="Observations and diagnoses can be matched by shared ENCOUNTER IDs."
          />
          <FootNote
            icon={<Icon.Activity size={12} />}
            label="Quoted columns"
            body='Queries use exact, case-sensitive identifiers (e.g. patients."Id").'
          />
        </div>
      </Surface>
    </div>
  );
}

/* ----------------------------------------------------------------- */

function DarkPanel({ title, hint, value }: { title: string; hint: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="text-[12px] font-medium text-white">{title}</div>
      <div className="text-[11px] leading-snug text-[var(--color-on-dark-muted)]">{hint}</div>
      <div className="num mt-1 text-[28px] font-bold leading-none text-white">{value}</div>
      <div className="mt-1">
        <ProgressBarOnDark value={70} tone="warm" showThumb className="" />
      </div>
    </div>
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
