import type { CaseDocument } from "@/types/case";
import type { SessionRow } from "@/types/session";

import { communicationChecklistSatisfied } from "./reducers";

function examRequirementMet(
  requiredKey: string,
  revealedFacts: Set<string>,
  completedExamKeys: Set<string>,
  findingKeys: Set<string>,
): boolean {
  if (requiredKey.startsWith("finding:")) {
    const fk = requiredKey.slice("finding:".length);
    return findingKeys.has(fk);
  }

  if (requiredKey.includes(":")) {
    const [action, target] = requiredKey.split(":") as [string, string];
    return completedExamKeys.has(`${action}:${target}`);
  }

  return revealedFacts.has(requiredKey);
}

export function computeChecklistProgress(args: {
  caseDoc: CaseDocument;
  session: SessionRow;
  studentTranscriptLines: string[];
}): { completed: number; total: number; percent: number } {
  const { caseDoc, session, studentTranscriptLines } = args;
  const revealed = new Set(session.revealed_facts);
  const completedKeys = new Set(
    session.completed_exam_actions.map((a) => `${a.action}:${a.target}`),
  );
  const findingKeys = new Set(session.completed_exam_actions.map((a) => a.finding_key));

  let done = 0;
  const total = caseDoc.checklist.length;

  for (const item of caseDoc.checklist) {
    if (item.id === "empathy_acknowledge") {
      if (communicationChecklistSatisfied(studentTranscriptLines)) {
        done += 1;
      }
      continue;
    }

    const factsOk =
      !item.required_fact_keys ||
      item.required_fact_keys.length === 0 ||
      item.required_fact_keys.every((k) => revealed.has(k));

    const examsOk =
      !item.required_exam_keys ||
      item.required_exam_keys.every((req) => examRequirementMet(req, revealed, completedKeys, findingKeys));

    if (factsOk && examsOk) done += 1;
  }

  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { completed: done, total, percent };
}

export function publicCaseSummary(caseDoc: CaseDocument) {
  return {
    id: caseDoc.id,
    title: caseDoc.title,
    chief_complaint: caseDoc.chief_complaint,
    demographics: caseDoc.demographics,
  };
}
