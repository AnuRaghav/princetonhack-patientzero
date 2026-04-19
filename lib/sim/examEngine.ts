import type { CaseDocument } from "@/types/case";
import type { ExamAction, ExamActionRecord, ExamEngineResult, ExamTarget } from "@/types/exam";

function findByKey(caseDoc: CaseDocument, findingKey: string) {
  return caseDoc.physical_exam_findings.find((f) => f.finding_key === findingKey);
}

function alreadyHasFinding(actions: ExamActionRecord[], findingKey: string) {
  return actions.some((a) => a.finding_key === findingKey);
}

function requireFinding(caseDoc: CaseDocument, findingKey: string) {
  const entry = findByKey(caseDoc, findingKey);
  if (!entry) throw new Error(`Case missing ${findingKey} finding`);
  return entry;
}

function resultFromEntry(
  entry: NonNullable<ReturnType<typeof findByKey>>,
  visualOverride?: ExamEngineResult["visualCue"],
): ExamEngineResult {
  return {
    finding_key: entry.finding_key,
    finding: entry.student_finding,
    painDelta: entry.pain_delta ?? 0,
    audioUrl: null,
    visualCue: visualOverride !== undefined ? visualOverride : (entry.visual ?? null),
  };
}

function resolvePalpateRlq(
  caseDoc: CaseDocument,
  completed: ExamActionRecord[],
): ExamEngineResult {
  if (!alreadyHasFinding(completed, "palpate_rlq")) {
    return resultFromEntry(requireFinding(caseDoc, "palpate_rlq"));
  }
  if (!alreadyHasFinding(completed, "rebound_rlq")) {
    return resultFromEntry(requireFinding(caseDoc, "rebound_rlq"));
  }
  return {
    finding_key: "palpate_rlq_repeat",
    finding:
      "Repeat palpation continues to demonstrate RLQ tenderness without new findings on this pass.",
    painDelta: 0,
    audioUrl: null,
    visualCue: { highlight: "rlq", severity: "medium" },
  };
}

function resolvePalpateAbdomen(caseDoc: CaseDocument, target: ExamTarget): ExamEngineResult {
  const entry = requireFinding(caseDoc, "palpate_abdomen_general");
  const visual = entry.visual ? { ...entry.visual, highlight: target } : null;
  return resultFromEntry(entry, visual);
}

type Resolver = (caseDoc: CaseDocument, completed: ExamActionRecord[], target: ExamTarget) => ExamEngineResult;

const RESOLVERS: Record<string, Resolver> = {
  "palpate:rlq": (doc, completed) => resolvePalpateRlq(doc, completed),
  "palpate:abdomen": (doc, _c, target) => resolvePalpateAbdomen(doc, target),
  "palpate:stomach": (doc, _c, target) => resolvePalpateAbdomen(doc, target),
  "auscultate:chest": (doc) => resultFromEntry(requireFinding(doc, "auscultate_chest")),
  "inspect:head": (doc) => resultFromEntry(requireFinding(doc, "inspect_head")),
};

/**
 * Maps (action, target) + prior exam actions to a deterministic finding.
 * No LLM calls here.
 */
export function runExam(
  caseDoc: CaseDocument,
  action: ExamAction,
  target: ExamTarget,
  completed: ExamActionRecord[],
): ExamEngineResult {
  const key = `${action}:${target}`;
  const resolver = RESOLVERS[key];
  if (resolver) return resolver(caseDoc, completed, target);

  return {
    finding_key: `noop:${key}`,
    finding: `You ${action} the ${target} and do not elicit additional specific findings in this vignette.`,
    painDelta: 0,
    audioUrl: null,
    visualCue: { highlight: target, severity: "low" },
  };
}

export function emotionFromExam(result: ExamEngineResult): string {
  if (result.painDelta >= 2) return "pain";
  if (result.painDelta >= 1) return "discomfort";
  return "anxiety";
}
