"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { EncounterMessage } from "@/components/encounter";
import { mapSymptomRegionsToHotspots } from "@/components/body/regionInfo";
import { EncounterConversation } from "@/components/encounter";
import { ChallengeFinishDialog } from "@/components/curated/ChallengeFinishDialog";
import {
  CuratedInterviewFindings,
  type NewSymptomDiscoveredPayload,
} from "@/components/curated/CuratedInterviewFindings";
import { Badge, Button, Icon, Surface } from "@/components/ui";
import { cn } from "@/components/ui/cn";
import { buildCuratedChallengeResult, curatedChallengeStorageKey } from "@/lib/curated/challengeResult";
import { computeCuratedChallengeScore } from "@/lib/curated/curatedChallengeScore";
import { useSimUiStore } from "@/lib/store/simUiStore";
import type { CuratedCase, CuratedCaseSlug } from "@/lib/curatedCases";
import type { ExamTarget } from "@/types/exam";

/** Paths must match filenames in `public/models/` exactly (case-sensitive on Linux/production). */
const CURATED_BODY_MODEL: Record<CuratedCaseSlug, string> = {
  "maria-wolf": "/models/maria.glb",
  "jason-mehta": "/models/jason.glb",
};

const BodyScene = dynamic(
  () => import("@/components/body/BodyScene").then((m) => ({ default: m.BodyScene })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[340px] items-center justify-center text-[13px] text-white/60">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white" />
          Booting 3D scene…
        </div>
      </div>
    ),
  },
);

type Props = {
  curatedCase: CuratedCase;
  /** Patient’s opening line from curated JSON (`opening_statement`). */
  initialPatientGreeting?: string;
};

const difficultyTone = (d: CuratedCase["difficulty"]) =>
  d === "Medium" ? "warn" : "danger";

