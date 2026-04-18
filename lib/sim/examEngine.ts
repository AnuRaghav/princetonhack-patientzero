import type { CaseDocument } from "@/types/case";
import type { ExamAction, ExamActionRecord, ExamEngineResult, ExamTarget } from "@/types/exam";

function findByKey(caseDoc: CaseDocument, findingKey: string) {
  return caseDoc.physical_exam_findings.find((f) => f.finding_key === findingKey);
}

function alreadyHasFinding(actions: ExamActionRecord[], findingKey: string) {
  return actions.some((a) => a.finding_key === findingKey);
}

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

  if (action === "palpate" && target === "rlq") {
    if (!alreadyHasFinding(completed, "palpate_rlq")) {
      const entry = findByKey(caseDoc, "palpate_rlq");
      if (!entry) throw new Error("Case missing palpate_rlq finding");
      return {
        finding_key: entry.finding_key,
        finding: entry.student_finding,
        painDelta: entry.pain_delta ?? 0,
        audioUrl: null,
        visualCue: entry.visual ?? null,
      };
    }
    if (!alreadyHasFinding(completed, "rebound_rlq")) {
      const entry = findByKey(caseDoc, "rebound_rlq");
      if (!entry) throw new Error("Case missing rebound_rlq finding");
      return {
        finding_key: entry.finding_key,
        finding: entry.student_finding,
        painDelta: entry.pain_delta ?? 0,
        audioUrl: null,
        visualCue: entry.visual ?? null,
      };
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

  if (action === "palpate" && target === "abdomen") {
    const entry = findByKey(caseDoc, "palpate_abdomen_general");
    if (!entry) throw new Error("Case missing palpate_abdomen_general finding");
    return {
      finding_key: entry.finding_key,
      finding: entry.student_finding,
      painDelta: entry.pain_delta ?? 0,
      audioUrl: null,
      visualCue: entry.visual ?? null,
    };
  }

  if (action === "auscultate" && target === "chest") {
    const entry = findByKey(caseDoc, "auscultate_chest");
    if (!entry) throw new Error("Case missing auscultate_chest finding");
    return {
      finding_key: entry.finding_key,
      finding: entry.student_finding,
      painDelta: entry.pain_delta ?? 0,
      audioUrl: null,
      visualCue: entry.visual ?? null,
    };
  }

  if (action === "inspect" && target === "head") {
    const entry = findByKey(caseDoc, "inspect_head");
    if (!entry) throw new Error("Case missing inspect_head finding");
    return {
      finding_key: entry.finding_key,
      finding: entry.student_finding,
      painDelta: entry.pain_delta ?? 0,
      audioUrl: null,
      visualCue: entry.visual ?? null,
    };
  }

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
