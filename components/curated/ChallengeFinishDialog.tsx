"use client";

import { useState } from "react";

import { Button, Icon, Surface } from "@/components/ui";

type Props = {
  open: boolean;
  caseTitle: string;
  /** When true the dialog locks input and shows the K2 behavioral scoring spinner. */
  scoring?: boolean;
  onCancel: () => void;
  onSubmit: (diagnosis: string) => void;
};

export function ChallengeFinishDialog({ open, caseTitle, scoring = false, onCancel, onSubmit }: Props) {
  const [diagnosis, setDiagnosis] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    if (scoring) return;
    const t = diagnosis.trim();
    if (!t) return;
    onSubmit(t);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal
      aria-labelledby="challenge-finish-title"
    >
      <Surface variant="card" padding="lg" radius="xl" className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-2xl">
        <button
          type="button"
          onClick={onCancel}
          disabled={scoring}
          className="absolute right-3 top-3 rounded-full p-1.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Close"
        >
          <Icon.X size={18} />
        </button>

        <div className="flex flex-col gap-4 pr-6">
          <div className="flex flex-col gap-1">
            <span className="num-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              End challenge
            </span>
            <h2 id="challenge-finish-title" className="text-[20px] font-semibold tracking-tight text-[var(--color-ink)]">
              What is your diagnosis?
            </h2>
            <p className="text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              Case: <span className="font-medium text-[var(--color-ink)]">{caseTitle}</span>. Enter your working
              diagnosis in plain language — the debrief shows your score out of 100 plus strengths and improvement
              ideas.
            </p>
          </div>

          <textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. viral conjunctivitis — or your best single-line impression"
            rows={4}
            disabled={scoring}
            className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3 text-[14px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none focus:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
          />

          {scoring ? (
            <div
              className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-[12px] text-[var(--color-ink-muted)]"
              role="status"
              aria-live="polite"
            >
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-accent)]" />
              Scoring interview behaviors with K2 Think… this only takes a moment.
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" size="md" type="button" onClick={onCancel} disabled={scoring}>
              Keep interviewing
            </Button>
            <Button
              variant="primary"
              size="md"
              type="button"
              trailingIcon={<Icon.ChevronRight size={14} />}
              disabled={!diagnosis.trim() || scoring}
              onClick={handleSubmit}
            >
              {scoring ? "Scoring…" : "Submit & see debrief"}
            </Button>
          </div>
        </div>
      </Surface>
    </div>
  );
}