function formatAssessmentClock(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CuratedCaseShell({ curatedCase, initialPatientGreeting }: Props) {
  const { title, oneLiner, difficulty, estimatedMinutes, slug } = curatedCase;
  const [transcriptMessages, setTranscriptMessages] = useState<EncounterMessage[]>([]);
  const [challengeStarted, setChallengeStarted] = useState(false);
  const [assessmentStartedAt, setAssessmentStartedAt] = useState<number | null>(null);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [symptomPulseTargets, setSymptomPulseTargets] = useState<readonly ExamTarget[]>([]);
  const [symptomToast, setSymptomToast] = useState<{ id: number; labels: string[] } | null>(null);
  const pulseTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const router = useRouter();
  const setBodyHighlight = useSimUiStore((s) => s.setBodyHighlight);

  const handleNewSymptomDiscovered = useCallback((payload: NewSymptomDiscoveredPayload) => {
    setSymptomPulseTargets(mapSymptomRegionsToHotspots(payload.regions));
    setSymptomToast({ id: Date.now(), labels: payload.labels });
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    pulseTimerRef.current = window.setTimeout(() => setSymptomPulseTargets([]), 4800);
    toastTimerRef.current = window.setTimeout(() => setSymptomToast(null), 5200);
  }, []);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setBodyHighlight(null);
  }, [setBodyHighlight]);

  useEffect(() => {
    if (!challengeStarted || assessmentStartedAt == null) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [challengeStarted, assessmentStartedAt]);

  const elapsedMs =
    challengeStarted && assessmentStartedAt != null ? nowTick - assessmentStartedAt : 0;

  const questionCount = useMemo(() => {
    if (assessmentStartedAt == null) return 0;
    return transcriptMessages.filter(
      (m) => m.role === "clinician" && m.createdAt >= assessmentStartedAt,
    ).length;
  }, [transcriptMessages, assessmentStartedAt]);

  const handleStartAssessment = () => {
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setSymptomPulseTargets([]);
    setSymptomToast(null);
    setAssessmentStartedAt(Date.now());
    setChallengeStarted(true);
  };

  const handleSubmitDiagnosis = (diagnosis: string) => {
    if (assessmentStartedAt == null) return;
    const payload = buildCuratedChallengeResult({
      slug,
      caseTitle: title,
      diagnosisGuess: diagnosis,
      messages: transcriptMessages,
      assessmentStartedAt,
    });
    const score = computeCuratedChallengeScore(payload);
    sessionStorage.setItem(curatedChallengeStorageKey(slug), JSON.stringify({ ...payload, score }));
    setFinishDialogOpen(false);
    router.push(`/cases/${slug}/results`);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* HEADER ===================================================== */}
      <div className="flex flex-col gap-3 px-1">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            <Icon.ChevronRight size={12} className="rotate-180" />
            Back to console
          </Link>
          <Badge tone="dark" size="xs" dot pulse>
            Mystery case
          </Badge>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              Patient · diagnosis hidden
            </span>
          </div>
          <h1 className="text-[28px] font-bold leading-[1.05] tracking-tight text-[var(--color-ink)] md:text-[36px]">
            {title}
          </h1>
          <p className="max-w-2xl text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
            {oneLiner}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone={difficultyTone(difficulty)} size="xs" dot>
              {difficulty}
            </Badge>
            <Badge tone="neutral" size="xs">
              <Icon.Calendar size={10} /> ~{estimatedMinutes} min
            </Badge>
            <Badge tone="accent" size="xs">
              Deterministic
            </Badge>
            <Badge tone="info" size="xs">
              Diagnosis hidden
            </Badge>
          </div>
        </div>
      </div>

      {challengeStarted && assessmentStartedAt != null ? (
        <Surface variant="card" padding="none" radius="xl" className="flex flex-wrap items-center justify-between gap-3 border border-[var(--color-line)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Icon.Activity size={16} className="text-[var(--color-accent)]" />
              <span className="num-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
                Timer
              </span>
              <span className="num-mono text-[20px] font-semibold tabular-nums text-[var(--color-ink)]">
                {formatAssessmentClock(elapsedMs)}
              </span>
            </div>
            <div className="h-8 w-px bg-[var(--color-line)]" aria-hidden />
            <div className="flex items-center gap-2 text-[13px] text-[var(--color-ink-muted)]">
              <span className="num-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
                Questions asked
              </span>
              <span className="text-[18px] font-semibold tabular-nums text-[var(--color-ink)]">{questionCount}</span>
            </div>
          </div>
          <Badge tone="accent" size="xs" dot pulse>
            Assessment live
          </Badge>
        </Surface>
      ) : null}

      {/* SPLIT WORKSPACE =========================================== */}
      <div
        className={cn(
          "relative grid gap-3 lg:grid-cols-12 lg:items-stretch",
          !challengeStarted && "pointer-events-none",
        )}
      >
        {/* LEFT — 3D exam (top) + interview findings (bottom), height matches transcript column */}
        <div className="flex h-full min-h-[560px] flex-col gap-3 lg:col-span-7">
          <Surface
            variant="hero"
            padding="none"
            radius="xl"
            className="flex shrink-0 flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="text-[14px] font-semibold text-white">
                  Patient · 3D exam
                </div>
                <Badge tone="dark" size="xs">
                  preview
                </Badge>
              </div>
              <span className="num-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                drag · zoom
              </span>
            </div>

            <div className="relative h-[340px] w-full shrink-0">
              {symptomToast ? (
                <div
                  key={symptomToast.id}
                  className="pointer-events-none absolute left-1/2 top-3 z-20 w-[min(92%,320px)] -translate-x-1/2 opacity-100 transition-opacity duration-300"
                  role="status"
                  aria-live="polite"
                >
                  <div className="rounded-xl border border-amber-400/45 bg-black/85 px-4 py-2.5 shadow-lg backdrop-blur-md">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-amber-200/95">
                      New symptom discovered
                    </p>
                    <p className="mt-1 text-[12.5px] leading-snug text-white/90">
                      {symptomToast.labels.join(" · ")}
                    </p>
                  </div>
                </div>
              ) : null}
              <BodyScene
                modelSrc={CURATED_BODY_MODEL[slug]}
                pulseTargets={symptomPulseTargets}
                onExam={(intent) => {
                  setBodyHighlight(intent.target);
                }}
              />
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
                <div className="rounded-full border border-white/[0.14] bg-black/30 px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] text-white/70 backdrop-blur">
                  Interactions arrive with scoring
                </div>
              </div>
            </div>
          </Surface>

          <CuratedInterviewFindings
            slug={slug}
            messages={transcriptMessages}
            assessmentStartedAt={assessmentStartedAt}
            onNewSymptomDiscovered={handleNewSymptomDiscovered}
          />
        </div>

        {/* RIGHT — Encounter uses curated JSON (`lib/Maria.json` / `Jason.json`) via slug */}
        <EncounterConversation
          key={challengeStarted ? `encounter-live-${slug}` : `encounter-hold-${slug}`}
          sessionId={`curated-case-${slug}`}
          backend="converse"
          patientId={slug}
          disableHydration
          title={`Encounter · ${title}`}
          patientContext={oneLiner}
          initialGreeting={challengeStarted ? initialPatientGreeting : undefined}
          modeDefault="text"
          onTranscriptChange={setTranscriptMessages}
          interactionLocked={!challengeStarted}
          className="flex h-full min-h-[560px] flex-col lg:col-span-5"
        />

        {/* Dim workspace without applying opacity to ancestors of WebGL (opacity breaks canvas compositing). */}
        {!challengeStarted ? (
          <div
            className="pointer-events-none absolute inset-0 z-[45] bg-black/45"
            aria-hidden
          />
        ) : null}

        {!challengeStarted ? (
          <div className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center px-4">
            <div className="max-w-md rounded-xl border border-white/15 bg-black px-5 py-4 text-center shadow-xl">
              <p className="text-[14px] font-semibold text-white">Assessment not started</p>
              <p className="mt-2 text-[12px] leading-relaxed text-white/75">
                Use <span className="font-medium text-white">Start assessment</span> in the bar below to unlock the
                encounter, body exam, and findings.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <ChallengeFinishDialog
        open={finishDialogOpen}
        caseTitle={title}
        onCancel={() => setFinishDialogOpen(false)}
        onSubmit={handleSubmitDiagnosis}
      />

      {/* ACTION FOOTER ============================================= */}
      <Surface variant="card" padding="lg" radius="xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="num-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
                Controls
              </span>
              <Badge tone={challengeStarted ? "accent" : "neutral"} size="xs">
                {challengeStarted ? "in progress" : "ready"}
              </Badge>
            </div>
            <h2 className="text-[18px] font-semibold tracking-tight text-[var(--color-ink)]">
              {challengeStarted ? "End when you are ready" : "Begin the assessment"}
            </h2>
            <p className="max-w-xl text-[12.5px] text-[var(--color-ink-muted)]">
              Start to begin the timer and enable the encounter. We track elapsed time, questions you ask, surfaced
              symptoms, and the transcript until you finish and submit a diagnosis.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              disabled
              leadingIcon={<Icon.Clipboard size={14} />}
            >
              View rubric
            </Button>
            {!challengeStarted ? (
              <Button
                variant="primary"
                size="lg"
                type="button"
                trailingIcon={<Icon.Play size={14} />}
                onClick={handleStartAssessment}
              >
                Start assessment
              </Button>
            ) : null}
            <Button
              variant="primary"
              size="lg"
              type="button"
              trailingIcon={<Icon.ChevronRight size={14} />}
              disabled={!challengeStarted}
              onClick={() => setFinishDialogOpen(true)}
            >
              Finish challenge
            </Button>
          </div>
        </div>
      </Surface>
    </div>
  );
}
