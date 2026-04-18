"use client";

import type { TranscriptTurnRow } from "@/types/session";

type Props = {
  turns: TranscriptTurnRow[];
};

export function TranscriptPanel({ turns }: Props) {
  return (
    <div className="flex min-h-[220px] flex-col rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur">
      <div className="mb-3 text-sm font-semibold text-white">Transcript</div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-sm">
        {turns.length === 0 ? (
          <div className="text-white/50">No messages yet. Start with an open-ended question.</div>
        ) : (
          turns.map((t) => (
            <div key={t.id} className="rounded-xl bg-white/5 p-3">
              <div className="mb-1 text-xs uppercase tracking-wide text-white/50">{t.speaker}</div>
              <div className="text-white/90">{t.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
