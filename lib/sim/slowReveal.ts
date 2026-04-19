import type { CaseDocument } from "@/types/case";

/**
 * Same deterministic matching as bulk reveal, but **at most one** new fact key per turn
 * so information surfaces gradually during history taking.
 */
export function computeAtMostOneNewReveal(
  caseDoc: CaseDocument,
  studentMessage: string,
  alreadyRevealed: Set<string>,
): string[] {
  const text = studentMessage.toLowerCase();

  for (const rule of caseDoc.reveal_rules) {
    const hit = rule.match_terms.some((term) => text.includes(term.toLowerCase()));
    if (!hit) continue;

    for (const factKey of rule.reveals) {
      if (!alreadyRevealed.has(factKey)) {
        return [factKey];
      }
    }
  }

  return [];
}
