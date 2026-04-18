"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { ExamIntent } from "@/components/body/BodyScene";
import { ChatPanel } from "@/components/sim/ChatPanel";
import { DiagnosisPanel } from "@/components/sim/DiagnosisPanel";
import { FindingsPanel } from "@/components/sim/FindingsPanel";
import { PatientStatusCard } from "@/components/sim/PatientStatusCard";
import { TranscriptPanel } from "@/components/sim/TranscriptPanel";
import {
  Badge,
  Button,
  Icon,
  Surface,
  cn,
} from "@/components/ui";
import { useSimUiStore } from "@/lib/store/simUiStore";
import type { DiagnosisHypothesis, EncounterFindings } from "@/types/findings";
import type { SessionRow, TranscriptTurnRow } from "@/types/session";

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

type SessionPayload = {
  session: SessionRow;
  transcript: TranscriptTurnRow[];
};

export default function SimPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [data, setData] = useState<SessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setBodyHighlight = useSimUiStore((s) => s.setBodyHighlight);
  const [lastFinding, setLastFinding] = useState<string | null>(null);
  const [lastTarget, setLastTarget] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [caseTitle, setCaseTitle] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      throw new Error(body.error ?? "Failed to load session");
    }
    const payload = (await res.json()) as SessionPayload;
    setData(payload);
    return payload;
  }, [sessionId]);

  useEffect(() => {
    void (async () => {
      try {
        const payload = await refresh();
        if (payload?.session.case_id) {
          try {
            const caseRes = await fetch(`/api/cases/${encodeURIComponent(payload.session.case_id)}`);
            if (caseRes.ok) {
              const caseJson = (await caseRes.json()) as {
                title?: string;
                chief_complaint?: string;
              };
              setCaseTitle(caseJson.title ?? caseJson.chief_complaint ?? null);
            }
          } catch {
            /* non-fatal */
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load session");
      }
    })();
  }, [refresh]);

  const handleDiagnosisSubmitted = (next: {
    diagnosisHypotheses: DiagnosisHypothesis[];
    findings: EncounterFindings;
  }) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            session: {
              ...prev.session,
              diagnosis_hypotheses: next.diagnosisHypotheses,
              discovered_findings: next.findings,
            },
          }
        : prev,
    );
  };

  const handleSend = async (message: string) => {
    setBanner(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Chat failed");
      }
      await refresh();
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Chat failed");
    }
  };

  const handleExam = async (intent: ExamIntent) => {
    setBanner(null);
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
      setLastFinding(body.finding ?? null);
      setLastTarget(`${intent.action} · ${intent.target}`);
      setBodyHighlight(body.visualCue?.highlight ?? intent.target);
      await refresh();
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Exam failed");
    }
  };

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

  if (!data) {
    return (
      <div className="mt-10 flex items-center gap-3 text-[13px] text-[var(--color-ink-muted)]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-line-strong)] border-t-[var(--color-ink)]" />
        Loading encounter…
      </div>
    );
  }

  const turnCount = data.transcript.length;

  return (
    <div className="flex flex-col gap-3">
      {/* SESSION HEADER ============================================ */}
      <div className="flex flex-col gap-3 px-1 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent" dot pulse>
              Live encounter
            </Badge>
            <Badge tone="neutral">
              case · #{data.session.case_id}
              {caseTitle ? ` · ${caseTitle}` : ""}
            </Badge>
            <span className="num-mono text-[11px] text-[var(--color-ink-faint)]">
              session.{sessionId.slice(0, 8)}
            </span>
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-ink)] md:text-[32px]">
            {caseTitle ?? "Clinical encounter"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => router.push("/cases")}
            leadingIcon={<Icon.X size={14} />}
          >
            Abort
          </Button>
          <Button
            onClick={() => router.push(`/debrief/${sessionId}`)}
            trailingIcon={<Icon.ArrowRight size={14} />}
          >
            End & debrief
          </Button>
        </div>
      </div>

      {banner ? (
        <div className="rounded-[var(--radius-md)] border border-[rgba(239,68,68,0.20)] bg-[var(--color-danger-soft)] px-4 py-2.5 text-[13px] text-[#b91c1c]">
          <span className="inline-flex items-center gap-2">
            <Icon.X size={14} /> {banner}
          </span>
        </div>
      ) : null}

      {/* CONTROL CENTER GRID ======================================= */}
      <div className="grid gap-3 lg:grid-cols-12">
        {/* LEFT — DIALOGUE LANE */}
        <div className="flex flex-col gap-3 lg:col-span-5">
          <PatientStatusCard
            painLevel={data.session.pain_level}
            emotionalState={data.session.emotional_state}
          />
          <TranscriptPanel turns={data.transcript} />
          <ChatPanel onSend={handleSend} />
        </div>

        {/* CENTER — DARK HERO 3D STAGE */}
        <Surface
          variant="hero"
          padding="none"
          radius="xl"
          className="flex flex-col lg:col-span-5"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="text-[14px] font-semibold text-white">Physical exam</div>
              <Badge tone="dark" size="xs">
                3D · interactive
              </Badge>
            </div>
            <span className="num-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
              drag · zoom · click
            </span>
          </div>
          <div className="relative h-[560px] w-full">
            <BodyScene onExam={(intent) => void handleExam(intent)} />
          </div>
        </Surface>

        {/* RIGHT — INSIGHTS RAIL */}
        <div className="flex flex-col gap-3 lg:col-span-2">
          <Surface variant="card" padding="md" radius="lg">
            <div className="text-[13px] font-semibold text-[var(--color-ink)]">
              Session
            </div>
            <div className="mt-3 grid gap-2.5">
              <Telemetry label="Turns" value={String(turnCount)} />
              <Telemetry label="Pain" value={`${data.session.pain_level}/10`} />
              <Telemetry
                label="Affect"
                value={data.session.emotional_state}
                mono={false}
              />
            </div>
          </Surface>

          <Surface variant="card" padding="md" radius="lg" className="flex-1">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold text-[var(--color-ink)]">
                Last finding
              </div>
              {lastFinding ? (
                <Badge tone="accent" size="xs" dot>
                  new
                </Badge>
              ) : null}
            </div>
            {lastFinding ? (
              <div className="mt-3 space-y-2">
                {lastTarget ? (
                  <div className="num-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
                    {lastTarget}
                  </div>
                ) : null}
                <p className="text-[13px] leading-relaxed text-[var(--color-ink)]">
                  {lastFinding}
                </p>
              </div>
            ) : (
              <div className="dot-bg mt-3 flex flex-col items-center gap-1 rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] px-3 py-6 text-center text-[12px] text-[var(--color-ink-muted)]">
                <Icon.Stethoscope size={18} />
                <span>Click a region to perform an exam.</span>
              </div>
            )}
          </Surface>
        </div>

        {/* BOTTOM — Findings + Diagnosis ============================ */}
        <div className="lg:col-span-7">
          <FindingsPanel findings={data.session.discovered_findings} />
        </div>
        <div className="lg:col-span-5">
          <DiagnosisPanel
            sessionId={sessionId}
            hypotheses={data.session.diagnosis_hypotheses ?? []}
            onSubmitted={handleDiagnosisSubmitted}
          />
        </div>
      </div>
    </div>
  );
}

function Telemetry({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-2 last:border-0 last:pb-0">
      <span className="text-[11px] text-[var(--color-ink-muted)]">{label}</span>
      <span
        className={cn(
          "text-[13px] text-[var(--color-ink)]",
          mono ? "num font-semibold" : "font-medium capitalize",
        )}
      >
        {value}
      </span>
    </div>
  );
}
