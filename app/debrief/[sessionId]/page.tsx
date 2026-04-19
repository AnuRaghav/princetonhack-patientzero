"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DebriefCard } from "@/components/sim/DebriefCard";
import { Badge, Button, Icon, Surface } from "@/components/ui";

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
  const router = useRouter();
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
      <Surface variant="card" padding="lg" radius="lg" className="mx-auto mt-10 max-w-2xl">
        <div className="text-[var(--color-danger)]">{error}</div>
        <Link
          href="/"
          className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--color-ink)] hover:underline"
        >
          ← Back to console
        </Link>
      </Surface>
    );
  }

  if (!score) {
    return (
      <div className="mt-10 flex items-center gap-3 text-[13px] text-[var(--color-ink-muted)]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-line-strong)] border-t-[var(--color-ink)]" />
        Generating debrief...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 px-1 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge tone="info" dot>
              Debrief
            </Badge>
            <span className="num-mono text-[11px] text-[var(--color-ink-faint)]">
              session.{sessionId.slice(0, 8)}
            </span>
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-ink)] md:text-[32px]">
            Performance dossier
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push(`/sim/${sessionId}`)}
            leadingIcon={<Icon.Stethoscope size={14} />}
          >
            Replay encounter
          </Button>
          <Button
            onClick={() => router.push("/")}
            trailingIcon={<Icon.ArrowRight size={14} />}
          >
            New session
          </Button>
        </div>
      </div>

      <DebriefCard
        checklistScore={score.checklistScore}
        empathyScore={score.empathyScore}
        diagnosticScore={score.diagnosticScore}
        summary={score.summary}
        misses={score.misses}
        strengths={score.strengths}
      />
    </div>
  );
}
