"use client";

import { useState } from "react";

import { Button, Icon, Surface } from "@/components/ui";

type Props = {
  disabled?: boolean;
  onSend: (message: string) => Promise<void>;
};

const SUGGESTIONS = [
  "What brings you in today?",
  "Where exactly is the pain?",
  "When did it start?",
  "Any fever or chills?",
];

export function ChatPanel({ disabled, onSend }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (override?: string) => {
    const value = (override ?? text).trim();
    if (!value || sending || disabled) return;
    setSending(true);
    try {
      await onSend(value);
      setText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <Surface variant="card" padding="md" radius="lg">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-[var(--color-ink)]">
          History taking
        </div>
        <span className="text-[11px] text-[var(--color-ink-muted)]">
          ⏎ send · ⇧⏎ newline
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => void submit(s)}
            disabled={disabled || sending}
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[11px] text-[var(--color-ink-soft)] smooth hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="relative mt-3">
        <textarea
          className="h-24 w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-3 pr-14 text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none smooth focus:border-[var(--color-ink)]"
          placeholder="Ask an open-ended question…"
          value={text}
          disabled={disabled || sending}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <div className="absolute bottom-3 right-3">
          <Button
            size="sm"
            loading={sending}
            disabled={disabled || !text.trim()}
            onClick={() => void submit()}
            trailingIcon={<Icon.Send size={12} />}
          >
            Send
          </Button>
        </div>
      </div>
    </Surface>
  );
}
