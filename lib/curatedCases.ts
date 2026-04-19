/**
 * Curated case catalog.
 *
 * These are the fixed, deterministic challenge encounters featured on the
 * homepage. Each case lives at a stable URL and is intended to be re-run
 * repeatedly - Zetamac / Wordle / LeetCode for clinical reasoning.
 *
 * The diagnosis is intentionally hidden. The user knows only the patient
 * and a vague chief complaint - the case is theirs to solve.
 *
 * The broader Supabase-backed case bank still lives under /cases. This list
 * is intentionally tiny and hand-curated.
 */

export type CuratedCaseDifficulty = "Medium" | "Medium-Hard";

export type CuratedCaseSlug = "maria-wolf" | "jason-mehta";

export type CuratedCase = {
  slug: CuratedCaseSlug;
  /** Patient name shown to the user. */
  title: string;
  /** Vague age / sex / presenting framing - never the diagnosis. */
  oneLiner: string;
  /** Slightly longer mystery pitch used on the homepage card. */
  description: string;
  difficulty: CuratedCaseDifficulty;
  estimatedMinutes: number;
  /** Fixed, public-facing URL for the case. */
  route: `/cases/${CuratedCaseSlug}`;
};

export const CURATED_CASES: readonly CuratedCase[] = [
  {
    slug: "maria-wolf",
    title: "Maria Wolf",
    oneLiner:
      "Adult patient walks in with a chief complaint. The diagnosis is hidden - your job is to find it.",
    description:
      "A fixed mystery patient. Same history, same exam findings, every run. Interview, examine, and submit your working diagnosis - the answer is never given to you.",
    difficulty: "Medium",
    estimatedMinutes: 6,
    route: "/cases/maria-wolf",
  },
  {
    slug: "jason-mehta",
    title: "Jason Mehta",
    oneLiner:
      "Adult patient presenting with an undisclosed complaint. Take the history, work the exam, name the disease.",
    description:
      "A deterministic mystery encounter. The disease label is hidden until you commit. Built for repeat attempts - drill the reasoning until the pattern is automatic.",
    difficulty: "Medium-Hard",
    estimatedMinutes: 7,
    route: "/cases/jason-mehta",
  },
] as const;

export function getCuratedCase(slug: CuratedCaseSlug): CuratedCase {
  const found = CURATED_CASES.find((c) => c.slug === slug);
  if (!found) {
    throw new Error(`Unknown curated case slug: ${slug}`);
  }
  return found;
}

export function isCuratedCaseSlug(value: string): value is CuratedCaseSlug {
  return CURATED_CASES.some((c) => c.slug === value);
}
