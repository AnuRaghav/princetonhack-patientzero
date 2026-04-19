import type { Metadata } from "next";

import { CuratedCaseShell } from "@/components/curated/CuratedCaseShell";
import { getCuratedCase } from "@/lib/curatedCases";
import mariaCases from "@/lib/Maria.json";

const curatedCase = getCuratedCase("maria-wolf");

const mariaOpening =
  Array.isArray(mariaCases) &&
  mariaCases[0] &&
  typeof mariaCases[0] === "object" &&
  mariaCases[0] !== null &&
  "opening_statement" in mariaCases[0]
    ? String((mariaCases[0] as { opening_statement: string }).opening_statement).trim()
    : undefined;

export const metadata: Metadata = {
  title: `${curatedCase.title} - Mystery case · Patient Zero`,
  description: curatedCase.oneLiner,
};

export default function MariaWolfPage() {
  return (
    <CuratedCaseShell
      curatedCase={curatedCase}
      initialPatientGreeting={mariaOpening}
    />
  );
}
