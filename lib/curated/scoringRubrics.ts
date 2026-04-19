import type { CuratedCaseSlug } from "@/lib/curatedCases";

import type { ScoreRubric } from "./scoreCase";
import { getCuratedCase } from "@/lib/curatedCases";
import { curatedInterviewSymptomLabels } from "./interviewSymptomTriggers";
import { helpfulExtraInfoRubricLabels } from "./extraInfoDiscovery";

import mariaBundle from "@/lib/Maria.json";
import jasonBundle from "@/lib/Jason.json";

function firstDiagnosis(bundle: readonly { diagnosis?: string }[]): string {
  const d = bundle[0]?.diagnosis?.trim();
  return d ?? "";
}

/**
 * Per-case reference answers and timing bands for `scoreCase`.
 * Acceptable diagnoses are loose synonyms for partial credit.
 */
export function getScoreRubric(slug: CuratedCaseSlug): ScoreRubric {
  const meta = getCuratedCase(slug);
  const targetSec = meta.estimatedMinutes * 60;
  const maxSec = Math.round(targetSec * 3);

  if (slug === "maria-wolf") {
    const diagnosis = firstDiagnosis(mariaBundle as { diagnosis?: string }[]);
    return {
      correctDiagnoses: [diagnosis],
      acceptableDiagnoses: ["viral conjunctivitis", "conjunctivitis", "pink eye", "acute conjunctivitis"],
      keySymptoms: curatedInterviewSymptomLabels(slug),
      helpfulExtraInfo: helpfulExtraInfoRubricLabels(slug),
      targetTimeSec: targetSec,
      maxTimeSec: maxSec,
      idealQuestionCountMin: Math.max(5, Math.floor(meta.estimatedMinutes)),
      idealQuestionCountMax: Math.min(28, Math.floor(meta.estimatedMinutes * 5)),
      partialDiagnosisFraction: 2 / 3,
    };
  }

  const diagnosis = firstDiagnosis(jasonBundle as { diagnosis?: string }[]);
  return {
    correctDiagnoses: [diagnosis],
    acceptableDiagnoses: [
      "covid",
      "covid-19",
      "covid 19",
      "coronavirus",
      "sars-cov-2",
      "viral respiratory illness",
      "acute covid",
    ],
    keySymptoms: curatedInterviewSymptomLabels(slug),
    helpfulExtraInfo: helpfulExtraInfoRubricLabels(slug),
    targetTimeSec: targetSec,
    maxTimeSec: maxSec,
    idealQuestionCountMin: Math.max(6, Math.floor(meta.estimatedMinutes)),
    idealQuestionCountMax: Math.min(32, Math.floor(meta.estimatedMinutes * 5)),
    partialDiagnosisFraction: 2 / 3,
  };
}
