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

type FeedbackBucket = {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
};

function appendDiagnosisFeedback(
  bucket: FeedbackBucket,
  matched: ScoreCaseMetrics["diagnosisMatched"],
): void {
  if (matched === "correct") {
    bucket.strengths.push("Final diagnosis matches the reference diagnosis.");
    return;
  }
  if (matched === "acceptable") {
    bucket.strengths.push("Final diagnosis is in the acceptable differential (partial credit).");
    bucket.suggestions.push("Review distinguishing features to reach the primary diagnosis next time.");
    return;
  }
  bucket.weaknesses.push("Submitted diagnosis did not match expected or acceptable answers.");
  bucket.suggestions.push("Use a structured differential and tie findings back to the leading diagnosis.");
}

function appendSymptomFeedback(bucket: FeedbackBucket, symptomRatio: number): void {
  if (symptomRatio >= 0.75) {
    bucket.strengths.push("Strong coverage of key interview findings.");
    return;
  }
  if (symptomRatio < 0.45) {
    bucket.weaknesses.push("Several key symptoms were not surfaced during the encounter.");
    bucket.suggestions.push("Ask targeted history questions aligned with the chief complaint and associated systems.");
  }
}

function appendExtraInfoFeedback(
  bucket: FeedbackBucket,
  extraInfoRatio: number,
  helpfulExtraCount: number,
): void {
  if (helpfulExtraCount === 0) return;
  if (extraInfoRatio >= 0.7) {
    bucket.strengths.push("Helpful contextual information was explored.");
    return;
  }
  if (extraInfoRatio < 0.35) {
    bucket.weaknesses.push("Important contextual details from the rubric were missed.");
    bucket.suggestions.push("Briefly explore relevant social, functional, or risk-related context.");
  }
}

function appendQuestionYieldFeedback(bucket: FeedbackBucket, metrics: ScoreCaseMetrics): void {
  if (metrics.questionsAsked > 0 && metrics.questionYield >= 0.45) {
    bucket.strengths.push("Questions showed reasonable yield (useful vs total).");
    return;
  }
  if (metrics.questionsAsked === 0) {
    bucket.weaknesses.push("No clinician questions recorded.");
    bucket.suggestions.push("Drive the interview with focused, open-ended and targeted questions.");
    return;
  }
  if (metrics.questionYield < 0.35) {
    bucket.weaknesses.push("Low question yield — many questions did not advance the assessment.");
    bucket.suggestions.push("Reduce repetition; clarify one topic before moving on.");
  }
}

function appendEfficiencyFeedback(
  bucket: FeedbackBucket,
  metrics: ScoreCaseMetrics,
  breakdown: ScoreCaseBreakdown,
  rubric: ScoreRubric,
): void {
  const overTime = metrics.timeTakenSec > rubric.targetTimeSec;
  const lowEfficiency = breakdown.efficiencyOutOf10 < MAX_EFFICIENCY * 0.55;
  if (overTime && lowEfficiency) {
    bucket.weaknesses.push("Encounter ran longer than the target window or questions exceeded the efficient range.");
    bucket.suggestions.push("Practice prioritizing high-yield symptoms and limiting redundant questioning.");
  }
  if (breakdown.behavioralOutOf20 < MAX_BEHAVIORAL * 0.55) {
    bucket.suggestions.push("Review communication behaviors (rapport, clarity, shared decision-making) for additional points.");
  }
}

