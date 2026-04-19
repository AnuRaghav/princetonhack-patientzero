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
  /** Which STT path is active (browser Web Speech vs server upload). */
  transport?: "browser" | "server";
  /** Disables mic (e.g. parent locked assessment). */
  locked?: boolean;
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

const SPEAKING_INDICATOR_VARIANT: Partial<
  Record<EncounterStatus, "thinking" | "speaking" | "listening">
> = {
  thinking: "thinking",
  speaking: "speaking",
  listening: "listening",
};

function UnsupportedNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4 text-center text-[12px] text-[var(--color-ink-muted)]",
        className,
      )}
    >
      Voice input isn&rsquo;t available in this browser. Use the Text tab to
      continue, or grant microphone access and try again.
    </div>
  );
}

function resolveRingTone(isListening: boolean, isSpeaking: boolean): string {
  if (isListening) return "text-[#ef4444]";
  if (isSpeaking) return "text-[var(--color-accent)]";
  return "text-transparent";
}

function StatusRow({ status }: { status: EncounterStatus }) {
  const variant = SPEAKING_INDICATOR_VARIANT[status];
  return (
    <div className="flex min-h-[20px] items-center gap-2">
      {variant ? <SpeakingIndicator variant={variant} /> : null}
      <span className="text-[13px] font-medium text-[var(--color-ink)]">
        {STATUS_LABELS[status]}
      </span>
    </div>
  );
}

function PartialOrHint({
  pendingPartial,
  transport,
}: {
  pendingPartial: string;
  transport?: "browser" | "server";
}) {
  if (pendingPartial) {
    return (
      <div className="w-full max-w-md rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-center text-[12px] italic text-[var(--color-ink-soft)]">
        “{pendingPartial}”
      </div>
    );
  }
  const hint =
    transport === "server"
      ? "Tap the mic, speak, then tap again to send."
      : "Speak naturally. Your message is sent automatically when you pause.";
  return (
    <p className="max-w-md text-center text-[11px] text-[var(--color-ink-muted)]">
      {hint}
    </p>
  );
}

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
  transport,
  locked = false,
}: Props) {
  if (!isSupported) {
    return <UnsupportedNotice className={className} />;
  }

  const showStop = isListening || isSpeaking || status === "thinking";
  const ringTone = resolveRingTone(isListening, isSpeaking);
  const ringHidden = !(isListening || isSpeaking);

  const onMicClick = () => {
    if (locked) return;
    if (isListening) onStop();
    else onStart();
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
            ringHidden && "hidden",
          )}
          aria-hidden
        />
        <button
          type="button"
          onClick={onMicClick}
          disabled={locked || status === "thinking" || status === "transcribing"}
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

      <StatusRow status={status} />

      <PartialOrHint pendingPartial={pendingPartial} transport={transport} />

      <div className="flex flex-wrap items-center justify-center gap-2">
        {showStop ? (
          <Button
            size="sm"
            variant="danger"
            onClick={onInterrupt}
            disabled={locked}
            leadingIcon={<Icon.X size={12} />}
          >
            Stop
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={onStart}
            disabled={locked}
            leadingIcon={<Icon.Mic size={12} />}
          >
            New turn
          </Button>
        )}
      </div>
    </div>
  );
}
