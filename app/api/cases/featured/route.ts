import { NextResponse } from "next/server";

import type { CaseListItem } from "@/lib/api/casesTypes";
import { listPatients } from "@/lib/synthea/queries";

/**
 * Returns N (default 4) "featured" case summaries for the homepage.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(
      8,
      Math.max(1, Number.parseInt(url.searchParams.get("limit") || "4", 10) || 4),
    );

    // "Featured" just means first N patients for now (lightweight + deterministic).
    const { patients, total } = await listPatients({ from: 0, to: limit - 1 });
    const cases: CaseListItem[] = patients.map((p) => {
      const first = (p.FIRST ?? "").trim();
      const last = (p.LAST ?? "").trim();
      const title = `${first} ${last}`.trim() || `Patient ${p.Id}`;
      return {
        id: p.Id,
        title,
        symptomCount: 0,
        difficulty: "Easy",
        bucket: (p.GENDER ?? "Unknown").toString(),
        chiefComplaintPreview: (p.BIRTHDATE ?? "").toString(),
      };
    });

    return NextResponse.json({ cases, total });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load featured cases";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
