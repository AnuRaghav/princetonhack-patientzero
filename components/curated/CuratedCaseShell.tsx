"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState } from "react";

import type { ExamIntent } from "@/components/body/BodyScene";
import {
  ChatTranscript,
  TextInputPanel,
  useEncounterConversation,
} from "@/components/encounter";
import { Badge, Button, Icon, Surface } from "@/components/ui";
import { useSimUiStore } from "@/lib/store/simUiStore";
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
  /**
   * When set, the shell can start a real simulator session (`POST /api/sessions`)
   * for this case id (e.g. curated Maria loads from `lib/patientCases/Maria.json`).
   */
  simulatorCaseId?: string;
};

const difficultyTone = (d: CuratedCase["difficulty"]) =>
  d === "Medium" ? "warn" : "danger";

export function CuratedCaseShell({ curatedCase, simulatorCaseId }: Props) {
  const { title, oneLiner, difficulty, estimatedMinutes } = curatedCase;
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [examBanner, setExamBanner] = useState<string | null>(null);
  const setBodyHighlight = useSimUiStore((s) => s.setBodyHighlight);

  const startChallenge = useCallback(async () => {
    if (!simulatorCaseId) return;
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: simulatorCaseId }),
      });
      const json = (await res.json()) as { sessionId?: string; error?: string };
      if (!res.ok || !json.sessionId) {
        setStartError(json.error ?? "Could not start session");
        return;
      }
      setSessionId(json.sessionId);
    } catch {
      setStartError("Network error");
    } finally {
      setStarting(false);
    }
  }, [simulatorCaseId]);

  const handleExam = useCallback(
    async (intent: ExamIntent) => {
      if (!sessionId) return;
      setExamBanner(null);
      try {
        const res = await fetch("/api/exam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            action: intent.action,
            target: intent.target,
          }),
        });
        const body = (await res.json()) as {
          finding?: string;
          visualCue?: { highlight?: string } | null;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(body.error ?? "Exam failed");
        }
        setBodyHighlight(body.visualCue?.highlight ?? intent.target);
      } catch (e) {
        setExamBanner(e instanceof Error ? e.message : "Exam failed");
      }
    },
    [sessionId, setBodyHighlight],
  );

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
                {sessionId ? "live" : "preview"}
              </Badge>
            </div>
            <span className="num-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
              drag · zoom
            </span>
          </div>

          <div className="relative h-[560px] w-full">
            {examBanner ? (
              <div className="absolute left-3 right-3 top-3 z-10 rounded-[var(--radius-md)] border border-[rgba(239,68,68,0.22)] bg-[var(--color-danger-soft)] px-3 py-2 text-[12px] text-[#b91c1c]">
                {examBanner}
              </div>
            ) : null}
            <BodyScene onExam={(intent) => void handleExam(intent)} />
            {!sessionId ? (
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
                <div className="rounded-full border border-white/[0.14] bg-black/30 px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] text-white/70 backdrop-blur">
                  Interactions arrive with scoring
                </div>
              </div>
            ) : null}
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
                {sessionId ? "live" : "idle"}
              </Badge>
            </div>
            <span className="num-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
              user · patient
            </span>
          </div>

          {sessionId ? (
            <CuratedLiveTranscript sessionId={sessionId} />
          ) : (
            <>
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
            </>
          )}
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
              <Badge tone={simulatorCaseId || sessionId ? "accent" : "warn"} size="xs">
                {sessionId ? "live" : simulatorCaseId ? "ready" : "staged"}
              </Badge>
            </div>
            <h2 className="text-[18px] font-semibold tracking-tight text-[var(--color-ink)]">
              Start the challenge
            </h2>
            <p className="max-w-xl text-[12.5px] text-[var(--color-ink-muted)]">
              {simulatorCaseId
                ? "Opens the full encounter workspace: live transcript, exam actions, and findings — same patient every run."
                : "Coming next: scoring, timed prompts, and the deterministic challenge flow. The patient and case are fixed — built for repetition."}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
              <span>Built for repetition</span>
              <span>·</span>
              <span>curated</span>
              <span>·</span>
              <span>deterministic</span>
            </div>
            {startError ? (
              <p className="text-[12px] text-[var(--color-danger)]">{startError}</p>
            ) : null}
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
              disabled={!simulatorCaseId || starting || Boolean(sessionId)}
              loading={starting}
              onClick={() => void startChallenge()}
              trailingIcon={<Icon.Play size={14} />}
            >
              {sessionId ? "Challenge started" : "Start Challenge"}
            </Button>
          </div>
        </div>
      </Surface>
    </div>
  );
}

/** Live transcript + composer; keeps the parent {@link Surface} chrome unchanged. */
function CuratedLiveTranscript({ sessionId }: { sessionId: string }) {
  const conversation = useEncounterConversation({
    backend: "chat",
    sessionId,
    autoHydrate: true,
  });

  return (
    <>
      <div className="dot-bg flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-5">
        {conversation.lastError ? (
          <div className="rounded-[var(--radius-sm)] border border-[rgba(239,68,68,0.2)] bg-[var(--color-danger-soft)] px-3 py-2 text-[12px] text-[#b91c1c]">
            {conversation.lastError}
          </div>
        ) : null}
        <ChatTranscript
          messages={conversation.messages}
          status={conversation.status}
          pendingPartial={conversation.pendingPartial}
          className="min-h-[280px] max-h-[460px]"
        />
      </div>

      <div className="border-t border-[var(--color-line)] p-3">
        <TextInputPanel
          status={conversation.status}
          onSend={(text) =>
            conversation.sendMessage(text, { source: "text", synthesizeSpeech: false })
          }
          placeholder="Type your question to the patient…"
        />
      </div>
    </>
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
