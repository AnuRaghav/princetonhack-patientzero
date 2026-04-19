import type { CuratedCaseSlug } from "@/lib/curatedCases";

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

/** Deterministic score for a stored challenge result (same inputs ⇒ same score). */
export function computeCuratedChallengeScore(payload: CuratedChallengeResultV1): ScoreCaseResult {
  const slug = payload.slug as CuratedCaseSlug;
  const rubric = getScoreRubric(slug);
  const usefulQuestions = countUsefulQuestionsFromTranscript(payload.transcript);
  const extraInfoFound = discoverHelpfulExtraInfo(slug, payload.transcript);

  return scoreCase(
    {
      timeTakenSec: payload.elapsedMs / 1000,
      questionsAsked: payload.clinicianTurns,
      usefulQuestions,
      symptomsRevealed: payload.symptomLabels,
      extraInfoFound,
      finalDiagnosis: payload.diagnosisGuess,
      behavioralScore: 0,
    },
    rubric,
  );
}
