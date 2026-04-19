import type { CuratedCaseSlug } from "@/lib/curatedCases";

/** Deterministic vitals shown when the learner uses exam tools on the body panel (drill only). */
export function vitalReadingsForCase(slug: CuratedCaseSlug): {
  bpm: number;
  systolic: number;
  diastolic: number;
} {
  switch (slug) {
    case "maria-wolf":
      return { bpm: 88, systolic: 118, diastolic: 76 };
    case "jason-mehta":
      return { bpm: 72, systolic: 122, diastolic: 78 };
    default:
      return { bpm: 74, systolic: 120, diastolic: 78 };
  }
}
