"use client";

import { Button, Icon } from "@/components/ui";
import { cn } from "@/components/ui/cn";

import { SpeakingIndicator } from "./SpeakingIndicator";
import type { EncounterStatus } from "./lib/types";

type Props = {
  status: EncounterStatus;
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  pendingPartial: string;
  onStart: () => void;
  onStop: () => void;
  onInterrupt: () => void;
  className?: string;
};

const STATUS_LABELS: Record<EncounterStatus, string> = {
  idle: "Tap the mic to speak",
  listening: "Listening…",
  transcribing: "Transcribing…",
  thinking: "Patient is thinking…",
  speaking: "Patient is speaking…",
  paused: "Paused",
  error: "Something went wrong",
};

/**
 * ChatGPT-style voice input UI: a single large mic affordance with a clear
 * status caption, animated ring while listening, live partial transcript,
 * and a Stop button that interrupts whatever is currently happening.
 */
export function VoiceInputPanel({
  status,
  isListening,
  isSpeaking,
  isSupported,
  pendingPartial,
  onStart,
  onStop,
  onInterrupt,
  className,
}: Props) {
  if (!isSupported) {
    return (
      <div
        className={cn(
          "rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4 text-center text-[12px] text-[var(--color-ink-muted)]",
          className,
        )}
      >
        Voice input requires the Web Speech API, which isn&rsquo;t available in
        this browser. Switch to Chrome/Edge, or use the Text tab to continue.
      </div>
    );
  }

  const showStop = isListening || isSpeaking || status === "thinking";
  const ringTone = isListening
    ? "text-[#ef4444]"
    : isSpeaking
    ? "text-[var(--color-accent)]"
    : "text-transparent";

  const onMicClick = () => {
    if (isListening) {
      onStop();
    } else {
      onStart();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6",
        className,
      )}
    >
      <div className="relative flex h-32 w-32 items-center justify-center">
        <div
          className={cn(
            "encounter-mic-ring absolute inset-0 rounded-full",
            ringTone,
            !(isListening || isSpeaking) && "hidden",
          )}
          aria-hidden
        />
        <button
          type="button"
          onClick={onMicClick}
          disabled={status === "thinking" || status === "transcribing"}
          aria-pressed={isListening}
          aria-label={isListening ? "Stop listening" : "Start listening"}
          className={cn(
            "relative z-10 flex h-24 w-24 items-center justify-center rounded-full smooth disabled:cursor-not-allowed disabled:opacity-60",
            isListening
              ? "bg-[#ef4444] text-white shadow-[0_8px_24px_-10px_rgba(239,68,68,0.65)] hover:bg-[#dc2626]"
              : "bg-[var(--color-ink)] text-white shadow-[0_8px_18px_-10px_rgba(15,17,22,0.55)] hover:bg-[#1a1c20]",
          )}
        >
          <Icon.Mic size={32} />
        </button>
      </div>

      <div className="flex min-h-[20px] items-center gap-2">
        {status === "thinking" || status === "speaking" || status === "listening" ? (
          <SpeakingIndicator
            variant={
              status === "thinking"
                ? "thinking"
                : status === "speaking"
                ? "speaking"
                : "listening"
            }
          />
        ) : null}
        <span className="text-[13px] font-medium text-[var(--color-ink)]">
          {STATUS_LABELS[status]}
        </span>
      </div>

      {pendingPartial ? (
        <div className="w-full max-w-md rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-center text-[12px] italic text-[var(--color-ink-soft)]">
          “{pendingPartial}”
        </div>
      ) : (
        <p className="max-w-md text-center text-[11px] text-[var(--color-ink-muted)]">
          Speak naturally. Your message is sent automatically when you pause.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {showStop ? (
          <Button
            size="sm"
            variant="danger"
            onClick={onInterrupt}
            leadingIcon={<Icon.X size={12} />}
          >
            Stop
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={onStart}
            leadingIcon={<Icon.Mic size={12} />}
          >
            New turn
          </Button>
        )}
      </div>
    </div>
  );
}
