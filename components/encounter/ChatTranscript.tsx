"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/components/ui/cn";

import { SpeakingIndicator } from "./SpeakingIndicator";
import type { EncounterMessage, EncounterStatus } from "./lib/types";

type Props = {
  messages: ReadonlyArray<EncounterMessage>;
  status: EncounterStatus;
  /** Live STT preview shown as a ghost bubble at the bottom. */
  pendingPartial?: string;
  className?: string;
};

/**
 * Polished chat transcript: alternating bubbles (clinician right, patient
 * left), auto-scrolls to bottom on every change, optional ghost bubble for
 * an in-progress STT capture, and an inline thinking row while the model
 * is composing a reply.
 */
export function ChatTranscript({
  messages,
  status,
  pendingPartial,
  className,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, pendingPartial, status]);

  const showThinking = status === "thinking" || status === "transcribing";
  const showEmpty = messages.length === 0 && !pendingPartial && !showThinking;

  return (
    <div
      ref={scrollerRef}
      className={cn(
        "flex flex-col gap-3 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4",
        className,
      )}
    >
      {showEmpty ? (
        <div className="flex h-full min-h-[120px] items-center justify-center text-[12px] text-[var(--color-ink-muted)]">
          No messages yet - start the encounter when you&rsquo;re ready.
        </div>
      ) : null}

      {messages.map((msg) => (
        <Bubble key={msg.id} message={msg} />
      ))}

      {pendingPartial ? (
        <Bubble message={makePartialMessage(pendingPartial)} ghost />
      ) : null}

      {showThinking ? (
        <div className="flex items-center gap-2 self-start rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2">
          <SpeakingIndicator
            variant="thinking"
            label={status === "transcribing" ? "Transcribing" : "Patient is thinking"}
          />
        </div>
      ) : null}
    </div>
  );
}

function makePartialMessage(text: string): EncounterMessage {
  return {
    id: "__partial__",
    role: "clinician",
    text,
    source: "voice",
    createdAt: 0,
  };
}

function Bubble({ message, ghost }: { message: EncounterMessage; ghost?: boolean }) {
  const isClinician = message.role === "clinician";
  return (
    <div
      className={cn(
        "flex w-full",
        isClinician ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
          isClinician
            ? "bg-[var(--color-ink)] text-white shadow-[0_1px_0_rgba(255,255,255,0.10)_inset]"
            : "border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)]",
          ghost && "opacity-50 italic",
        )}
      >
        {message.text || (ghost ? "..." : "")}
        {!ghost && message.source === "voice" ? (
          <span
            className={cn(
              "ml-2 align-middle text-[10px] uppercase tracking-wide",
              isClinician ? "text-white/60" : "text-[var(--color-ink-faint)]",
            )}
          >
            voice
          </span>
        ) : null}
      </div>
    </div>
  );
}
