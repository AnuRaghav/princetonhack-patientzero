import type { Metadata } from "next";

import { CuratedCaseShell } from "@/components/curated/CuratedCaseShell";
import { getCuratedCase } from "@/lib/curatedCases";
import jasonCases from "@/lib/Jason.json";

const curatedCase = getCuratedCase("jason-mehta");

const jasonOpening =
  Array.isArray(jasonCases) &&
  jasonCases[0] &&
  typeof jasonCases[0] === "object" &&
  jasonCases[0] !== null &&
  "opening_statement" in jasonCases[0]
    ? String((jasonCases[0] as { opening_statement: string }).opening_statement).trim()
    : undefined;

export const metadata: Metadata = {
  title: `${curatedCase.title} - Mystery case · Patient Zero`,
  description: curatedCase.oneLiner,
};

export default function JasonMehtaPage() {
  return (
    <CuratedCaseShell
      curatedCase={curatedCase}
      initialPatientGreeting={jasonOpening}
    />
  );
}
