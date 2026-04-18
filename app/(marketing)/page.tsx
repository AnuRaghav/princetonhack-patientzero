"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MarketingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "random">(null);
  const [error, setError] = useState<string | null>(null);

  const startRandom = async () => {
    setLoading("random");
    setError(null);
    try {
      const pick = await fetch("/api/cases/random");
      const body = (await pick.json()) as { id?: string; error?: string };
      if (!pick.ok) {
        setError(body.error ?? "Random case failed");
        return;
      }
      if (!body.id) {
        setError("No case id returned");
        return;
      }
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: body.id }),
      });
      const data = (await res.json()) as { sessionId?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not start session");
        return;
      }
      if (data.sessionId) router.push(`/sim/${data.sessionId}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">AI-SP</p>
        <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
          Medical education simulations with a deterministic clinical core.
        </h1>
        <p className="max-w-3xl text-lg text-white/70">
          Students interview an AI standardized patient and practice a structured encounter. Cases load from your
          Supabase dataset; the engine reveals findings and exam results server-side before any model narration.
        </p>
      </header>
      <section className="grid gap-6 md:grid-cols-3">
        <Feature title="Structured cases" body="Disease and symptom columns are projected into a full simulation document." />
        <Feature title="Deterministic engine" body="Revealed facts and exam results are computed server-side first." />
        <Feature title="Debrief-ready" body="Transcript and checklist roll into a scored report." />
      </section>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/cases"
          className="rounded-2xl bg-sky-500 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400"
        >
          Open case bank
        </Link>
        <button
          type="button"
          onClick={() => void startRandom()}
          disabled={loading !== null}
          className="rounded-2xl border border-white/20 px-6 py-3 text-base font-semibold text-white transition hover:border-sky-400/60 hover:text-white disabled:opacity-50"
        >
          {loading === "random" ? "Starting…" : "Random case"}
        </button>
        {error ? <span className="text-sm text-rose-300">{error}</span> : null}
      </div>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/70">{body}</p>
    </div>
  );
}
