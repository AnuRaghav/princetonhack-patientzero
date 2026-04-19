/**
 * Behavioral interview scoring (out of 20) for curated Maria/Jason cases.
 *
 * The clinician transcript is sent to the K2 Think model, which returns a
 * rubric breakdown that sums to 20. Network/parse failures degrade gracefully
 * to a zero score so the deterministic clinical score is still usable.
 *
 * Total = 3 + 3 + 2 + 2 + 4 + 3 + 2 + 1 = 20.
 */

import type { CuratedChallengeTranscriptLine } from "./challengeResult";

export type BehavioralRubricKey =
  | "clarity"
  | "structureFlow"
  | "relevance"
  | "activeListening"
  | "hypothesisDriven"
  | "logicalProgression"
  | "prioritization"
  | "adaptability";

export type BehavioralRubricItem = {
  key: BehavioralRubricKey;
  label: string;
  max: number;
  /** Human-readable rubric used both in UI and in the LLM prompt. */
  description: string;
};

export const BEHAVIORAL_RUBRIC: readonly BehavioralRubricItem[] = [
  {
    key: "clarity",
    label: "Clarity",
    max: 3,
    description:
      "3 = clear, concise, natural; 2 = mostly clear, minor awkwardness; 1 = confusing or poorly phrased; 0 = hard to understand.",
  },
  {
    key: "structureFlow",
    label: "Structure & flow",
    max: 3,
    description:
      "3 = logical progression that builds on prior answers; 2 = some structure with slight randomness; 1 = disorganized; 0 = completely random.",
  },
  {
    key: "relevance",
    label: "Relevance",
    max: 2,
    description:
      "2 = questions are clinically relevant; 1 = some irrelevant questions; 0 = mostly irrelevant.",
  },
  {
    key: "activeListening",
    label: "Active listening",
    max: 2,
    description:
      "2 = follows up based on patient responses; 1 = limited follow-up; 0 = ignores patient information.",
  },
  {
    key: "hypothesisDriven",
    label: "Hypothesis-driven questions",
    max: 4,
    description:
      "4 = questions clearly aim to confirm or eliminate diagnoses; 2-3 = some intent, not consistent; 1 = mostly generic questions; 0 = no reasoning pattern.",
  },
  {
    key: "logicalProgression",
    label: "Logical progression",
    max: 3,
    description:
      "3 = each question builds on previous answers; 2 = some progression; 1 = weak connections; 0 = no progression.",
  },
  {
    key: "prioritization",
    label: "Prioritization",
    max: 2,
    description:
      "2 = focuses on important symptoms first; 1 = mixed priorities; 0 = wastes time on low-value information.",
  },
  {
    key: "adaptability",
    label: "Adaptability",
    max: 1,
    description:
      "1 = adjusts questions when new information appears; 0 = static questioning.",
  },
] as const;

export const BEHAVIORAL_MAX_TOTAL = BEHAVIORAL_RUBRIC.reduce((n, r) => n + r.max, 0);

export type BehavioralBreakdown = Record<BehavioralRubricKey, number>;

