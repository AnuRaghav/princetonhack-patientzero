"use client";

import { useEffect, useRef } from "react";

import { Badge, Surface, cn } from "@/components/ui";
import type { TranscriptTurnRow } from "@/types/session";

type Props = {
  turns: TranscriptTurnRow[];
};

const speakerStyle = (speaker: string): {
  tone: "accent" | "neutral" | "info";
  label: string;
  align: "left" | "right";
} => {
  const s = speaker.toLowerCase();
  if (s.includes("patient")) return { tone: "accent", label: "Patient", align: "left" };
  if (s.includes("system") || s.includes("engine")) return { tone: "info", label: "Engine", align: "left" };
  return { tone: "neutral", label: "Clinician", align: "right" };
};

export function TranscriptPanel({ turns }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  return (
    <Surface
      variant="card"
      padding="md"
      radius="lg"
      className="flex min-h-[260px] flex-1 flex-col"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-[var(--color-ink)]">
          Transcript
        </div>
        <span className="num text-[11px] text-[var(--color-ink-muted)]">
          {turns.length} {turns.length === 1 ? "turn" : "turns"}
        </span>
      </div>
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1 text-[13px]"
      >
        {turns.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center">
            <div className="dot-bg flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] px-6 py-8 text-[12px]">
              <span className="font-medium text-[var(--color-ink)]">No turns yet</span>
              <span className="max-w-[28ch] text-[var(--color-ink-muted)]">
                Begin with an open-ended question to elicit the chief complaint.
              </span>
            </div>
          </div>
        ) : (
          turns.map((t) => {
            const meta = speakerStyle(t.speaker);
            const isClinician = meta.align === "right";
            return (
              <div
                key={t.id}
                className={cn("flex w-full", isClinician ? "justify-end" : "justify-start")}
              >
                <div className="flex max-w-[82%] flex-col gap-1">
                  <Badge tone={meta.tone} size="xs" className="self-start">
                    {meta.label}
                  </Badge>
                  <div
                    className={cn(
                      "rounded-[var(--radius-md)] px-3.5 py-2.5 leading-relaxed",
                      isClinician
                        ? "bg-[var(--color-ink)] text-white"
                        : "bg-[var(--color-surface-2)] border border-[var(--color-line)] text-[var(--color-ink)]",
                    )}
                  >
                    {t.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Surface>
  );
}
