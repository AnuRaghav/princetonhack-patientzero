"use client";

import { useEffect, useMemo, useRef } from "react";

import type { EncounterMessage } from "@/components/encounter";
import { REGION_INFO } from "@/components/body/regionInfo";
import { discoverInterviewSymptoms } from "@/lib/curated/interviewSymptomTriggers";
import type { CuratedCaseSlug } from "@/lib/curatedCases";
import { useSimUiStore } from "@/lib/store/simUiStore";
import type { ExamTarget } from "@/types/exam";
import { Badge, Surface } from "@/components/ui";

export type NewSymptomDiscoveredPayload = {
  regions: ExamTarget[];
  labels: string[];
};

type Props = {
  slug: CuratedCaseSlug;
  messages: EncounterMessage[];
  /** Only dialogue after Start assessment is used for discovery */
  assessmentStartedAt: number | null;
  /** Fired when a new symptom key appears in dialogue (incremental after each assessment start). */
  onNewSymptomDiscovered?: (payload: NewSymptomDiscoveredPayload) => void;
};

function isExamTarget(v: string | null): v is ExamTarget {
  return v != null && v in REGION_INFO;
}

export function CuratedInterviewFindings({
  slug,
  messages,
  assessmentStartedAt,
  onNewSymptomDiscovered,
}: Props) {
  const bodyHighlight = useSimUiStore((s) => s.bodyHighlight);
  const prevKeysRef = useRef<Set<string>>(new Set());

  /**
   * Snapshot known symptom keys when a new assessment window starts (no toast).
   * Intentionally omits `messages` from deps so later transcript updates do not reset incremental discovery.
   */
  useEffect(() => {
    if (assessmentStartedAt == null) {
      prevKeysRef.current.clear();
      return;
    }
    const scoped = messages.filter((m) => m.createdAt >= assessmentStartedAt);
    const discovered = discoverInterviewSymptoms(slug, scoped);
    prevKeysRef.current = new Set(discovered.map((d) => d.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-bootstrap when the assessment instant changes
  }, [assessmentStartedAt, slug]);

  /** Incremental new discoveries as transcript grows. */
  useEffect(() => {
    if (assessmentStartedAt == null || !onNewSymptomDiscovered) return;
    const scoped = messages.filter((m) => m.createdAt >= assessmentStartedAt);
    const discovered = discoverInterviewSymptoms(slug, scoped);
    const newly = discovered.filter((d) => !prevKeysRef.current.has(d.key));
    if (newly.length === 0) return;
    for (const d of newly) prevKeysRef.current.add(d.key);
    const regions = [...new Set(newly.flatMap((d) => d.regions))];
    const labels = newly.map((d) => d.label);
    onNewSymptomDiscovered({ regions, labels });
  }, [assessmentStartedAt, messages, slug, onNewSymptomDiscovered]);

  const { regionLabel, rows } = useMemo(() => {
    const scoped =
      assessmentStartedAt == null
        ? []
        : messages.filter((m) => m.createdAt >= assessmentStartedAt);
    const discovered = discoverInterviewSymptoms(slug, scoped);
    const selected = isExamTarget(bodyHighlight) ? bodyHighlight : null;
    const label = selected ? REGION_INFO[selected].label : null;

    if (!selected) {
      return { regionLabel: null as string | null, rows: [] as typeof discovered };
    }

    const filtered = discovered.filter((d) => d.regions.includes(selected));
    return { regionLabel: label, rows: filtered };
  }, [slug, messages, bodyHighlight, assessmentStartedAt]);

  const selected = isExamTarget(bodyHighlight) ? bodyHighlight : null;

  return (
    <Surface
      variant="hero"
      padding="none"
      radius="xl"
      className="flex min-h-[180px] flex-1 flex-col overflow-hidden border border-white/[0.08]"
    >
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-white">
              {regionLabel ? "Symptoms · this region" : "Symptoms · pick a body region"}
            </span>
            <Badge tone="dark" size="xs">
              interview
            </Badge>
          </div>
          {regionLabel ? (
            <span className="truncate text-[11px] text-white/50">{regionLabel}</span>
          ) : null}
        </div>
        <span className="num-mono shrink-0 text-[10px] uppercase tracking-[0.18em] text-white/45">
          {selected ? `${rows.length} here` : "—"}
        </span>
      </div>
      <div className="dot-bg flex flex-1 flex-col gap-0 overflow-y-auto px-3 py-3">
        {assessmentStartedAt == null ? (
          <p className="px-1 text-[12px] leading-relaxed text-white/55">
            Press <span className="font-medium text-white/80">Start assessment</span> below to begin. Until then,
            findings are hidden.
          </p>
        ) : !selected ? (
          <p className="px-1 text-[12px] leading-relaxed text-white/55">
            Use the Regions list on the 3D preview to select where to review interview findings.
            Symptoms from the dialogue that belong to that body area appear here — other regions stay empty
            until they have matching clues.
          </p>
        ) : rows.length === 0 ? (
          <p className="px-1 text-[12px] leading-relaxed text-white/55">
            No interview findings mapped to this area yet. Keep asking questions, or try another
            region — for example stomach vs head can show different clues for the same case.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li
                key={r.key}
                className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2 text-[12.5px] text-white/90"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                <span className="leading-snug">{r.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Surface>
  );
}
