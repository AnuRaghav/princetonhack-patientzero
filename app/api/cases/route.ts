import { NextResponse } from "next/server";

import type { CaseListItem } from "@/lib/api/casesTypes";
import { listPatients } from "@/lib/synthea/queries";

/**
 * Paginated case bank backed by Synthea `patients`.
 *
 * Query: `page` (1-based), `limit` (max 100), `q` (search by FIRST/LAST/Id).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "25", 10) || 25));
    const q = (url.searchParams.get("q") || "").trim();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { patients, total } = await listPatients({ from, to, q });
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

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

    return NextResponse.json({
      cases,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to list cases";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
