/** Specialty bucket → PostgREST OR clause on `Disease` only (approximate filter). */

export const CLINICAL_BUCKETS = [
  "Cardiovascular",
  "Respiratory",
  "Gastroenterology",
  "Neurology",
  "Renal / GU",
  "Dermatology",
  "Psychiatry",
  "Endocrine",
  "General medicine",
] as const;

export type ClinicalBucket = (typeof CLINICAL_BUCKETS)[number];

/** Multiple ilike ORs on Disease column (comma-separated for `.or()`). */
export function diseaseOrClauseForBucket(bucket: string): string | null {
  const terms: Record<string, string[]> = {
    Cardiovascular: ["heart", "cardiac", "angina", "hypertension"],
    Respiratory: ["lung", "asthma", "pneum", "breath", "cough"],
    Gastroenterology: ["abdominal", "nausea", "vomit", "bowel", "liver", "gi"],
    Neurology: ["stroke", "seizure", "headache", "neuro", "migraine"],
    "Renal / GU": ["kidney", "urin", "renal", "bladder"],
    Dermatology: ["skin", "rash", "itch", "dermat"],
    Psychiatry: ["anxiety", "depress", "psych", "mood"],
    Endocrine: ["diabetes", "thyroid", "glucose"],
  };
  const t = terms[bucket];
  if (!t) return null;
  return t.map((w) => `Disease.ilike.%${w}%`).join(",");
}
