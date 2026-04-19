"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { EncounterMessage } from "@/components/encounter";
import { EncounterConversation } from "@/components/encounter";
import { CuratedInterviewFindings } from "@/components/curated/CuratedInterviewFindings";
import { Badge, Button, Icon, Surface } from "@/components/ui";
import { useSimUiStore } from "@/lib/store/simUiStore";
import type { CuratedCase } from "@/lib/curatedCases";

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

export function CuratedCaseShell({ curatedCase, initialPatientGreeting }: Props) {
  const { title, oneLiner, difficulty, estimatedMinutes, slug } = curatedCase;
  const [transcriptMessages, setTranscriptMessages] = useState<EncounterMessage[]>([]);
  const setBodyHighlight = useSimUiStore((s) => s.setBodyHighlight);

  useEffect(() => {
    setBodyHighlight(null);
  }, [setBodyHighlight]);

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

      {/* SPLIT WORKSPACE =========================================== */}
      <div className="grid gap-3 lg:grid-cols-12 lg:items-stretch">
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
              <BodyScene
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

          <CuratedInterviewFindings slug={slug} messages={transcriptMessages} />
        </div>

        {/* RIGHT — Encounter uses curated JSON (`lib/Maria.json` / `Jason.json`) via slug */}
        <EncounterConversation
          sessionId={`curated-case-${slug}`}
          backend="converse"
          patientId={slug}
          disableHydration
          title={`Encounter · ${title}`}
          patientContext={oneLiner}
          initialGreeting={initialPatientGreeting}
          modeDefault="text"
          onTranscriptChange={setTranscriptMessages}
          className="flex h-full min-h-[560px] flex-col lg:col-span-5"
        />
      </div>

      {/* ACTION FOOTER ============================================= */}
      <Surface variant="card" padding="lg" radius="xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="num-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
                Next step
              </span>
              <Badge tone="warn" size="xs">
                staged
              </Badge>
            </div>
            <h2 className="text-[18px] font-semibold tracking-tight text-[var(--color-ink)]">
              Start the challenge
            </h2>
            <p className="max-w-xl text-[12.5px] text-[var(--color-ink-muted)]">
              Coming next: scoring, timed prompts, and the deterministic
              challenge flow. The patient and case are fixed — built for
              repetition.
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
              <span>Built for repetition</span>
              <span>·</span>
              <span>curated</span>
              <span>·</span>
              <span>deterministic</span>
            </div>
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
            <Button
              variant="primary"
              size="lg"
              disabled
              trailingIcon={<Icon.Play size={14} />}
            >
              Start Challenge
            </Button>
          </div>
        </div>
      </Surface>
    </div>
  );
}
