import type { Metadata } from "next";

import { CuratedCaseShell } from "@/components/curated/CuratedCaseShell";
import { getCuratedCase } from "@/lib/curatedCases";

const curatedCase = getCuratedCase("chest-pain-workup");

export const metadata: Metadata = {
  title: `${curatedCase.title} — Curated case · Patient Zero`,
  description: curatedCase.oneLiner,
};

export default function ChestPainWorkupPage() {
  return <CuratedCaseShell curatedCase={curatedCase} />;
}
