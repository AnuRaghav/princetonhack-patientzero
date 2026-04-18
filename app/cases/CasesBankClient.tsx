"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { CLINICAL_BUCKETS } from "@/lib/cases/bucketFilters";
import type { CaseListItem } from "@/lib/api/casesTypes";

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
          setError(json.error ?? "Failed to load cases");
          setData(null);
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
      if (!res.ok) {
        setError(json.error ?? "Could not start session");
        return;
      }
      if (json.sessionId) router.push(`/sim/${json.sessionId}`);
    } catch {
      setError("Network error");
    } finally {
      setStartingId(null);
    }
  };

  const randomCase = async () => {
    setError(null);
    try {
      const res = await fetch("/api/cases/random");
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Random pick failed");
        return;
      }
      if (json.id) await startCase(json.id);
    } catch {
      setError("Network error");
    }
  };

  const solvedHint = useMemo(() => {
    const t = data?.total ?? 0;
    return `0 / ${t.toLocaleString()} solved`;
  }, [data?.total]);

  return (
    <div className="flex min-h-full bg-[#0f1419] text-zinc-100">
      <aside className="hidden w-52 shrink-0 flex-col border-r border-zinc-800/80 bg-[#0b0e13] py-6 pl-4 pr-2 lg:flex">
        <div className="mb-6 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Explore</div>
        <nav className="space-y-1 text-sm">
          <Link
            href="/"
            className="block rounded-lg px-3 py-2 text-zinc-400 transition hover:bg-zinc-800/60 hover:text-zinc-100"
          >
            Home
          </Link>
          <span className="block rounded-lg bg-zinc-800/80 px-3 py-2 font-medium text-emerald-400/90">
            Case bank
          </span>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-800/80 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Case bank</h1>
              <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                Clinical vignettes as graded “problems.” Search the catalog, filter by specialty (heuristic on
                Disease text), or draw a random case. Select Solve to enter the encounter.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void randomCase()}
              disabled={!!startingId}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800/50 px-3 py-2 text-sm font-medium text-zinc-100 shadow-sm transition hover:border-emerald-500/50 hover:bg-zinc-800 disabled:opacity-50"
              title="Uniform random over all rows"
            >
              <ShuffleIcon />
              Random case
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {CLINICAL_BUCKETS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  setBucket((prev) => (prev === b ? "" : b));
                  setPage(1);
                }}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  bucket === b
                    ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
                    : "border-zinc-700/80 bg-zinc-900/50 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                placeholder="Search diseases and symptoms…"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 py-2 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 outline-none ring-emerald-500/30 focus:ring-2"
              />
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <span className="tabular-nums text-zinc-400">{solvedHint}</span>
              <span
                className="hidden h-10 w-10 rounded-full border border-zinc-700 sm:flex sm:items-center sm:justify-center"
                aria-hidden
              >
                <span className="text-xs text-zinc-500">0%</span>
              </span>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">{error}</div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-zinc-800/90 bg-[#121826] shadow-xl shadow-black/30">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800/90 bg-zinc-900/40 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3 text-right">Symptoms</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    Loading cases…
                  </td>
                </tr>
              ) : !data?.cases.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    No cases match your filters.
                  </td>
                </tr>
              ) : (
                data.cases.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`border-b border-zinc-800/50 transition hover:bg-zinc-800/30 ${
                      i % 2 === 0 ? "bg-[#121826]" : "bg-[#0f131c]"
                    }`}
                  >
                    <td className="px-4 py-3 text-zinc-600">—</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zinc-500">{row.id}.</span>{" "}
                      <span className="font-medium text-zinc-100">{row.title}</span>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-xs text-zinc-400" title={row.bucket}>
                      {row.bucket}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-400">{row.symptomCount}</td>
                    <td className="px-4 py-3">
                      <DifficultyPill d={row.difficulty} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void startCase(row.id)}
                        disabled={startingId !== null}
                        className="rounded-md bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {startingId === row.id ? "…" : "Solve"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-sm text-zinc-500">
              Page {data.page} / {data.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= data.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        ) : null}
      </main>

      <aside className="hidden w-72 shrink-0 border-l border-zinc-800/80 bg-[#0b0e13] py-6 pl-3 pr-4 xl:block">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Daily streak</h2>
          <p className="mt-2 text-sm text-zinc-400">Track completed encounters here soon.</p>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-zinc-600">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="aspect-square rounded border border-zinc-800 bg-zinc-900/50" />
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Notes</h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-zinc-400">
            <li>Random is uniform across your Supabase case count.</li>
            <li>Topic tags are keyword heuristics (Disease + symptoms).</li>
            <li>
              Difficulty is derived from how many symptom columns are filled (Easy / Med / Hard).
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function DifficultyPill({ d }: { d: CaseListItem["difficulty"] }) {
  const cls =
    d === "Easy"
      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
      : d === "Medium"
        ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
        : "border-rose-500/50 bg-rose-500/10 text-rose-200";
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {d === "Medium" ? "Med." : d}
    </span>
  );
}

function ShuffleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M3 7h3.5a5 5 0 013.89 1.84l6.22 8.32A5 5 0 0019.5 19H21M3 17h3.5a5 5 0 003.89-1.84l6.22-8.32A5 5 0 0119.5 5H21M21 7v2M21 5h-2M3 17v2M3 15h2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}
