/**
 * Deterministic clinical simulation scoring (100 pts: 80 clinical + 20 behavioral).
 * Extend partial diagnosis / behavioral logic without changing the public shape.
 */

/** Single encounter run metrics — behavioral may be supplied by another evaluator. */
export type SimulationRun = {
  timeTakenSec: number;
  questionsAsked: number;
  usefulQuestions: number;
  symptomsRevealed: readonly string[];
  extraInfoFound: readonly string[];
  finalDiagnosis: string;
  /** 0–20 inclusive when provided; otherwise treated as 0 unless you plug in computed behavioral scoring later. */
  behavioralScore?: number;
  behavioralBreakdown?: Readonly<Record<string, number>>;
};

export type ScoreRubric = {
  correctDiagnoses: readonly string[];
  /** Synonyms / partial credit diagnoses (see `partialDiagnosisFraction`). */
  acceptableDiagnoses?: readonly string[];
  keySymptoms: readonly string[];
  helpfulExtraInfo: readonly string[];
  targetTimeSec: number;
  maxTimeSec: number;
  idealQuestionCountMin: number;
  idealQuestionCountMax: number;
  /**
   * Fraction of diagnosis points (max 30) when `acceptableDiagnoses` matches.
   * Default 2/3 — easy to tune per case.
   */
  partialDiagnosisFraction?: number;
};

export type ScoreCaseMetrics = {
  diagnosisMatched: "correct" | "acceptable" | "none";
  timeTakenSec: number;
  questionsAsked: number;
  usefulQuestions: number;
  symptomRatio: number;
  keySymptomsFound: number;
  keySymptomsTotal: number;
  extraInfoRatio: number;
  helpfulExtraFound: number;
  helpfulExtraTotal: number;
  questionYield: number;
  /** usefulQuestions / questionsAsked; NaN when questionsAsked === 0 */
  questionYieldRaw: number;
  timeEfficiencyRatio: number;
  questionCountEfficiencyRatio: number;
};

export type ScoreCaseBreakdown = {
  diagnosisOutOf30: number;
  symptomsOutOf15: number;
  extraInfoOutOf10: number;
  questionQualityOutOf15: number;
  efficiencyOutOf10: number;
  behavioralOutOf20: number;
};

export type ScoreCaseFeedback = {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
};

export type ScoreCaseResult = {
  totalScore: number;
  clinicalScore: number;
  behavioralScore: number;
  breakdown: ScoreCaseBreakdown;
  metrics: ScoreCaseMetrics;
  /** Echo from `SimulationRun` when another layer supplies sub-scores (rapport, clarity, …). */
  behavioralBreakdown?: Readonly<Record<string, number>>;
  feedback?: ScoreCaseFeedback;
};

const MAX_DIAGNOSIS = 30;
const MAX_SYMPTOMS = 15;
const MAX_EXTRA = 10;
const MAX_QUESTION_QUALITY = 15;
const MAX_EFFICIENCY = 10;
const MAX_BEHAVIORAL = 20;
const MAX_CLINICAL = MAX_DIAGNOSIS + MAX_SYMPTOMS + MAX_EXTRA + MAX_QUESTION_QUALITY + MAX_EFFICIENCY;

const DEFAULT_PARTIAL_FRACTION = 2 / 3;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Map `value` linearly from [inMin, inMax] to [outMin, outMax]; clamps to output range. */
export function normalize(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) return (outMin + outMax) / 2;
  const t = (value - inMin) / (inMax - inMin);
  return clamp(outMin + t * (outMax - outMin), Math.min(outMin, outMax), Math.max(outMin, outMax));
}

/** How many normalized `needles` appear in `haystack` (set semantics on normalized keys). */
export function intersectionCount(haystack: readonly string[], needles: readonly string[]): number {
  if (needles.length === 0) return 0;
  const bag = new Set(haystack.map(normalizeToken));
  let n = 0;
  for (const needle of needles) {
    if (bag.has(normalizeToken(needle))) n += 1;
  }
  return n;
}

