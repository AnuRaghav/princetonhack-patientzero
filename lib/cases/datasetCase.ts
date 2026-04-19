import type { CaseDocument, ChecklistItem, PhysicalExamEntry, RevealRule } from "@/types/case";

/** Row shape for `public.cases` disease/symptom dataset (see user DDL). */
export type DatasetCaseRow = {
  id: number;
  Disease: string | null;
  Symptom_1: string | null;
  Symptom_2: string | null;
  Symptom_3: string | null;
  Symptom_4: string | null;
  Symptom_5: string | null;
  Symptom_6: string | null;
  Symptom_7: string | null;
  Symptom_8: string | null;
  Symptom_9: string | null;
  Symptom_10: string | null;
  Symptom_11: string | null;
  Symptom_12: string | null;
  Symptom_13: string | null;
  Symptom_14: string | null;
  Symptom_15: string | null;
  Symptom_16: string | null;
  Symptom_17: string | null;
};

const SYMPTOM_KEYS = [
  "Symptom_1",
  "Symptom_2",
  "Symptom_3",
  "Symptom_4",
  "Symptom_5",
  "Symptom_6",
  "Symptom_7",
  "Symptom_8",
  "Symptom_9",
  "Symptom_10",
  "Symptom_11",
  "Symptom_12",
  "Symptom_13",
  "Symptom_14",
  "Symptom_15",
  "Symptom_16",
  "Symptom_17",
] as const;

function rowSymptoms(row: DatasetCaseRow): { key: string; text: string }[] {
  const out: { key: string; text: string }[] = [];
  for (const k of SYMPTOM_KEYS) {
    const t = row[k]?.trim();
    if (t) out.push({ key: k.toLowerCase(), text: t });
  }
  return out;
}

/** Terms used to match student questions to revealed facts (deterministic). */
function matchTermsForPhrase(phrase: string): string[] {
  const words = phrase
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  const uniq: string[] = [];
  for (const w of words) {
    if (!uniq.includes(w) && uniq.length < 10) uniq.push(w);
  }
  if (uniq.length === 0 && phrase.trim()) return [phrase.trim().toLowerCase().slice(0, 32)];
  return uniq;
}

function genericPhysicalExam(): PhysicalExamEntry[] {
  return [
    {
      finding_key: "palpate_rlq",
      student_finding:
        "You note discomfort with deep palpation in the right lower quadrant.",
      pain_delta: 1,
      visual: { highlight: "rlq", severity: "medium" },
    },
    {
      finding_key: "palpate_abdomen_general",
      student_finding:
        "The abdomen is soft with nonspecific findings on this pass.",
      pain_delta: 0,
      visual: { highlight: "abdomen", severity: "low" },
    },
    {
      finding_key: "rebound_rlq",
      student_finding:
        "Release of deep pressure in the RLQ may elicit discomfort if peritoneal irritation is present.",
      pain_delta: 1,
      visual: { highlight: "rlq", severity: "medium" },
    },
    {
      finding_key: "guarding_rlq",
      student_finding: "You may note mild guarding depending on severity.",
      pain_delta: 0,
      visual: { highlight: "rlq", severity: "low" },
    },
    {
      finding_key: "auscultate_chest",
      student_finding: "Lung fields are clear to auscultation with normal work of breathing.",
      pain_delta: 0,
      visual: { highlight: "chest", severity: "low" },
    },
    {
      finding_key: "inspect_head",
      student_finding: "General appearance and HEENT inspection are appropriate to the encounter.",
      pain_delta: 0,
      visual: { highlight: "head", severity: "low" },
    },
  ];
}

/**
 * Builds a full {@link CaseDocument} from a flat disease/symptom row.
 * The sim engine (reveal rules, exam engine, checklist, LLM allowlist) all consume this shape.
 */
