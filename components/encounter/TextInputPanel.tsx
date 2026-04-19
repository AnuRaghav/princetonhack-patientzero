"use client";

import { useState } from "react";

import { Button, Icon } from "@/components/ui";
import { cn } from "@/components/ui/cn";

import type { EncounterStatus } from "./lib/types";

type Props = {
  status: EncounterStatus;
  onSend: (text: string) => Promise<void>;
  /** Forces the send button into a busy state regardless of `status`. */
  busy?: boolean;
  className?: string;
  placeholder?: string;
};

const BUSY_STATUSES: ReadonlySet<EncounterStatus> = new Set([
  "thinking",
  "transcribing",
  "speaking",
  "listening",
]);

/** Polished chatbot-style input. Enter sends; Shift+Enter inserts a newline. */
export function TextInputPanel({
  status,
  onSend,
  busy,
  className,
  placeholder = "Type your question to the patient…",
}: Props) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isDisabled = busy || submitting || BUSY_STATUSES.has(status);

  const submit = async () => {
    const value = text.trim();
    if (!value || isDisabled) return;
    setSubmitting(true);
    try {
      await onSend(value);
      setText("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder={placeholder}
        rows={3}
        disabled={isDisabled}
        className={cn(
          "h-24 w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-3 pr-16 text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none smooth focus:border-[var(--color-ink)] disabled:opacity-60",
        )}
      />
      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        <span className="text-[11px] text-[var(--color-ink-muted)]">
          ⏎ send · ⇧⏎ newline
        </span>
        <Button
          size="sm"
          loading={submitting}
          disabled={isDisabled || !text.trim()}
          onClick={() => void submit()}
          trailingIcon={<Icon.Send size={12} />}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
