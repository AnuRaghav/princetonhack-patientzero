import type { CaseDocument } from "@/types/case";

/**
 * Deterministic reveal engine: student text is lowercased and scanned for
 * `match_terms` hits. The LLM is never used to decide what is medically true.
 */
export function computeNewlyRevealedFacts(
  caseDoc: CaseDocument,
  studentMessage: string,
  alreadyRevealed: Set<string>,
): string[] {
  const text = studentMessage.toLowerCase();
  const newly: string[] = [];

  for (const rule of caseDoc.reveal_rules) {
    const hit = rule.match_terms.some((term) => text.includes(term.toLowerCase()));
    if (!hit) continue;
    for (const fact of rule.reveals) {
      if (!alreadyRevealed.has(fact)) {
        newly.push(fact);
      }
    }
  }

  return newly;
}
