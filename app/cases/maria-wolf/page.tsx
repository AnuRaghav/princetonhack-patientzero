import type { Metadata } from "next";

import { CuratedCaseShell } from "@/components/curated/CuratedCaseShell";
import { getCuratedCase } from "@/lib/curatedCases";

const curatedCase = getCuratedCase("maria-wolf");

export const metadata: Metadata = {
  title: `${curatedCase.title} — Mystery case · Patient Zero`,
  description: curatedCase.oneLiner,
};

export default function MariaWolfPage() {
  const encounterPatientId = process.env.MARIA?.trim();

  return (
    <CuratedCaseShell
      curatedCase={curatedCase}
      encounterPatientId={encounterPatientId || undefined}
    />
  );
}
