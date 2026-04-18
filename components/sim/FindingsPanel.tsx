"use client";

import {
  Badge,
  Icon,
  ProgressBar,
  Surface,
  cn,
} from "@/components/ui";
import type {
  BodyRegion,
  DiscoveredHistory,
  EncounterFindings,
  SymptomMap,
  Tri,
} from "@/types/findings";

const SYMPTOM_LABELS: Record<keyof SymptomMap, string> = {
  abdominalPain: "Abdominal pain",
  nausea: "Nausea",
  vomiting: "Vomiting",
  fever: "Fever",
  anorexia: "Anorexia",
  diarrhea: "Diarrhea",
  giBleeding: "GI bleeding",
  urinarySymptoms: "Urinary sx",
};

const HISTORY_LABELS: Record<keyof DiscoveredHistory, string> = {
  chiefComplaint: "Chief complaint",
  onset: "Onset",
  location: "Location",
  progression: "Progression",
  associatedSymptoms: "Associated sx",
  pertinentNegatives: "Pertinent negatives",
  aggravatingFactors: "Aggravating",
  relievingFactors: "Relieving",
};

function triBadge(v: Tri) {
  if (v === true) {
    return (
      <Badge tone="accent" size="xs" dot>
        Positive
      </Badge>
    );
  }
  if (v === false) {
    return (
      <Badge tone="neutral" size="xs">
        Denied
      </Badge>
    );
  }
  return <span className="text-[11px] text-[var(--color-ink-faint)]">—</span>;
}

function regionLabel(r: BodyRegion): string {
  const m: Record<BodyRegion, string> = {
    head: "Head",
    chest: "Chest",
    abdomen: "Abdomen",
    rlq: "RLQ",
    llq: "LLQ",
    ruq: "RUQ",
    luq: "LUQ",
    periumbilical: "Periumbilical",
    flank: "Flank",
    back: "Back",
    pelvis: "Pelvis",
  };
  return m[r] ?? r;
}

export function FindingsPanel({ findings }: { findings: EncounterFindings }) {
  const historyEntries = Object.entries(findings.discoveredHistory) as [
    keyof DiscoveredHistory,
    boolean,
  ][];
  const historyDone = historyEntries.filter(([, v]) => v).length;
  const historyTotal = historyEntries.length;

  const symptomEntries = Object.entries(findings.symptoms) as [
    keyof SymptomMap,
    Tri,
  ][];

  const cues = findings.bodyVisualization.cues;
  const painLoc = findings.pain.location;
  const examRegions = findings.bodyVisualization.examTriggeredRegions;

  return (
    <Surface variant="card" padding="md" radius="lg" className="flex flex-col gap-5">
      {/* Header ============================================ */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon.Activity size={14} className="text-[var(--color-ink-soft)]" />
            <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">
              Discovered findings
            </h3>
          </div>
          <p className="mt-1 text-[11.5px] text-[var(--color-ink-muted)]">
            Deterministic projection from revealed facts + exam actions.
          </p>
        </div>
        {findings.chiefComplaint ? (
          <Badge tone="accent" size="xs" dot>
            CC captured
          </Badge>
        ) : (
          <Badge tone="warn" size="xs">
            CC pending
          </Badge>
        )}
      </div>

      {/* History coverage =================================== */}
      <Section
        title="History coverage"
        right={
          <span className="num text-[11px] text-[var(--color-ink-muted)]">
            <span className="font-semibold text-[var(--color-ink)]">{historyDone}</span> /{" "}
            {historyTotal}
          </span>
        }
      >
        <ProgressBar
          value={historyTotal === 0 ? 0 : (historyDone / historyTotal) * 100}
          tone="accent"
          size="sm"
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {historyEntries.map(([k, v]) => (
            <span
              key={k}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] smooth",
                v
                  ? "border-[rgba(52,210,124,0.22)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]"
                  : "border-[var(--color-line)] bg-[var(--color-surface-2)] text-[var(--color-ink-faint)]",
              )}
            >
              {v ? <Icon.Check size={10} /> : null}
              {HISTORY_LABELS[k]}
            </span>
          ))}
        </div>
      </Section>

      {/* Symptoms ========================================== */}
      <Section title="Symptom review">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {symptomEntries.map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between border-b border-[var(--color-line)] py-1.5 last:border-0"
            >
              <span className="text-[12px] text-[var(--color-ink-soft)]">
                {SYMPTOM_LABELS[k]}
              </span>
              {triBadge(v)}
            </div>
          ))}
        </div>
      </Section>

      {/* Pain profile ====================================== */}
      <Section
        title="Pain profile"
        right={
          findings.pain.severity !== null ? (
            <span className="num text-[11px] text-[var(--color-ink-muted)]">
              <span className="font-semibold text-[var(--color-ink)]">
                {findings.pain.severity}
              </span>
              /10
            </span>
          ) : null
        }
      >
        {findings.pain.severity !== null ? (
          <ProgressBar
            value={(findings.pain.severity / 10) * 100}
            tone={findings.pain.severity >= 7 ? "danger" : findings.pain.severity >= 4 ? "warn" : "accent"}
            size="sm"
            showThumb
          />
        ) : (
          <div className="text-[11.5px] text-[var(--color-ink-faint)]">
            Severity not yet elicited.
          </div>
        )}
        <Row label="Location">
          {painLoc.length === 0 ? (
            <span className="text-[11.5px] text-[var(--color-ink-faint)]">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {painLoc.map((r) => (
                <Badge key={r} tone="neutral" size="xs">
                  {regionLabel(r)}
                </Badge>
              ))}
            </div>
          )}
        </Row>
        <Row label="Migration">{triBadge(findings.pain.migration)}</Row>
        <Row label="Rebound">{triBadge(findings.pain.reboundTenderness)}</Row>
        {findings.pain.onset ? (
          <Row label="Onset">
            <span className="text-[11.5px] text-[var(--color-ink-soft)]">
              {findings.pain.onset}
            </span>
          </Row>
        ) : null}
      </Section>

      {/* Exam + body cues ================================== */}
      <Section title="Exam & body cues">
        <Row label="Examined">
          {examRegions.length === 0 ? (
            <span className="text-[11.5px] text-[var(--color-ink-faint)]">No regions yet</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {examRegions.map((r) => (
                <Badge key={r} tone="info" size="xs">
                  {regionLabel(r)}
                </Badge>
              ))}
            </div>
          )}
        </Row>
        <Row label="Cues">
          {cues.length === 0 ? (
            <span className="text-[11.5px] text-[var(--color-ink-faint)]">None elicited</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {cues.map((c) => (
                <Badge key={c} tone="warn" size="xs" dot>
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </Row>
      </Section>

      {/* Affect ============================================ */}
      <Section title="Affect">
        <Row label="Reported">
          <Badge tone="info" size="xs">
            {findings.emotionalAffect.label || "—"}
          </Badge>
        </Row>
      </Section>
    </Surface>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
          {title}
        </h4>
        {right}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] py-1.5 last:border-0">
      <span className="text-[12px] text-[var(--color-ink-soft)]">{label}</span>
      <div className="flex items-center justify-end">{children}</div>
    </div>
  );
}
