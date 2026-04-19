import type { EncounterMessage } from "@/components/encounter/lib/types";
import type { CuratedCaseSlug } from "@/lib/curatedCases";
import type { ExamTarget } from "@/types/exam";

export type SymptomTrigger = {
  key: string;
  /** Short label shown in the findings list */
  label: string;
  /** If any needle appears in combined patient dialogue (case-insensitive), we count it as surfaced */
  needles: string[];
  /** Body hotspots where this surfaced symptom appears when that region is selected */
  regions: ExamTarget[];
};

const MARIA: SymptomTrigger[] = [
  {
    key: "eye_red",
    label: "Red / irritated eye",
    needles: ["red", "bloodshot", "irritated", "pink"],
    regions: ["head"],
  },
  {
    key: "discharge",
    label: "Watery discharge",
    needles: ["watery", "discharge", "tearing", "tear"],
    regions: ["head"],
  },
  {
    key: "itch",
    label: "Itching",
    needles: ["itch", "itchy"],
    regions: ["head"],
  },
  {
    key: "bilateral",
    label: "Both eyes affected",
    needles: ["both eyes", "other eye", "spread", "second eye"],
    regions: ["head"],
  },
  {
    key: "duration",
    label: "Several days of symptoms",
    needles: ["day", "days", "morning", "couple"],
    regions: ["head"],
  },
  {
    key: "cold_assoc",
    label: "Recent cold symptoms",
    needles: ["cold", "sniffle", "congestion"],
    regions: ["chest"],
  },
  {
    key: "contact",
    label: "Sick contact / coworker",
    needles: ["coworker", "office", "someone", "contact"],
    regions: ["head"],
  },
  {
    key: "vision_ok",
    label: "Vision changes discussed",
    needles: ["no vision", "vision's", "see fine", "blurry", "can't see", "sight"],
    regions: ["head"],
  },
  {
    key: "light",
    label: "Light sensitivity",
    needles: ["light", "bright", "sun", "photophobia"],
    regions: ["head"],
  },
  {
    key: "pain_level",
    label: "Mild discomfort",
    needles: ["pain", "hurt", "discomfort", "ache"],
    regions: ["head"],
  },
];

const JASON: SymptomTrigger[] = [
  {
    key: "fever",
    label: "Fever / fevers",
    needles: ["fever", "feverish", "chill", "temp", "100"],
    regions: ["chest"],
  },
  {
    key: "throat",
    label: "Sore throat",
    needles: ["throat", "sore", "swallow"],
    regions: ["head"],
  },
  {
    key: "cough",
    label: "Cough",
    needles: ["cough", "coughing"],
    regions: ["chest"],
  },
  {
    key: "fatigue",
    label: "Fatigue",
    needles: ["tired", "fatigue", "wiped", "exhausted", "energy"],
    regions: ["chest"],
  },
  {
    key: "travel",
    label: "Recent travel",
    needles: ["travel", "trip", "flight", "airport", "conference"],
    regions: ["chest"],
  },
  {
    key: "exposure",
    label: "Crowds / sick contact",
    needles: ["crowd", "coworker", "convention", "exposure"],
    regions: ["chest"],
  },
  {
    key: "smell",
    label: "Smell / taste changes",
    needles: ["smell", "taste", "sense"],
    regions: ["head"],
  },
  {
    key: "body_aches",
    label: "Body aches",
    needles: ["ache", "aching", "myalgia", "sore"],
    regions: ["joints"],
  },
  {
    key: "congestion",
    label: "Congestion",
    needles: ["congestion", "stuffy", "nasal"],
    regions: ["head"],
  },
  {
    key: "headache",
    label: "Headache",
    needles: ["headache"],
    regions: ["head"],
  },
];

const BY_SLUG: Record<CuratedCaseSlug, SymptomTrigger[]> = {
  "maria-wolf": MARIA,
  "jason-mehta": JASON,
};

/** Labels used for scoring rubric key-symptom coverage (same triggers as interview discovery). */
export function curatedInterviewSymptomLabels(slug: CuratedCaseSlug): string[] {
  return BY_SLUG[slug].map((t) => t.label);
}

export type DiscoveredInterviewSymptom = {
  key: string;
  label: string;
  regions: ExamTarget[];
};

/** Patient utterances after the first clinician message; each hit includes region routing for hotspots. */
export function discoverInterviewSymptoms(
  slug: CuratedCaseSlug,
  messages: readonly EncounterMessage[],
): DiscoveredInterviewSymptom[] {
  const triggers = BY_SLUG[slug];
  if (!triggers?.length) return [];

  const firstClinicianIdx = messages.findIndex((m) => m.role === "clinician");
  const afterUserEngages =
    firstClinicianIdx >= 0 ? messages.slice(firstClinicianIdx) : [];

  const patientBlob = afterUserEngages
    .filter((m) => m.role === "patient")
    .map((m) => m.text.toLowerCase())
    .join("\n");

  const out: DiscoveredInterviewSymptom[] = [];
  const seen = new Set<string>();
  for (const t of triggers) {
    const hit = t.needles.some((n) => patientBlob.includes(n.toLowerCase()));
    if (hit && !seen.has(t.key)) {
      seen.add(t.key);
      out.push({ key: t.key, label: t.label, regions: t.regions });
    }
  }
  return out;
}
