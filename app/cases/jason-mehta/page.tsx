import type { Metadata } from "next";

import { CuratedCaseShell } from "@/components/curated/CuratedCaseShell";
import { getCuratedCase } from "@/lib/curatedCases";

const curatedCase = getCuratedCase("jason-mehta");

export const metadata: Metadata = {
  title: `${curatedCase.title} — Mystery case · Patient Zero`,
  description: curatedCase.oneLiner,
};

export default function JasonMehtaPage() {
  return <CuratedCaseShell curatedCase={curatedCase} />;
}
