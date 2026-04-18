"use client";

import { useState } from "react";

type Props = {
  disabled?: boolean;
  onSend: (message: string) => Promise<void>;
};

export function ChatPanel({ disabled, onSend }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="mb-2 text-sm font-semibold text-white">History taking</div>
      <textarea
        className="h-24 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none ring-sky-400/40 focus:ring-2"
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
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={disabled || sending || !text.trim()}
          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition enabled:hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
