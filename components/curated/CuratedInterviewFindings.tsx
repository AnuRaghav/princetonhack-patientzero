"use client";

import { useMemo } from "react";

import type { DiscoveredFact, EncounterMessage } from "@/components/encounter";
import { discoverInterviewSymptoms } from "@/lib/curated/interviewSymptomTriggers";
import type { CuratedCaseSlug } from "@/lib/curatedCases";
import { Badge, Surface } from "@/components/ui";

type Props = {
  slug: CuratedCaseSlug;
  messages: EncounterMessage[];
  serverFacts: DiscoveredFact[];
};

export function CuratedInterviewFindings({ slug, messages, serverFacts }: Props) {
  const rows = useMemo(() => {
    const fromChat = serverFacts.map((f) => ({
      key: `srv:${f.key}`,
      label: f.text,
    }));
    const fromInterview = discoverInterviewSymptoms(slug, messages);
    const seen = new Set(fromChat.map((r) => r.label.toLowerCase()));
    const merged = [...fromChat];
    for (const row of fromInterview) {
      const k = row.label.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push({ key: `iv:${row.key}`, label: row.label });
    }
    merged.sort((a, b) => a.label.localeCompare(b.label));
    return merged;
  }, [slug, messages, serverFacts]);

  return (
    <Surface
      variant="hero"
      padding="none"
      radius="xl"
      className="flex min-h-[180px] flex-1 flex-col overflow-hidden border border-white/[0.08]"
    >
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-white">Interview findings</span>
          <Badge tone="dark" size="xs">
            from dialogue
          </Badge>
        </div>
        <span className="num-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
          {rows.length} surfaced
        </span>
      </div>
      <div className="dot-bg flex flex-1 flex-col gap-0 overflow-y-auto px-3 py-3">
        {rows.length === 0 ? (
          <p className="px-1 text-[12px] leading-relaxed text-white/55">
            Ask the patient questions in the encounter. Symptoms and clues they admit in conversation
            will collect here.
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
