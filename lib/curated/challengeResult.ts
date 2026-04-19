import type { EncounterMessage } from "@/components/encounter/lib/types";
import type { CuratedCaseSlug } from "@/lib/curatedCases";

import type { BehavioralScoreResult } from "./behavioralScore";
import type { ScoreCaseResult } from "./scoreCase";
import { discoverInterviewSymptoms } from "./interviewSymptomTriggers";

export const CURATED_CHALLENGE_RESULT_VERSION = 1 as const;

export type CuratedChallengeTranscriptLine = {
  role: "clinician" | "patient" | "system";
  text: string;
  createdAt: number;
};

/** Stored in sessionStorage after the learner submits a diagnosis at end of challenge. */
export type CuratedChallengeResultV1 = {
  version: typeof CURATED_CHALLENGE_RESULT_VERSION;
  slug: CuratedCaseSlug;
  caseTitle: string;
  diagnosisGuess: string;
  /** ms from challenge start to submit */
  elapsedMs: number;
  /** When the learner submitted (epoch ms) */
  finishedAt: number;
  /** Wall-clock ms when learner pressed Start assessment */
  startedAt: number;
  /** Student / doctor messages */
  clinicianTurns: number;
  /** Patient replies */
  patientTurns: number;
  /** clinician + patient messages (excludes system) */
  totalDialogueTurns: number;
  /** Distinct interview symptom triggers surfaced from dialogue */
  symptomsDiscoveredCount: number;
  symptomLabels: string[];
  transcript: CuratedChallengeTranscriptLine[];
  /** Present when saved after scoring integration; older sessions omit this. */
  score?: ScoreCaseResult;
  /** LLM-derived behavioral rubric (Maria/Jason curated flow). Optional - falls back to 0. */
  behavioral?: BehavioralScoreResult;
};

export function curatedChallengeStorageKey(slug: string): string {
  return `patientzero:curatedChallenge:v${CURATED_CHALLENGE_RESULT_VERSION}:${slug}`;
}

function transcriptFromMessages(messages: readonly EncounterMessage[]): CuratedChallengeTranscriptLine[] {
  return messages.map((m) => ({
    role: m.role,
    text: m.text,
    createdAt: m.createdAt,
  }));
}

export function buildCuratedChallengeResult(args: {
  slug: CuratedCaseSlug;
  caseTitle: string;
  diagnosisGuess: string;
  messages: readonly EncounterMessage[];
  /** Epoch ms when Start assessment was pressed - all metrics use messages on/after this instant */
  assessmentStartedAt: number;
}): CuratedChallengeResultV1 {
  const { slug, caseTitle, diagnosisGuess, messages, assessmentStartedAt } = args;
  const finishedAt = Date.now();
  const startedAt = assessmentStartedAt;
  const elapsedMs = Math.max(0, finishedAt - startedAt);

  const windowed = messages.filter((m) => m.createdAt >= assessmentStartedAt);
  const clinicianTurns = windowed.filter((m) => m.role === "clinician").length;
  const patientTurns = windowed.filter((m) => m.role === "patient").length;
  const totalDialogueTurns = clinicianTurns + patientTurns;

  const discovered = discoverInterviewSymptoms(slug, windowed);
  const symptomLabels = discovered.map((d) => d.label).sort((a, b) => a.localeCompare(b));

  return {
    version: CURATED_CHALLENGE_RESULT_VERSION,
    slug,
    caseTitle,
    diagnosisGuess: diagnosisGuess.trim(),
    elapsedMs,
    finishedAt,
    startedAt,
    clinicianTurns,
    patientTurns,
    totalDialogueTurns,
    symptomsDiscoveredCount: discovered.length,
    symptomLabels,
    transcript: transcriptFromMessages(windowed),
  };
}

export function parseCuratedChallengeResult(raw: string | null): CuratedChallengeResultV1 | null {
  if (!raw?.trim()) return null;
  try {
    const data = JSON.parse(raw) as CuratedChallengeResultV1;
    if (data?.version !== CURATED_CHALLENGE_RESULT_VERSION || !data.slug) return null;
    return data;
  } catch {
    return null;
  }
}
