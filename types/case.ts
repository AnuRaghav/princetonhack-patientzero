/** Canonical case document loaded from JSON / DB. The LLM never overrides these facts. */

export type Demographics = {
  age: number;
  sex: string;
  occupation?: string;
};

export type RevealRule = {
  id: string;
  /** Student message is lowercased; if it includes any of these terms, `reveals` may fire. */
  match_terms: string[];
  reveals: string[];
};

export type ChecklistItem = {
  id: string;
  text: string;
  category: "history" | "exam" | "communication" | "safety";
  /** Fact keys that satisfy this checklist item when revealed via chat. */
  required_fact_keys?: string[];
  /** Exam keys `action:target` that satisfy this item. */
  required_exam_keys?: string[];
};

export type PhysicalExamEntry = {
  /** Stable key used by examEngine and checklist. */
  finding_key: string;
  student_finding: string;
  pain_delta?: number;
  visual?: {
    highlight: string;
    severity: "low" | "medium" | "high";
  };
};

export type CaseDocument = {
  id: string;
  title: string;
  demographics: Demographics;
  personality: string;
  chief_complaint: string;
  history_of_present_illness: string[];
  associated_symptoms: string[];
  negatives: string[];
  physical_exam_findings: PhysicalExamEntry[];
  hidden_red_flags: string[];
  emotional_profile: string;
  /** Rules are evaluated deterministically on the server (no LLM). */
  reveal_rules: RevealRule[];
  checklist: ChecklistItem[];
  final_diagnosis: string;
  /**
   * Map of fact_key -> short patient-facing line used when OPENAI_API_KEY is absent
   * or as fallback grounding snippets for the LLM allowlist.
   */
  patient_utterances_by_fact: Record<string, string>;
};
