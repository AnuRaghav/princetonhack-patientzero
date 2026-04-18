"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { ExamIntent } from "@/components/body/BodyScene";
import { ChatPanel } from "@/components/sim/ChatPanel";
import { PatientStatusCard } from "@/components/sim/PatientStatusCard";
import { TranscriptPanel } from "@/components/sim/TranscriptPanel";
import { useSimUiStore } from "@/lib/store/simUiStore";
import type { SessionRow, TranscriptTurnRow } from "@/types/session";

const BodyScene = dynamic(
  () => import("@/components/body/BodyScene").then((m) => ({ default: m.BodyScene })),
  { ssr: false, loading: () => <div className="text-sm text-white/60">Loading 3D scene…</div> },
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
  const [banner, setBanner] = useState<string | null>(null);

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
      setLastFinding(body.finding ?? null);
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
      <section className="flex flex-1 flex-col gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">Physical exam</p>
          <h2 className="text-xl font-semibold text-white">3D body interface</h2>
          <p className="text-sm text-white/60">
            Click core regions or joint hotspots for more precise targeting. RLQ palpation twice demonstrates rebound on
            the second pass.
          </p>
        </div>
        <div className="min-h-[460px] flex-1">
          <BodyScene onExam={(intent) => void handleExam(intent)} />
        </div>
        {lastFinding ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/90 backdrop-blur">
            <div className="text-xs uppercase tracking-wide text-white/50">Last finding</div>
            <p className="mt-2">{lastFinding}</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
