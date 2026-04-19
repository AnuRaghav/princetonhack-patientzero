"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { Badge, Button, Icon, Surface } from "@/components/ui";
import type { CuratedCase } from "@/lib/curatedCases";

const BodyScene = dynamic(
  () => import("@/components/body/BodyScene").then((m) => ({ default: m.BodyScene })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[460px] items-center justify-center text-[13px] text-white/60">
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
};

const difficultyTone = (d: CuratedCase["difficulty"]) =>
  d === "Medium" ? "warn" : "danger";

export function CuratedCaseShell({ curatedCase }: Props) {
  const { title, oneLiner, difficulty, estimatedMinutes } = curatedCase;

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
      <div className="grid gap-3 lg:grid-cols-12">
        {/* LEFT — 3D body model area */}
        <Surface
          variant="hero"
          padding="none"
          radius="xl"
          className="flex flex-col lg:col-span-7"
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

          <div className="relative h-[560px] w-full">
            <BodyScene onExam={() => {}} />
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
              <div className="rounded-full border border-white/[0.14] bg-black/30 px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] text-white/70 backdrop-blur">
                Interactions arrive with scoring
              </div>
            </div>
          </div>
        </Surface>

        {/* RIGHT — Transcript shell */}
        <Surface
          variant="card"
          padding="none"
          radius="xl"
          className="flex min-h-[560px] flex-col lg:col-span-5"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="text-[14px] font-semibold text-[var(--color-ink)]">
                Encounter transcript
              </div>
              <Badge tone="neutral" size="xs">
                idle
              </Badge>
            </div>
            <span className="num-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
              user · patient
            </span>
          </div>

          <div className="dot-bg flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-5">
            <SystemBubble>
              Patient is ready. Encounter has not started yet.
            </SystemBubble>
            <PatientBubblePlaceholder />
            <UserBubblePlaceholder />
            <div className="mt-auto flex items-center justify-center gap-2 pt-4 text-[11px] text-[var(--color-ink-faint)]">
              <span className="h-px flex-1 bg-[var(--color-line)]" />
              Transcript begins when challenge starts
              <span className="h-px flex-1 bg-[var(--color-line)]" />
            </div>
          </div>

          <div className="border-t border-[var(--color-line)] p-3">
            <div className="relative">
              <textarea
                disabled
                aria-disabled
                placeholder="Conversation begins when you start the challenge."
                className="h-20 w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3 pr-14 text-[13px] text-[var(--color-ink-muted)] placeholder:text-[var(--color-ink-faint)] outline-none"
              />
              <div className="absolute bottom-3 right-3">
                <Button
                  size="sm"
                  disabled
                  trailingIcon={<Icon.Send size={12} />}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        </Surface>
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

/* ----------------------------------------------------------------- */

function SystemBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[85%] rounded-full border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-center text-[11px] text-[var(--color-ink-muted)]">
      {children}
    </div>
  );
}

function PatientBubblePlaceholder() {
  return (
    <div className="flex max-w-[80%] flex-col gap-1.5 self-start rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
      <span className="num-mono text-[9.5px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
        Patient
      </span>
      <div className="flex flex-col gap-1.5">
        <span className="h-2.5 w-44 rounded bg-[var(--color-surface-3)]" />
        <span className="h-2.5 w-32 rounded bg-[var(--color-surface-3)]" />
      </div>
    </div>
  );
}

function UserBubblePlaceholder() {
  return (
    <div className="flex max-w-[80%] flex-col gap-1.5 self-end rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] p-3">
      <span className="num-mono text-[9.5px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
        You
      </span>
      <div className="flex flex-col gap-1.5">
        <span className="h-2.5 w-40 rounded bg-[var(--color-surface-3)]" />
        <span className="h-2.5 w-24 rounded bg-[var(--color-surface-3)]" />
      </div>
    </div>
  );
}
