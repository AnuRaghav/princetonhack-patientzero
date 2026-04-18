import { NextResponse } from "next/server";

import type { CaseListItem } from "@/lib/api/casesTypes";
import { diseaseOrClauseForBucket } from "@/lib/cases/bucketFilters";
import {
  chiefComplaintFromRow,
  countSymptomsInDatasetRow,
  difficultyFromSymptomCount,
  escapeIlikePattern,
  inferClinicalBucket,
  symptomPreviewFromRow,
} from "@/lib/cases/caseListUtils";
import { DATASET_CASE_SELECT } from "@/lib/cases/datasetCase";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Paginated case bank (dataset table can be huge — never load all rows in the client).
 *
 * Query: `page` (1-based), `limit` (max 100), `q` (search), `bucket` (specialty filter — ignored if `q` is set).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "25", 10) || 25));
    const q = (url.searchParams.get("q") || "").trim();
    const bucket = (url.searchParams.get("bucket") || "").trim();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = createAdminClient();

    let query = supabase.from("cases").select(DATASET_CASE_SELECT, { count: "exact" });

    if (q.length > 0) {
      const p = `%${escapeIlikePattern(q)}%`;
      const cols = ["Disease", ...Array.from({ length: 17 }, (_, i) => `Symptom_${i + 1}`)];
      const orClause = cols.map((c) => `${c}.ilike.${p}`).join(",");
      query = query.or(orClause);
    } else if (bucket.length > 0 && bucket !== "General medicine") {
      const orClause = diseaseOrClauseForBucket(bucket);
      if (orClause) query = query.or(orClause);
    }

    const { data, error, count } = await query.order("id", { ascending: true }).range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const total = count ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const cases: CaseListItem[] = (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      const disease = typeof r.Disease === "string" ? r.Disease : null;
      const title = disease?.trim() || `Case ${r.id}`;
      const n = countSymptomsInDatasetRow(r);
      const preview = symptomPreviewFromRow(r);
      return {
        id: String(r.id),
        title,
        symptomCount: n,
        difficulty: difficultyFromSymptomCount(n),
        bucket: inferClinicalBucket(disease, preview),
        chiefComplaintPreview: chiefComplaintFromRow(r),
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
