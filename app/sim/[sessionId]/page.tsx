"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BodyLegend } from "@/components/body/BodyLegend";

import type { ExamIntent } from "@/components/body/BodyScene";
import { ChatPanel } from "@/components/sim/ChatPanel";
import { PatientStatusCard } from "@/components/sim/PatientStatusCard";
import { TranscriptPanel } from "@/components/sim/TranscriptPanel";
import { useSimUiStore } from "@/lib/store/simUiStore";
import type { ExamAction, ExamTarget } from "@/types/exam";
import type { SessionRow, TranscriptTurnRow } from "@/types/session";

const BodyScene = dynamic(
  () => import("@/components/body/BodyScene").then((m) => ({ default: m.BodyScene })),
  { ssr: false, loading: () => <div className="text-sm text-white/60">Loading 3D scene…</div> },
);

type SessionPayload = {
  session: SessionRow;
  transcript: TranscriptTurnRow[];
};
const SELECTION_INFO: Record<ExamTarget, { label: string; action: ExamAction; detail: string }> = {
  head: {
    label: "Head / general appearance",
    action: "inspect",
    detail: "General appearance and mental status inspection.",
  },
  chest: {
    label: "Chest / lungs",
    action: "auscultate",
    detail: "Lung and chest auscultation.",
  },
  abdomen: {
    label: "Abdomen",
    action: "palpate",
    detail: "General abdominal palpation.",
  },
  stomach: {
    label: "Stomach / abdomen",
    action: "palpate",
    detail: "Abdominal palpation for tenderness and guarding.",
  },
  rlq: {
    label: "Right lower quadrant",
    action: "palpate",
    detail: "Focused RLQ palpation for appendiceal signs.",
  },
  arms: {
    label: "Arms",
    action: "inspect",
    detail: "Upper extremity inspection for asymmetry and discomfort cues.",
  },
  legs: {
    label: "Legs",
    action: "inspect",
    detail: "Lower extremity inspection for posture and guarding.",
  },
  joints: {
    label: "Joints",
    action: "palpate",
    detail: "Joint-focused palpation for focal tenderness.",
  },
};

function isExamTarget(value: string): value is ExamTarget {
  return value in SELECTION_INFO;
}

export default function SimPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [data, setData] = useState<SessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setBodyHighlight = useSimUiStore((s) => s.setBodyHighlight);
  const bodyHighlight = useSimUiStore((s) => s.bodyHighlight);
  const [banner, setBanner] = useState<string | null>(null);
  const currentSelection =
    typeof bodyHighlight === "string" && isExamTarget(bodyHighlight) ? SELECTION_INFO[bodyHighlight] : null;

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      throw new Error(body.error ?? "Failed to load session");
    }
    const payload = (await res.json()) as SessionPayload;
    setData(payload);
  }, [sessionId]);

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load session");
      }
    })();
  }, [refresh]);

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
      setBodyHighlight(body.visualCue?.highlight ?? intent.target);
      await refresh();
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Exam failed");
    }
  };

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

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-white/80">
        <p>Loading simulation…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row">
      <section className="flex flex-1 flex-col gap-4">
        {banner ? (
          <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{banner}</div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/50">Session</p>
            <h1 className="text-xl font-semibold text-white">Clinical encounter</h1>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/debrief/${sessionId}`)}
            className="rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-white/90 transition hover:border-sky-400/60 hover:text-white"
          >
            End & debrief
          </button>
        </div>
        <PatientStatusCard painLevel={data.session.pain_level} emotionalState={data.session.emotional_state} />
        <TranscriptPanel turns={data.transcript} />
        <ChatPanel onSend={handleSend} />
      </section>
      <section className="flex flex-1 flex-col gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200/70">Physical exam</p>
          <h2 className="mt-1 text-xl font-semibold text-white">3D body interface</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            Select a body region to run a focused exam action. RLQ palpation remains available and can still show
            rebound tenderness on repeat checks.
          </p>
        </div>
        <div className="grid min-h-[500px] flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-h-[500px]">
            <BodyScene onExam={(intent) => void handleExam(intent)} />
          </div>
          <div className="self-start space-y-4">
            <BodyLegend highlight={bodyHighlight} />
            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-4 text-sm text-white/90 backdrop-blur">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200/70">
                Current selection
              </div>
              {currentSelection ? (
                <>
                  <div className="mt-2 text-lg font-semibold text-sky-300">{currentSelection.label}</div>
                  <div className="mt-1 uppercase tracking-[0.14em] text-white/55">
                    Exam action: {currentSelection.action}
                  </div>
                  <p className="mt-2 leading-relaxed text-white/75">{currentSelection.detail}</p>
                </>
              ) : (
                <p className="mt-2 leading-relaxed text-white/70">
                  Select a highlighted region on the body to run an exam action.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
