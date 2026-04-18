"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { DebriefCard } from "@/components/sim/DebriefCard";

type ScorePayload = {
  checklistScore: number;
  empathyScore: number;
  diagnosticScore: number;
  summary: string;
  misses: string[];
  strengths: string[];
};

export default function DebriefPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [score, setScore] = useState<ScorePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        let res = await fetch(`/api/score?sessionId=${sessionId}`);
        if (res.status === 404) {
          res = await fetch("/api/score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          if (!res.ok) {
            const body = (await res.json()) as { error?: string };
            throw new Error(body.error ?? "Unable to score session");
          }
          res = await fetch(`/api/score?sessionId=${sessionId}`);
        }
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "Unable to load score");
        }
        const data = (await res.json()) as ScorePayload;
        if (!cancelled) setScore(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-white">
        <p className="text-rose-300">{error}</p>
        <Link href="/" className="mt-4 inline-block text-sky-300 hover:underline">
          Back home
        </Link>
      </main>
    );
  }

  if (!score) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-white/80">
        <p>Generating debrief…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/" className="text-sm font-semibold text-sky-300 hover:underline">
          New session
        </Link>
        <Link href={`/sim/${sessionId}`} className="text-sm text-white/60 hover:text-white">
          View encounter (read-only state)
        </Link>
      </div>
      <DebriefCard
        checklistScore={score.checklistScore}
        empathyScore={score.empathyScore}
        diagnosticScore={score.diagnosticScore}
        summary={score.summary}
        misses={score.misses}
        strengths={score.strengths}
      />
    </main>
  );
}