function buildFeedback(args: {
  metrics: ScoreCaseMetrics;
  breakdown: ScoreCaseBreakdown;
  rubric: ScoreRubric;
}): ScoreCaseFeedback {
  const { metrics, breakdown, rubric } = args;
  const bucket: FeedbackBucket = { strengths: [], weaknesses: [], suggestions: [] };

  appendDiagnosisFeedback(bucket, metrics.diagnosisMatched);
  appendSymptomFeedback(bucket, metrics.symptomRatio);
  appendExtraInfoFeedback(bucket, metrics.extraInfoRatio, rubric.helpfulExtraInfo.length);
  appendQuestionYieldFeedback(bucket, metrics);
  appendEfficiencyFeedback(bucket, metrics, breakdown, rubric);

  return bucket;
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

type CoverageScore = {
  found: number;
  total: number;
  ratio: number;
  points: number;
};

function coverageScore(
  haystack: readonly string[],
  needles: readonly string[],
  maxPoints: number,
): CoverageScore {
  const total = needles.length;
  const found = intersectionCount(haystack, needles);
  const ratio = total > 0 ? found / total : 1;
  return { found, total, ratio, points: proportionScore(found, total, maxPoints) };
}

type QuestionStats = {
  questionsAsked: number;
  useful: number;
  questionYield: number;
  questionYieldRaw: number;
  qualityPoints: number;
};

function computeQuestionStats(run: SimulationRun): QuestionStats {
  const questionsAsked = Math.max(0, run.questionsAsked);
  if (questionsAsked === 0) {
    return {
      questionsAsked: 0,
      useful: 0,
      questionYield: 0,
      questionYieldRaw: Number.NaN,
      qualityPoints: 0,
    };
  }
  const useful = clamp(run.usefulQuestions, 0, questionsAsked);
  const ratio = useful / questionsAsked;
  return {
    questionsAsked,
    useful,
    questionYield: ratio,
    questionYieldRaw: ratio,
    qualityPoints: proportionScore(useful, questionsAsked, MAX_QUESTION_QUALITY),
  };
}

function computeTimeEfficiencyRatio(
  timeTakenSec: number,
  targetTimeSec: number,
  maxTimeSec: number,
): number {
  if (timeTakenSec <= targetTimeSec) return 1;
  if (maxTimeSec <= targetTimeSec) return 0;
  return clamp((maxTimeSec - timeTakenSec) / (maxTimeSec - targetTimeSec), 0, 1);
}

function computeQuestionCountEfficiencyRatio(
  questionsAsked: number,
  qMin: number,
  qMax: number,
): number {
  if (questionsAsked >= qMin && questionsAsked <= qMax) return 1;
  if (questionsAsked < qMin && qMin > 0) return questionsAsked / qMin;
  if (questionsAsked > qMax) {
    const span = Math.max(qMax - qMin, 1);
    return clamp(1 - (questionsAsked - qMax) / span, 0, 1);
  }
  return 0;
}

export function scoreCase(
  run: SimulationRun,
  rubric: ScoreRubric,
  options?: { includeFeedback?: boolean },
): ScoreCaseResult {
  const behavioralScore = clamp(run.behavioralScore ?? 0, 0, MAX_BEHAVIORAL);
  const diag = scoreDiagnosis({ finalDiagnosis: run.finalDiagnosis, rubric });

  const symptoms = coverageScore(run.symptomsRevealed, rubric.keySymptoms, MAX_SYMPTOMS);
  const extra = coverageScore(run.extraInfoFound, rubric.helpfulExtraInfo, MAX_EXTRA);
  const questions = computeQuestionStats(run);

  const timeTaken = clamp(run.timeTakenSec, 0, Number.MAX_SAFE_INTEGER);
  const timePts = timeEfficiencyPoints5(timeTaken, rubric.targetTimeSec, rubric.maxTimeSec);
  const qPts = questionCountEfficiencyPoints5(
    questions.questionsAsked,
    rubric.idealQuestionCountMin,
    rubric.idealQuestionCountMax,
  );
  const efficiencyOutOf10 = Math.round((timePts + qPts) * 1000) / 1000;

  const breakdown: ScoreCaseBreakdown = {
    diagnosisOutOf30: diag.points,
    symptomsOutOf15: symptoms.points,
    extraInfoOutOf10: extra.points,
    questionQualityOutOf15: questions.qualityPoints,
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
    questionsAsked: questions.questionsAsked,
    usefulQuestions: questions.useful,
    symptomRatio: symptoms.ratio,
    keySymptomsFound: symptoms.found,
    keySymptomsTotal: symptoms.total,
    extraInfoRatio: extra.ratio,
    helpfulExtraFound: extra.found,
    helpfulExtraTotal: extra.total,
    questionYield: questions.questionYield,
    questionYieldRaw: questions.questionYieldRaw,
    timeEfficiencyRatio: computeTimeEfficiencyRatio(
      run.timeTakenSec,
      rubric.targetTimeSec,
      rubric.maxTimeSec,
    ),
    questionCountEfficiencyRatio: computeQuestionCountEfficiencyRatio(
      questions.questionsAsked,
      rubric.idealQuestionCountMin,
      rubric.idealQuestionCountMax,
    ),
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