export function buildCaseDocumentFromDatasetRow(row: DatasetCaseRow): CaseDocument {
  const idStr = String(row.id);
  const disease = row.Disease?.trim() ?? "";
  const symptoms = rowSymptoms(row);
  const title = `Case ${idStr}`;

  const chief_complaint =
    symptoms[0]?.text || "Patient with undifferentiated symptoms.";

  const history_of_present_illness: string[] = symptoms.map((s) => s.text);

  const associated_symptoms = symptoms.map((s) => s.text);

  const reveal_rules: RevealRule[] = [];
  const patient_utterances_by_fact: Record<string, string> = {
    default:
      "I'm not sure how to answer that-can you ask me in another way about how I've been feeling?",
  };

  for (let i = 0; i < symptoms.length; i++) {
    const factKey = `symptom_${i + 1}`;
    reveal_rules.push({
      id: `rule_${factKey}`,
      match_terms: matchTermsForPhrase(symptoms[i].text),
      reveals: [factKey],
    });
    patient_utterances_by_fact[factKey] = symptoms[i].text;
  }

  const checklist: ChecklistItem[] = symptoms.map((s, i) => ({
    id: `hx_${s.key}`,
    text: `Elicit information about: ${s.text.slice(0, 120)}`,
    category: "history" as const,
    required_fact_keys: [`symptom_${i + 1}`],
  }));

  checklist.push({
    id: "exam_rlq",
    text: "Perform a targeted abdominal exam including RLQ",
    category: "exam",
    required_exam_keys: ["palpate:rlq"],
  });
  checklist.push({
    id: "empathy_acknowledge",
    text: "Acknowledge patient discomfort and explain exam steps",
    category: "communication",
    required_fact_keys: [],
  });

  return {
    id: idStr,
    title,
    demographics: { age: 45, sex: "unspecified" },
    personality: "Cooperative; answers best to clear, specific questions.",
    chief_complaint,
    history_of_present_illness,
    associated_symptoms,
    negatives: [],
    physical_exam_findings: genericPhysicalExam(),
    hidden_red_flags: [],
    emotional_profile: "Variable anxiety depending on symptom severity; receptive to reassurance.",
    reveal_rules,
    checklist,
    final_diagnosis: disease || "To be determined from history and exam",
    patient_utterances_by_fact,
  };
}

/** Normalize a Supabase row (snake_case / string ids) into {@link DatasetCaseRow}. */
export function coalesceDatasetRow(raw: Record<string, unknown>): DatasetCaseRow | null {
  const idRaw = raw.id;
  const id = typeof idRaw === "number" ? idRaw : Number(idRaw);
  if (!Number.isFinite(id)) return null;

  const g = (k: string) => {
    const v = raw[k];
    return typeof v === "string" ? v : v == null ? null : String(v);
  };

  return {
    id,
    Disease: g("Disease"),
    Symptom_1: g("Symptom_1"),
    Symptom_2: g("Symptom_2"),
    Symptom_3: g("Symptom_3"),
    Symptom_4: g("Symptom_4"),
    Symptom_5: g("Symptom_5"),
    Symptom_6: g("Symptom_6"),
    Symptom_7: g("Symptom_7"),
    Symptom_8: g("Symptom_8"),
    Symptom_9: g("Symptom_9"),
    Symptom_10: g("Symptom_10"),
    Symptom_11: g("Symptom_11"),
    Symptom_12: g("Symptom_12"),
    Symptom_13: g("Symptom_13"),
    Symptom_14: g("Symptom_14"),
    Symptom_15: g("Symptom_15"),
    Symptom_16: g("Symptom_16"),
    Symptom_17: g("Symptom_17"),
  };
}

export const DATASET_CASE_SELECT =
  "id, Disease, Symptom_1, Symptom_2, Symptom_3, Symptom_4, Symptom_5, Symptom_6, Symptom_7, Symptom_8, Symptom_9, Symptom_10, Symptom_11, Symptom_12, Symptom_13, Symptom_14, Symptom_15, Symptom_16, Symptom_17";
