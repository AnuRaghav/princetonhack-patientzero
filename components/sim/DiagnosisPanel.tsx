"use client";

import { useState } from "react";

import {
  Badge,
  Button,
  Icon,
  ProgressBar,
  Surface,
  cn,
} from "@/components/ui";
import type { DiagnosisHypothesis, EncounterFindings } from "@/types/findings";

type Props = {
  sessionId: string;
  hypotheses: DiagnosisHypothesis[];
  onSubmitted: (next: {
    diagnosisHypotheses: DiagnosisHypothesis[];
    findings: EncounterFindings;
  }) => void;
};

export function DiagnosisPanel({ sessionId, hypotheses, onSubmitted }: Props) {
  const [diagnosis, setDiagnosis] = useState("");
  const [confidence, setConfidence] = useState<number>(60);
  const [rationale, setRationale] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = diagnosis.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          diagnosis: trimmed,
          confidence,
          rationale: rationale.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        diagnosisHypotheses?: DiagnosisHypothesis[];
        findings?: EncounterFindings;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Submission failed");
        return;
      }
      onSubmitted({
        diagnosisHypotheses: json.diagnosisHypotheses ?? [],
        findings: json.findings ?? ({} as EncounterFindings),
      });
      setDiagnosis("");
      setRationale("");
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  };

  const ordered = [...hypotheses].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );

  return (
    <Surface variant="card" padding="md" radius="lg" className="flex flex-col gap-5">
      {/* Header ============================================ */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon.Brain size={14} className="text-[var(--color-ink-soft)]" />
            <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">
              Working diagnosis
            </h3>
          </div>
          <p className="mt-1 text-[11.5px] text-[var(--color-ink-muted)]">
            Append-only. Submit a hypothesis with a confidence and short rationale.
          </p>
        </div>
        <Badge tone="neutral" size="xs">
          {ordered.length} on record
        </Badge>
      </div>

      {/* Form ============================================== */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-[var(--color-ink-muted)]">
            Hypothesis
          </label>
          <input
            type="text"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Acute appendicitis"
            maxLength={200}
            disabled={busy}
            className="h-10 w-full rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-4 text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none smooth focus:border-[var(--color-ink)] focus:bg-[var(--color-surface)] disabled:opacity-60"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-[var(--color-ink-muted)]">
              Confidence
            </label>
            <span className="num text-[12px] font-semibold text-[var(--color-ink)]">
              {confidence}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            disabled={busy}
            className="accent-[var(--color-ink)]"
          />
          <ProgressBar
            value={confidence}
            tone={confidence >= 70 ? "accent" : confidence >= 40 ? "warn" : "danger"}
            size="sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-[var(--color-ink-muted)]">
            Rationale (optional)
          </label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Migrating periumbilical → RLQ pain, anorexia, low-grade fever…"
            rows={2}
            maxLength={2000}
            disabled={busy}
            className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] outline-none smooth focus:border-[var(--color-ink)] focus:bg-[var(--color-surface)] disabled:opacity-60"
          />
        </div>

        {error ? (
          <div className="rounded-[var(--radius-sm)] border border-[rgba(239,68,68,0.20)] bg-[var(--color-danger-soft)] px-3 py-2 text-[12px] text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--color-ink-faint)]">⌘ + Enter to submit</span>
          <Button
            size="sm"
            loading={busy}
            disabled={!diagnosis.trim()}
            onClick={() => void submit()}
            trailingIcon={<Icon.Plus size={12} />}
          >
            Submit
          </Button>
        </div>
      </div>

      {/* History =========================================== */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
            Submitted hypotheses
          </h4>
          {ordered.length > 0 ? (
            <span className="text-[10.5px] text-[var(--color-ink-faint)]">most recent first</span>
          ) : null}
        </div>
        {ordered.length === 0 ? (
          <div className="dot-bg flex flex-col items-center gap-1 rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] px-3 py-6 text-center text-[12px] text-[var(--color-ink-muted)]">
            <Icon.Brain size={18} />
            <span>No hypotheses yet — commit your first guess.</span>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {ordered.map((h, i) => (
              <li
                key={`${h.submittedAt}-${i}`}
                className={cn(
                  "rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3",
                  i === 0 && "border-[var(--color-line-strong)] bg-[var(--color-surface)]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      {i === 0 ? (
                        <Badge tone="accent" size="xs" dot>
                          Latest
                        </Badge>
                      ) : null}
                      <span className="text-[13px] font-semibold text-[var(--color-ink)]">
                        {h.diagnosis}
                      </span>
                    </div>
                    <span className="num-mono text-[10px] text-[var(--color-ink-faint)]">
                      {new Date(h.submittedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {typeof h.confidence === "number" ? (
                    <span className="num text-[12px] font-semibold text-[var(--color-ink)]">
                      {h.confidence}%
                    </span>
                  ) : null}
                </div>
                {typeof h.confidence === "number" ? (
                  <div className="mt-2">
                    <ProgressBar
                      value={h.confidence}
                      tone={h.confidence >= 70 ? "accent" : h.confidence >= 40 ? "warn" : "danger"}
                      size="sm"
                    />
                  </div>
                ) : null}
                {h.rationale ? (
                  <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-ink-soft)]">
                    {h.rationale}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Surface>
  );
}
