"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge, Button, Icon, Surface } from "@/components/ui";
import {
  curatedChallengeStorageKey,
  parseCuratedChallengeResult,
  type CuratedChallengeResultV1,
} from "@/lib/curated/challengeResult";
import { computeCuratedChallengeScore } from "@/lib/curated/curatedChallengeScore";
import { getCuratedCase, isCuratedCaseSlug } from "@/lib/curatedCases";
import {
  BEHAVIORAL_RUBRIC,
  type BehavioralRubricKey,
} from "@/lib/curated/behavioralScore";
import type { ScoreCaseResult } from "@/lib/curated/scoreCase";
import { useSimUiStore } from "@/lib/store/simUiStore";

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="font-medium text-[var(--color-ink)]">{label}</span>
        <span className="num-mono tabular-nums text-[var(--color-ink-muted)]">
          {Math.round(value * 10) / 10} / {max}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-line)]">
        <div
          className="h-full rounded-full bg-[var(--color-accent)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function CuratedChallengeResultsPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slugParam = typeof params.slug === "string" ? params.slug : "";
  const setActiveNavOverride = useSimUiStore((s) => s.setActiveNavOverride);

  const [payload, setPayload] = useState<CuratedChallengeResultV1 | null>(null);

  useEffect(() => {
    setActiveNavOverride("debrief");
    return () => setActiveNavOverride(null);
  }, [setActiveNavOverride]);

  useEffect(() => {
    if (!slugParam || !isCuratedCaseSlug(slugParam)) {
      setPayload(null);
      return;
    }
    const raw =
      typeof window !== "undefined"
        ? sessionStorage.getItem(curatedChallengeStorageKey(slugParam))
        : null;
    setPayload(parseCuratedChallengeResult(raw));
  }, [slugParam]);

  const caseMeta = useMemo(() => {
    if (!isCuratedCaseSlug(slugParam)) return null;
    try {
      return getCuratedCase(slugParam);
    } catch {
      return null;
    }
  }, [slugParam]);

  const score = useMemo<ScoreCaseResult | null>(() => {
    if (!payload) return null;
    return payload.score ?? computeCuratedChallengeScore(payload);
  }, [payload]);

  if (!slugParam || !isCuratedCaseSlug(slugParam)) {
    return (
      <div className="px-4 py-10">
        <Surface variant="card" padding="lg" radius="xl" className="mx-auto max-w-lg">
          <p className="text-[14px] text-[var(--color-ink-muted)]">Unknown case.</p>
          <Link href="/cases" className="mt-3 inline-block text-[13px] font-medium text-[var(--color-accent)]">
            Back to cases
          </Link>
        </Surface>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="px-4 py-10">
        <Surface variant="card" padding="lg" radius="xl" className="mx-auto max-w-lg">
          <h1 className="text-[18px] font-semibold text-[var(--color-ink)]">No debrief data</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
            Finish a challenge from this case and submit your diagnosis to see your stats here. If you refreshed or
            opened this page in a new tab, start the case again and use{" "}
            <span className="font-medium text-[var(--color-ink)]">Finish challenge</span>.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="md"
              type="button"
              onClick={() => router.push(`/cases/${slugParam}`)}
            >
              Open case
            </Button>
            <Button variant="secondary" size="md" type="button" onClick={() => router.back()}>
              Back
            </Button>
          </div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-1 py-4 md:px-2">
      <div className="flex flex-col gap-2">
        <Link
          href="/cases"
          className="inline-flex w-fit items-center gap-1.5 text-[12px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          <Icon.ChevronRight size={12} className="rotate-180" />
          Cases
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent" size="xs" dot>
            Debrief
          </Badge>
          <span className="text-[28px] font-bold tracking-tight text-[var(--color-ink)] md:text-[32px]">
            Challenge complete
          </span>
        </div>
        <p className="text-[14px] text-[var(--color-ink-muted)]">
          {caseMeta?.title ?? payload.caseTitle}
        </p>
      </div>

      {score ? (
        <Surface
          variant="card"
          padding="lg"
          radius="xl"
          className="border border-[var(--color-accent)]/25 bg-[var(--color-surface-1)]"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="num-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
                Overall score
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-[48px] font-bold tabular-nums leading-none tracking-tight text-[var(--color-ink)]">
                  {Math.round(score.totalScore)}
                </span>
                <span className="text-[18px] font-medium text-[var(--color-ink-muted)]">/ 100</span>
              </div>
              <p className="mt-2 max-w-xl text-[13px] text-[var(--color-ink-muted)]">
                Clinical performance (80 pts) combines diagnosis, findings, question quality, and efficiency. Behavioral
                (20 pts) is graded by K2 Think across clarity, structure, hypothesis-driven questioning and four other
                interview behaviors.
              </p>
            </div>
            <div className="flex gap-6 num-mono text-[13px]">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">Clinical</div>
                <div className="mt-0.5 text-[22px] font-semibold tabular-nums text-[var(--color-ink)]">
                  {Math.round(score.clinicalScore)}
                  <span className="text-[13px] font-normal text-[var(--color-ink-muted)]"> / 80</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
                  Behavioral
                </div>
                <div className="mt-0.5 text-[22px] font-semibold tabular-nums text-[var(--color-ink)]">
                  {Math.round(score.behavioralScore)}
                  <span className="text-[13px] font-normal text-[var(--color-ink-muted)]"> / 20</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <ScoreBar label="Diagnosis" value={score.breakdown.diagnosisOutOf30} max={30} />
            <ScoreBar label="Key symptoms" value={score.breakdown.symptomsOutOf15} max={15} />
            <ScoreBar label="Helpful context" value={score.breakdown.extraInfoOutOf10} max={10} />
            <ScoreBar label="Question yield" value={score.breakdown.questionQualityOutOf15} max={15} />
            <ScoreBar label="Efficiency" value={score.breakdown.efficiencyOutOf10} max={10} />
            <ScoreBar label="Behavioral" value={score.breakdown.behavioralOutOf20} max={20} />
          </div>
        </Surface>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Surface variant="card" padding="md" radius="lg">
          <div className="num-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
            Time
          </div>
          <div className="mt-1 text-[22px] font-semibold tabular-nums text-[var(--color-ink)]">
            {formatElapsed(payload.elapsedMs)}
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-ink-muted)]">Challenge timer</div>
        </Surface>
        <Surface variant="card" padding="md" radius="lg">
          <div className="num-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
            Your turns
          </div>
          <div className="mt-1 text-[22px] font-semibold tabular-nums text-[var(--color-ink)]">
            {payload.clinicianTurns}
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-ink-muted)]">Clinician messages sent</div>
        </Surface>
        <Surface variant="card" padding="md" radius="lg">
          <div className="num-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
            Dialogue turns
          </div>
          <div className="mt-1 text-[22px] font-semibold tabular-nums text-[var(--color-ink)]">
            {payload.totalDialogueTurns}
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-ink-muted)]">
            {payload.patientTurns} patient · {payload.clinicianTurns} clinician (excl. system)
          </div>
        </Surface>
        <Surface variant="card" padding="md" radius="lg">
          <div className="num-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
            Symptoms surfaced
          </div>
          <div className="mt-1 text-[22px] font-semibold tabular-nums text-[var(--color-ink)]">
            {payload.symptomsDiscoveredCount}
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-ink-muted)]">From interview keyword discovery</div>
        </Surface>
      </div>

      <Surface variant="card" padding="lg" radius="xl">
        <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Your diagnosis</h2>
        <p className="mt-2 whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3 text-[14px] leading-relaxed text-[var(--color-ink)]">
          {payload.diagnosisGuess || "-"}
        </p>
      </Surface>

      <Surface variant="card" padding="lg" radius="xl">
        <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Feedback</h2>
        {score?.feedback ? (
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            <div>
              <div className="num-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
                Strengths
              </div>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                {score.feedback.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="num-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
                Gaps
              </div>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                {score.feedback.weaknesses.length ? (
                  score.feedback.weaknesses.map((s) => <li key={s}>{s}</li>)
                ) : (
                  <li className="list-none pl-0 text-[var(--color-ink-faint)]">None flagged.</li>
                )}
              </ul>
            </div>
            <div>
              <div className="num-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
                Try next time
              </div>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                {score.feedback.suggestions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
            No qualitative feedback available for this run.
          </p>
        )}
      </Surface>

      {payload.symptomLabels.length > 0 ? (
        <Surface variant="card" padding="lg" radius="xl">
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Symptoms recorded from interview</h2>
          <ul className="mt-3 flex flex-col gap-1.5">
            {payload.symptomLabels.map((label) => (
              <li key={label} className="text-[13px] text-[var(--color-ink-muted)]">
                · {label}
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}

      {payload.behavioral ? (
        <Surface variant="card" padding="lg" radius="xl">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">Behavioral breakdown</h2>
            <span className="num-mono text-[12px] tabular-nums text-[var(--color-ink-muted)]">
              {Math.round(payload.behavioral.total)} / 20 · scored by K2 Think
            </span>
          </div>
          {payload.behavioral.summary ? (
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              {payload.behavioral.summary}
            </p>
          ) : null}
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {BEHAVIORAL_RUBRIC.map((item) => {
              const key = item.key as BehavioralRubricKey;
              const value = payload.behavioral!.breakdown[key] ?? 0;
              const comment = payload.behavioral!.comments?.[key];
              const pct = item.max > 0 ? Math.min(100, Math.max(0, (value / item.max) * 100)) : 0;
              return (
                <li
                  key={item.key}
                  className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3"
                >
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="font-medium text-[var(--color-ink)]">{item.label}</span>
                    <span className="num-mono tabular-nums text-[var(--color-ink-muted)]">
                      {value} / {item.max}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {comment ? (
                    <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--color-ink-muted)]">
                      {comment}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Surface>
      ) : null}

      <Surface variant="card" padding="lg" radius="xl">
        <details className="group">
          <summary className="cursor-pointer text-[15px] font-semibold text-[var(--color-ink)]">
            Full transcript ({payload.transcript.length} lines)
          </summary>
          <div className="mt-4 flex max-h-[min(420px,50vh)] flex-col gap-3 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
            {payload.transcript.map((line, i) => (
              <div key={`${line.createdAt}-${i}`} className="text-[12.5px] leading-relaxed">
                <span className="num-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
                  {line.role === "clinician" ? "You" : line.role === "patient" ? "Patient" : "System"}
                </span>
                <p className="mt-0.5 whitespace-pre-wrap text-[var(--color-ink)]">{line.text}</p>
              </div>
            ))}
          </div>
        </details>
      </Surface>

      <div className="flex flex-wrap gap-2 pb-8">
        <Button
          variant="primary"
          size="md"
          type="button"
          onClick={() => router.push(`/cases/${slugParam}`)}
        >
          Run case again
        </Button>
        <Button variant="secondary" size="md" type="button" onClick={() => router.push("/cases")}>
          All mystery cases
        </Button>
      </div>
    </div>
  );
}
