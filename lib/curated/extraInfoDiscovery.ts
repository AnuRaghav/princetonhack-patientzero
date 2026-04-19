import type { CuratedCaseSlug } from "@/lib/curatedCases";

import type { CuratedChallengeTranscriptLine } from "./challengeResult";

type ExtraTrigger = {
  label: string;
  needles: readonly string[];
};

/**
 * Teaching-point style clues — distinct from symptom triggers; scored under “helpful extra info”.
 * Discovery uses patient text after the first clinician message (same window as symptom discovery).
 */
const MARIA_EXTRA: ExtraTrigger[] = [
  {
    label: "Watery vs purulent discharge pattern",
    needles: ["watery", "pus", "purulent", "thick goo", "crust"],
  },
  {
    label: "Spread to other eye",
    needles: ["both eyes", "other eye", "spread", "second eye"],
  },
  {
    label: "Sick contact / shared setting",
    needles: ["coworker", "someone", "office", "contact"],
  },
  {
    label: "Associated URI symptoms",
    needles: ["cold", "sniffle", "congestion", "upper respiratory"],
  },
  {
    label: "Vision largely preserved",
    needles: ["vision", "see fine", "no blur", "sight", "eyesight"],
  },
];

const JASON_EXTRA: ExtraTrigger[] = [
  {
    label: "Recent travel or flight",
    needles: ["travel", "flight", "trip", "airport", "flew"],
  },
  {
    label: "Symptoms after returning",
    needles: ["got back", "after trip", "since returning", "few days ago"],
  },
  {
    label: "Crowded venue or exposure",
    needles: ["crowd", "conference", "convention", "crowded", "exposure"],
  },
  {
    label: "COVID-typical viral syndrome",
    needles: ["fever", "cough", "fatigue", "throat", "body ache"],
  },
  {
    label: "Smell or taste disturbance",
    needles: ["smell", "taste", "sense"],
  },
  {
    label: "Testing status discussed",
    needles: ["test", "pcr", "rapid", "positive", "negative"],
  },
];

const BY_SLUG: Record<CuratedCaseSlug, ExtraTrigger[]> = {
  "maria-wolf": MARIA_EXTRA,
  "jason-mehta": JASON_EXTRA,
};

export function helpfulExtraInfoRubricLabels(slug: CuratedCaseSlug): string[] {
  return BY_SLUG[slug].map((t) => t.label);
}

function patientBlobAfterFirstClinician(lines: readonly CuratedChallengeTranscriptLine[]): string {
  const first = lines.findIndex((l) => l.role === "clinician");
  const slice = first >= 0 ? lines.slice(first) : lines;
  return slice
    .filter((l) => l.role === "patient")
    .map((l) => l.text.toLowerCase())
    .join("\n");
}

/** Which rubric extra-info rows are supported by patient dialogue. */
export function discoverHelpfulExtraInfo(
  slug: CuratedCaseSlug,
  transcript: readonly CuratedChallengeTranscriptLine[],
): string[] {
  const triggers = BY_SLUG[slug];
  if (!triggers?.length) return [];

  const blob = patientBlobAfterFirstClinician(transcript);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of triggers) {
    const hit = t.needles.some((n) => blob.includes(n.toLowerCase()));
    if (hit && !seen.has(t.label)) {
      seen.add(t.label);
      out.push(t.label);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}