function normalizeToken(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchesAnyDiagnosis(answer: string, list: readonly string[] | undefined): boolean {
  if (!list?.length) return false;
  const a = normalizeToken(answer);
  return list.some((d) => normalizeToken(d) === a);
}

/** Diagnosis points: full, partial (acceptable list), or 0 — extend with fuzzy matchers later. */
function scoreDiagnosis(args: {
  finalDiagnosis: string;
  rubric: ScoreRubric;
}): { points: number; matched: ScoreCaseMetrics["diagnosisMatched"] } {
  const { finalDiagnosis, rubric } = args;
  const partialFrac = rubric.partialDiagnosisFraction ?? DEFAULT_PARTIAL_FRACTION;

  if (matchesAnyDiagnosis(finalDiagnosis, rubric.correctDiagnoses)) {
    return { points: MAX_DIAGNOSIS, matched: "correct" };
  }
  if (matchesAnyDiagnosis(finalDiagnosis, rubric.acceptableDiagnoses)) {
    return { points: Math.round(MAX_DIAGNOSIS * clamp(partialFrac, 0, 1)), matched: "acceptable" };
  }
  return { points: 0, matched: "none" };
}

function proportionScore(found: number, total: number, maxPoints: number): number {
  if (total <= 0) return maxPoints;
  return Math.round((found / total) * maxPoints * 1000) / 1000;
}

/** Time sub-score (half of efficiency bucket): better at or below target; 0 at or beyond max. */
function timeEfficiencyPoints5(timeSec: number, target: number, max: number): number {
  if (timeSec <= target) return 5;
  if (max <= target) return 0;
  const t = normalize(timeSec, target, max, 1, 0);
  return Math.round(5 * t * 1000) / 1000;
}

/** Question-count sub-score (half of efficiency bucket): peak inside ideal band. */
function questionCountEfficiencyPoints5(q: number, minQ: number, maxQ: number): number {
  if (minQ < 0 || maxQ < minQ) return 0;
  if (q >= minQ && q <= maxQ) return 5;
  if (q < minQ) {
    if (minQ === 0) return 5;
    return Math.round(5 * clamp(q / minQ, 0, 1) * 1000) / 1000;
  }
  const excess = q - maxQ;
  const span = Math.max(maxQ - minQ, 1);
  const penalty = clamp(excess / span, 0, 1);
  return Math.round(5 * (1 - penalty) * 1000) / 1000;
}

function buildFeedback(args: {
  metrics: ScoreCaseMetrics;
  breakdown: ScoreCaseBreakdown;
  rubric: ScoreRubric;
}): ScoreCaseFeedback {
  const { metrics, breakdown, rubric } = args;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  if (metrics.diagnosisMatched === "correct") {
    strengths.push("Final diagnosis matches the reference diagnosis.");
  } else if (metrics.diagnosisMatched === "acceptable") {
    strengths.push("Final diagnosis is in the acceptable differential (partial credit).");
    suggestions.push("Review distinguishing features to reach the primary diagnosis next time.");
  } else {
    weaknesses.push("Submitted diagnosis did not match expected or acceptable answers.");
    suggestions.push("Use a structured differential and tie findings back to the leading diagnosis.");
  }

  if (metrics.symptomRatio >= 0.75) {
    strengths.push("Strong coverage of key interview findings.");
  } else if (metrics.symptomRatio < 0.45) {
    weaknesses.push("Several key symptoms were not surfaced during the encounter.");
    suggestions.push("Ask targeted history questions aligned with the chief complaint and associated systems.");
  }

  if (metrics.extraInfoRatio >= 0.7 && rubric.helpfulExtraInfo.length > 0) {
    strengths.push("Helpful contextual information was explored.");
  } else if (metrics.extraInfoRatio < 0.35 && rubric.helpfulExtraInfo.length > 0) {
    weaknesses.push("Important contextual details from the rubric were missed.");
    suggestions.push("Briefly explore relevant social, functional, or risk-related context.");
  }

  const yieldOk = metrics.questionsAsked > 0 && metrics.questionYield >= 0.45;
  if (yieldOk) {
    strengths.push("Questions showed reasonable yield (useful vs total).");
  } else if (metrics.questionsAsked === 0) {
    weaknesses.push("No clinician questions recorded.");
    suggestions.push("Drive the interview with focused, open-ended and targeted questions.");
  } else if (metrics.questionYield < 0.35) {
    weaknesses.push("Low question yield — many questions did not advance the assessment.");
    suggestions.push("Reduce repetition; clarify one topic before moving on.");
  }

  if (
    metrics.timeTakenSec > rubric.targetTimeSec &&
    breakdown.efficiencyOutOf10 < MAX_EFFICIENCY * 0.55
  ) {
    weaknesses.push("Encounter ran longer than the target window or questions exceeded the efficient range.");
    suggestions.push("Practice prioritizing high-yield symptoms and limiting redundant questioning.");
  }

  if (breakdown.behavioralOutOf20 < MAX_BEHAVIORAL * 0.55) {
    suggestions.push("Review communication behaviors (rapport, clarity, shared decision-making) for additional points.");
  }

  return { strengths, weaknesses, suggestions };
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

export function scoreCase(
  run: SimulationRun,
  rubric: ScoreRubric,
  options?: { includeFeedback?: boolean },
): ScoreCaseResult {
  const behavioralScore = clamp(run.behavioralScore ?? 0, 0, MAX_BEHAVIORAL);

  const diag = scoreDiagnosis({ finalDiagnosis: run.finalDiagnosis, rubric });

  const keyTotal = rubric.keySymptoms.length;
  const keyFound = intersectionCount(run.symptomsRevealed, rubric.keySymptoms);
  const symptomRatio = keyTotal > 0 ? keyFound / keyTotal : 1;
  const symptomsOutOf15 = proportionScore(keyFound, keyTotal, MAX_SYMPTOMS);

  const extraTotal = rubric.helpfulExtraInfo.length;
  const extraFound = intersectionCount(run.extraInfoFound, rubric.helpfulExtraInfo);
  const extraInfoRatio = extraTotal > 0 ? extraFound / extraTotal : 1;
  const extraInfoOutOf10 = proportionScore(extraFound, extraTotal, MAX_EXTRA);

  const questionsAsked = Math.max(0, run.questionsAsked);
  const useful =
    questionsAsked === 0 ? 0 : clamp(run.usefulQuestions, 0, questionsAsked);
  const questionYieldRaw = questionsAsked === 0 ? Number.NaN : useful / questionsAsked;
  const questionYield = questionsAsked === 0 ? 0 : questionYieldRaw;
  const questionQualityOutOf15 =
    questionsAsked === 0 ? 0 : proportionScore(useful, questionsAsked, MAX_QUESTION_QUALITY);

  const timeTaken = clamp(run.timeTakenSec, 0, Number.MAX_SAFE_INTEGER);
  const timePts = timeEfficiencyPoints5(timeTaken, rubric.targetTimeSec, rubric.maxTimeSec);
  const qPts = questionCountEfficiencyPoints5(
    questionsAsked,
    rubric.idealQuestionCountMin,
    rubric.idealQuestionCountMax,
  );
  const efficiencyOutOf10 = Math.round((timePts + qPts) * 1000) / 1000;

  const timeEfficiencyRatio =
    run.timeTakenSec <= rubric.targetTimeSec
      ? 1
      : rubric.maxTimeSec <= rubric.targetTimeSec
        ? 0
        : clamp(
            (rubric.maxTimeSec - run.timeTakenSec) / (rubric.maxTimeSec - rubric.targetTimeSec),
            0,
            1,
          );

  const qMin = rubric.idealQuestionCountMin;
  const qMax = rubric.idealQuestionCountMax;
  let questionCountEfficiencyRatio = 0;
  if (questionsAsked >= qMin && questionsAsked <= qMax) questionCountEfficiencyRatio = 1;
  else if (questionsAsked < qMin && qMin > 0) questionCountEfficiencyRatio = questionsAsked / qMin;
  else if (questionsAsked > qMax) {
    const span = Math.max(qMax - qMin, 1);
    const excess = questionsAsked - qMax;
    questionCountEfficiencyRatio = clamp(1 - excess / span, 0, 1);
  }

  const breakdown: ScoreCaseBreakdown = {
    diagnosisOutOf30: diag.points,
    symptomsOutOf15,
    extraInfoOutOf10,
    questionQualityOutOf15,
    efficiencyOutOf10,
    behavioralOutOf20: behavioralScore,
  };

  const clinicalScore = clamp(
    breakdown.diagnosisOutOf30 +
      breakdown.symptomsOutOf15 +
      breakdown.extraInfoOutOf10 +
      breakdown.questionQualityOutOf15 +
      breakdown.efficiencyOutOf10,
    0,
    MAX_CLINICAL,
  );

  const totalScore = clamp(clinicalScore + behavioralScore, 0, 100);

  const metrics: ScoreCaseMetrics = {
    diagnosisMatched: diag.matched,
    timeTakenSec: run.timeTakenSec,
    questionsAsked,
    usefulQuestions: useful,
    symptomRatio,
    keySymptomsFound: keyFound,
    keySymptomsTotal: keyTotal,
    extraInfoRatio,
    helpfulExtraFound: extraFound,
    helpfulExtraTotal: extraTotal,
    questionYield,
    questionYieldRaw,
    timeEfficiencyRatio,
    questionCountEfficiencyRatio,
  };

  const feedback =
    options?.includeFeedback === false
      ? undefined
      : buildFeedback({ metrics, breakdown, rubric });

  return {
    totalScore,
    clinicalScore,
    behavioralScore,
    breakdown,
    metrics,
    ...(run.behavioralBreakdown ? { behavioralBreakdown: run.behavioralBreakdown } : {}),
    feedback,
  };
}
