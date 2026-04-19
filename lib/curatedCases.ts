/**
 * Curated case catalog.
 *
 * These are the fixed, deterministic challenge encounters featured on the
 * homepage. Each case lives at a stable URL and is intended to be re-run
 * repeatedly — Zetamac / Wordle / LeetCode for clinical reasoning.
 *
 * The broader Supabase-backed case bank still lives under /cases. This list
 * is intentionally tiny and hand-curated.
 */

export type CuratedCaseDifficulty = "Medium" | "Medium-Hard";

export type CuratedCaseTopic = "Cardiology" | "Gastrointestinal";

export type CuratedCaseSlug = "chest-pain-workup" | "acute-abdominal-pain";

export type CuratedCase = {
  slug: CuratedCaseSlug;
  title: string;
  /** Single-sentence summary used in the case header. */
  oneLiner: string;
  /** Slightly longer pitch used on the homepage card. */
  description: string;
  difficulty: CuratedCaseDifficulty;
  estimatedMinutes: number;
  topic: CuratedCaseTopic;
  /** Fixed, public-facing URL for the case. */
  route: `/cases/${CuratedCaseSlug}`;
  /** Hint for the body model — wired in later when interactions land. */
  bodyFocus: "chest" | "abdomen";
};

export const CURATED_CASES: readonly CuratedCase[] = [
  {
    slug: "chest-pain-workup",
    title: "Chest Pain Workup",
    oneLiner:
      "A focused, high-yield chest pain encounter with a fixed patient and a deterministic challenge flow.",
    description:
      "Drill the structured workup of acute chest pain on a fixed patient. Same case, every run — built to be repeated until the pattern is automatic.",
    difficulty: "Medium",
    estimatedMinutes: 6,
    topic: "Cardiology",
    route: "/cases/chest-pain-workup",
    bodyFocus: "chest",
  },
  {
    slug: "acute-abdominal-pain",
    title: "Acute Abdominal Pain",
    oneLiner:
      "A curated abdominal pain scenario designed for structured reasoning and repeatable testing.",
    description:
      "A deterministic acute abdomen encounter. Practice the clean reasoning chain — history, focused exam, narrowed differential — under a fixed clock.",
    difficulty: "Medium-Hard",
    estimatedMinutes: 7,
    topic: "Gastrointestinal",
    route: "/cases/acute-abdominal-pain",
    bodyFocus: "abdomen",
  },
] as const;

export function getCuratedCase(slug: CuratedCaseSlug): CuratedCase {
  const found = CURATED_CASES.find((c) => c.slug === slug);
  if (!found) {
    throw new Error(`Unknown curated case slug: ${slug}`);
  }
  return found;
}