export type BehavioralScoreResult = {
  total: number;
  breakdown: BehavioralBreakdown;
  /** Per-rubric one-line feedback (optional; may be empty). */
  comments: Partial<Record<BehavioralRubricKey, string>>;
  /** Overall short narrative from the LLM (optional). */
  summary?: string;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function emptyBehavioralBreakdown(): BehavioralBreakdown {
  return BEHAVIORAL_RUBRIC.reduce((acc, r) => {
    acc[r.key] = 0;
    return acc;
  }, {} as BehavioralBreakdown);
}

export function emptyBehavioralResult(): BehavioralScoreResult {
  return { total: 0, breakdown: emptyBehavioralBreakdown(), comments: {} };
}

/** Clip each rubric item to its max and recompute total; tolerant of LLM noise. */
export function normalizeBehavioralBreakdown(raw: Partial<Record<BehavioralRubricKey, number>>): {
  breakdown: BehavioralBreakdown;
  total: number;
} {
  const breakdown = emptyBehavioralBreakdown();
  let total = 0;
  for (const item of BEHAVIORAL_RUBRIC) {
    const v = Number(raw[item.key]);
    const clipped = Math.round(clamp(Number.isFinite(v) ? v : 0, 0, item.max));
    breakdown[item.key] = clipped;
    total += clipped;
  }
  return { breakdown, total: clamp(total, 0, BEHAVIORAL_MAX_TOTAL) };
}

/* -------------------------------------------------------------------------- */
/* Prompt + parsing                                                           */
/* -------------------------------------------------------------------------- */

function rubricSpecForPrompt(): string {
  return BEHAVIORAL_RUBRIC.map(
    (r) => `- "${r.key}" (${r.label}, 0-${r.max}): ${r.description}`,
  ).join("\n");
}

function transcriptForPrompt(transcript: readonly CuratedChallengeTranscriptLine[]): string {
  return transcript
    .filter((l) => l.role === "clinician" || l.role === "patient")
    .map((l) => {
      const speaker = l.role === "clinician" ? "Clinician" : "Patient";
      return `${speaker}: ${l.text}`;
    })
    .join("\n");
}

/** Strict JSON schema sketch used in the system prompt - intentionally minimal. */
export function buildBehavioralPrompt(args: {
  transcript: readonly CuratedChallengeTranscriptLine[];
  caseTitle: string;
  patientOneLiner: string;
}): { system: string; user: string } {
  const { transcript, caseTitle, patientOneLiner } = args;
  const rubricBlock = rubricSpecForPrompt();
  const transcriptBlock = transcriptForPrompt(transcript);

  const system = [
    "You are a clinical-skills examiner scoring a medical-student interview.",
    "Score ONLY the clinician's communication and reasoning style based on the rubric.",
    "Do NOT score whether the diagnosis was correct - that is handled separately.",
    "Return a single JSON object. No markdown, no commentary, no code fences.",
  ].join(" ");

  const user = [
    `Case: ${caseTitle}`,
    `Patient context: ${patientOneLiner}`,
    "",
    "Rubric (each integer 0..max):",
    rubricBlock,
    "",
    "Required JSON shape:",
    `{
  "scores": {
    "clarity": <int>,
    "structureFlow": <int>,
    "relevance": <int>,
    "activeListening": <int>,
    "hypothesisDriven": <int>,
    "logicalProgression": <int>,
    "prioritization": <int>,
    "adaptability": <int>
  },
  "comments": {
    "clarity": "<≤140 chars>",
    "structureFlow": "<≤140 chars>",
    "relevance": "<≤140 chars>",
    "activeListening": "<≤140 chars>",
    "hypothesisDriven": "<≤140 chars>",
    "logicalProgression": "<≤140 chars>",
    "prioritization": "<≤140 chars>",
    "adaptability": "<≤140 chars>"
  },
  "summary": "<≤280 chars overall behavioral summary>"
}`,
    "",
    "Transcript:",
    transcriptBlock || "(empty transcript)",
    "",
    "Respond with the JSON object only.",
  ].join("\n");

  return { system, user };
}

/**
 * Strip reasoning-model scratchpad blocks (e.g. K2 Think emits
 * `<think>...</think>` before the final answer). Removes paired tags and any
 * trailing unclosed `<think>...` prefix so only the user-visible answer remains.
 */
function stripReasoningTags(raw: string): string {
  let out = raw.replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "");
  const closing = out.search(/<\/think>/i);
  if (closing !== -1) out = out.slice(closing + "</think>".length);
  return out.trim();
}

/** Pull the last balanced {...} JSON object from a possibly noisy LLM string. */
function extractJsonObject(raw: string): string | null {
  const cleaned = stripReasoningTags(raw);
  if (!cleaned) return null;
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) return cleaned;

  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const inside = fenced[1].trim();
    if (inside.startsWith("{") && inside.endsWith("}")) return inside;
  }

  const end = cleaned.lastIndexOf("}");
  if (end === -1) return null;
  let depth = 0;
  for (let i = end; i >= 0; i -= 1) {
    const ch = cleaned[i];
    if (ch === "}") depth += 1;
    else if (ch === "{") {
      depth -= 1;
      if (depth === 0) return cleaned.slice(i, end + 1);
    }
  }
  return null;
}

export function parseBehavioralModelOutput(raw: string): BehavioralScoreResult | null {
  const jsonText = extractJsonObject(raw);
  if (!jsonText) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const obj = parsed as Record<string, unknown>;
  const rawScores = (obj.scores ?? obj.breakdown ?? {}) as Record<string, unknown>;
  const rawComments = (obj.comments ?? {}) as Record<string, unknown>;
  const summary = typeof obj.summary === "string" ? obj.summary.trim() : undefined;

  const scoresInput: Partial<Record<BehavioralRubricKey, number>> = {};
  for (const item of BEHAVIORAL_RUBRIC) {
    const v = rawScores[item.key];
    if (typeof v === "number") scoresInput[item.key] = v;
    else if (typeof v === "string" && v.trim() !== "") scoresInput[item.key] = Number(v);
  }
  const { breakdown, total } = normalizeBehavioralBreakdown(scoresInput);

  const comments: BehavioralScoreResult["comments"] = {};
  for (const item of BEHAVIORAL_RUBRIC) {
    const c = rawComments[item.key];
    if (typeof c === "string" && c.trim() !== "") comments[item.key] = c.trim().slice(0, 280);
  }

  return { total, breakdown, comments, summary };
}
