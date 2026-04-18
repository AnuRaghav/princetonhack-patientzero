import type { ExamActionRecord } from "@/types/exam";
import type { SessionRow } from "@/types/session";

function clampPain(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n)));
}

export function mergeRevealedFacts(
  current: string[],
  newlyRevealed: string[],
): string[] {
  const set = new Set([...current, ...newlyRevealed]);
  return [...set];
}

export function appendExamAction(
  current: ExamActionRecord[],
  action: ExamActionRecord,
): ExamActionRecord[] {
  return [...current, { ...action, completed_at: new Date().toISOString() }];
}

export function adjustPainLevel(session: SessionRow, delta: number): number {
  return clampPain(session.pain_level + delta);
}

export function applyChatReveal(
  session: SessionRow,
  newlyRevealed: string[],
): SessionRow {
  return {
    ...session,
    revealed_facts: mergeRevealedFacts(session.revealed_facts, newlyRevealed),
  };
}

export function applyExamCompletion(
  session: SessionRow,
  action: ExamActionRecord,
  painDelta: number,
  emotion: string,
): SessionRow {
  return {
    ...session,
    completed_exam_actions: appendExamAction(session.completed_exam_actions, action),
    pain_level: adjustPainLevel(session, painDelta),
    emotional_state: emotion,
  };
}

/** Lightweight empathy signal: if student uses supportive language, nudge checklist communication item. */
export function detectEmpathyCue(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("sorry") ||
    m.includes("take your time") ||
    m.includes("going to") ||
    m.includes("i'm going to") ||
    m.includes("let you know") ||
    m.includes("is it okay")
  );
}

export function communicationChecklistSatisfied(
  transcriptStudentLines: string[],
): boolean {
  return transcriptStudentLines.some((line) => detectEmpathyCue(line));
}
