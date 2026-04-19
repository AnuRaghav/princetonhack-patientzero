import type { CuratedCaseSlug } from "@/lib/curatedCases";

import type { BehavioralScoreResult } from "./behavioralScore";
import type { CuratedChallengeResultV1 } from "./challengeResult";
import { discoverHelpfulExtraInfo } from "./extraInfoDiscovery";
import { scoreCase, type ScoreCaseResult } from "./scoreCase";
import { getScoreRubric } from "./scoringRubrics";

/** Clinician turns that receive a patient reply next (excluding system lines). */
export function countUsefulQuestionsFromTranscript(
  transcript: CuratedChallengeResultV1["transcript"],
): number {
  let n = 0;
  for (let i = 0; i < transcript.length; i++) {
    if (transcript[i].role !== "clinician") continue;
    const next = transcript[i + 1];
    if (next?.role === "patient") n += 1;
  }
  return n;
}

/**
 * Deterministic clinical score for a stored challenge result.
 * Behavioral input is optional — when omitted, behavioral defaults to 0 so the
 * results page can still render before async LLM scoring resolves (or after a
 * graceful fallback). Pass `payload.behavioral` (set after `/api/curated/behavioral-score`)
 * to fold the LLM-derived 20-point score into the breakdown.
 */
export function computeCuratedChallengeScore(payload: CuratedChallengeResultV1): ScoreCaseResult {
  const slug = payload.slug as CuratedCaseSlug;
  const rubric = getScoreRubric(slug);
  const usefulQuestions = countUsefulQuestionsFromTranscript(payload.transcript);
  const extraInfoFound = discoverHelpfulExtraInfo(slug, payload.transcript);

  const behavioral: BehavioralScoreResult | undefined = payload.behavioral;

  return scoreCase(
    {
      timeTakenSec: payload.elapsedMs / 1000,
      questionsAsked: payload.clinicianTurns,
      usefulQuestions,
      symptomsRevealed: payload.symptomLabels,
      extraInfoFound,
      finalDiagnosis: payload.diagnosisGuess,
      behavioralScore: behavioral?.total ?? 0,
      behavioralBreakdown: behavioral?.breakdown,
    },
    rubric,
  );
}
