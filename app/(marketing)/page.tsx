"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MarketingPage() {
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
    <main className="mx-auto flex min-h-full max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">AI-SP</p>
        <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
          Medical education simulations with a deterministic clinical core.
        </h1>
        <p className="max-w-3xl text-lg text-white/70">
          Students interview an AI standardized patient and perform a virtual physical exam on an interactive 3D body.
          Case JSON is the source of truth; the model only shapes natural language within an allowlist of facts.
        </p>
      </header>
      <section className="grid gap-6 md:grid-cols-3">
        <Feature title="Structured cases" body="Chief complaint, HPI, exam findings, and reveal rules live in versioned JSON." />
        <Feature title="Deterministic engine" body="Revealed facts and exam results are computed server-side before any LLM call." />
        <Feature title="Debrief-ready" body="Transcript plus checklist progress roll into a scored report for rapid feedback." />
      </section>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void start()}
          disabled={loading}
          className="rounded-2xl bg-sky-500 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition enabled:hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Starting…" : "Start appendicitis case"}
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
