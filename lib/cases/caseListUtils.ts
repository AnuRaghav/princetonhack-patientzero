/** Helpers for the case bank UI (pagination, difficulty, clinical bucket). */

export type DifficultyLabel = "Easy" | "Medium" | "Hard";

export function countSymptomsInDatasetRow(row: Record<string, unknown>): number {
  let n = 0;
  for (let i = 1; i <= 17; i++) {
    const v = row[`Symptom_${i}`];
    if (typeof v === "string" && v.trim().length > 0) n += 1;
  }
  return n;
}

export function difficultyFromSymptomCount(n: number): DifficultyLabel {
  if (n <= 5) return "Easy";
  if (n <= 11) return "Medium";
  return "Hard";
}

/**
 * Coarse specialty bucket for filters / tags (keyword heuristic on disease + first symptoms).
 */
export function inferClinicalBucket(
  disease: string | null | undefined,
  symptomPreview: string,
): string {
  const blob = `${disease ?? ""} ${symptomPreview}`.toLowerCase();

  if (/\b(heart|cardiac|cardio|angina|hypertension|bp\b|pulse)\b/.test(blob)) return "Cardiovascular";
  if (/\b(lung|pneumon|asthma|copd|breath|respir|cough|o2)\b/.test(blob)) return "Respiratory";
  if (/\b(abdomen|bowel|gi\b|gastro|nausea|vomit|liver|append|rlq|stomach)\b/.test(blob)) {
    return "Gastroenterology";
  }
  if (/\b(brain|neuro|seizure|stroke|headache|migraine|numb|weak)\b/.test(blob)) return "Neurology";
  if (/\b(kidney|renal|urin|bladder|uti|flank)\b/.test(blob)) return "Renal / GU";
  if (/\b(skin|rash|dermat|lesion|itch)\b/.test(blob)) return "Dermatology";
  if (/\b(psych|anxiety|depress|mood|sleep|panic)\b/.test(blob)) return "Psychiatry";
  if (/\b(endocrine|thyroid|diabetes|glucose|insulin)\b/.test(blob)) return "Endocrine";

  return "General medicine";
}

/** Build first-line symptom preview for bucket inference (cheap). */
export function symptomPreviewFromRow(row: Record<string, unknown>, maxLen = 120): string {
  const parts: string[] = [];
  for (let i = 1; i <= 17; i++) {
    const v = row[`Symptom_${i}`];
    if (typeof v === "string" && v.trim()) {
      parts.push(v.trim());
      if (parts.join(" ").length >= maxLen) break;
    }
  }
  return parts.join(" ").slice(0, maxLen);
}

/** Escape for PostgREST `ilike` pattern (best-effort). */
export function escapeIlikePattern(q: string): string {
  return q.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
