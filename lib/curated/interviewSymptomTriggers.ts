import type { EncounterMessage } from "@/components/encounter/lib/types";
import type { CuratedCaseSlug } from "@/lib/curatedCases";

export type SymptomTrigger = {
  key: string;
  /** Short label shown in the findings list */
  label: string;
  /** If any needle appears in combined patient dialogue (case-insensitive), we count it as surfaced */
  needles: string[];
};

const MARIA: SymptomTrigger[] = [
  { key: "eye_red", label: "Red / irritated eye", needles: ["red", "bloodshot", "irritated", "pink"] },
  { key: "discharge", label: "Watery discharge", needles: ["watery", "discharge", "tearing", "tear"] },
  { key: "itch", label: "Itching", needles: ["itch", "itchy"] },
  { key: "bilateral", label: "Both eyes affected", needles: ["both eyes", "other eye", "spread", "second eye"] },
  { key: "duration", label: "Several days of symptoms", needles: ["day", "days", "morning", "couple"] },
  { key: "cold_assoc", label: "Recent cold symptoms", needles: ["cold", "sniffle", "congestion"] },
  { key: "contact", label: "Sick contact / coworker", needles: ["coworker", "office", "someone", "contact"] },
  { key: "vision_ok", label: "Vision changes discussed", needles: ["no vision", "vision's", "see fine", "blurry", "can't see", "sight"] },
  { key: "light", label: "Light sensitivity", needles: ["light", "bright", "sun", "photophobia"] },
  { key: "pain_level", label: "Mild discomfort", needles: ["pain", "hurt", "discomfort", "ache"] },
];

const JASON: SymptomTrigger[] = [
  { key: "fever", label: "Fever / fevers", needles: ["fever", "feverish", "chill", "temp", "100"] },
  { key: "throat", label: "Sore throat", needles: ["throat", "sore", "swallow"] },
  { key: "cough", label: "Cough", needles: ["cough", "coughing"] },
  { key: "fatigue", label: "Fatigue", needles: ["tired", "fatigue", "wiped", "exhausted", "energy"] },
  { key: "travel", label: "Recent travel", needles: ["travel", "trip", "flight", "airport", "conference"] },
  { key: "exposure", label: "Crowds / sick contact", needles: ["crowd", "coworker", "convention", "exposure"] },
  { key: "smell", label: "Smell / taste changes", needles: ["smell", "taste", "sense"] },
  { key: "body_aches", label: "Body aches", needles: ["ache", "aching", "myalgia", "sore"] },
  { key: "congestion", label: "Congestion", needles: ["congestion", "stuffy", "nasal"] },
  { key: "headache", label: "Headache", needles: ["headache"] },
];

const BY_SLUG: Record<CuratedCaseSlug, SymptomTrigger[]> = {
  "maria-wolf": MARIA,
  "jason-mehta": JASON,
};

/** Which patient utterances contain enough signal to unlock a trigger */
export function discoverInterviewSymptoms(
  slug: CuratedCaseSlug,
  messages: readonly EncounterMessage[],
): { key: string; label: string }[] {
  const triggers = BY_SLUG[slug];
  if (!triggers?.length) return [];

  const firstClinicianIdx = messages.findIndex((m) => m.role === "clinician");
  const afterUserEngages =
    firstClinicianIdx >= 0 ? messages.slice(firstClinicianIdx) : [];

  const patientBlob = afterUserEngages
    .filter((m) => m.role === "patient")
    .map((m) => m.text.toLowerCase())
    .join("\n");

  const out: { key: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const t of triggers) {
    const hit = t.needles.some((n) => patientBlob.includes(n.toLowerCase()));
    if (hit && !seen.has(t.key)) {
      seen.add(t.key);
      out.push({ key: t.key, label: t.label });
    }
  }
  return out;
}
