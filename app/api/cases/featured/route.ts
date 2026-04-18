import { NextResponse } from "next/server";

import type { CaseListItem } from "@/lib/api/casesTypes";
import {
  chiefComplaintFromRow,
  countSymptomsInDatasetRow,
  difficultyFromSymptomCount,
  inferClinicalBucket,
  symptomPreviewFromRow,
} from "@/lib/cases/caseListUtils";
import { DATASET_CASE_SELECT } from "@/lib/cases/datasetCase";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Returns N (default 4) "featured" case summaries for the homepage.
 *
 * The dataset stores ~120 rows per Disease, so naive paging shows the same diagnosis four times.
 * This endpoint instead samples random offsets, then de-duplicates by Disease so every card on
 * the homepage is a different clinical problem.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(
      8,
      Math.max(1, Number.parseInt(url.searchParams.get("limit") || "4", 10) || 4),
    );

    const supabase = createAdminClient();

    const { count, error: countErr } = await supabase
      .from("cases")
      .select("*", { count: "exact", head: true });
    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 500 });
    }
    const total = count ?? 0;
    if (total === 0) {
      return NextResponse.json({ cases: [], total: 0 });
    }

    // Sample more offsets than we need so we can drop duplicates by Disease.
    const sampleSize = Math.min(total, limit * 6);
    const offsets = new Set<number>();
    while (offsets.size < sampleSize) {
      offsets.add(Math.floor(Math.random() * total));
    }

    const fetched = await Promise.all(
      Array.from(offsets).map(async (off) => {
        const { data, error } = await supabase
          .from("cases")
          .select(DATASET_CASE_SELECT)
          .order("id", { ascending: true })
          .range(off, off)
          .maybeSingle();
        if (error || !data) return null;
        return data as Record<string, unknown>;
      }),
    );

    const seenDiseases = new Set<string>();
    const cases: CaseListItem[] = [];
    for (const row of fetched) {
      if (!row) continue;
      const disease = typeof row.Disease === "string" ? row.Disease.trim() : "";
      const dedupeKey = disease.toLowerCase() || `__id_${row.id as string}`;
      if (seenDiseases.has(dedupeKey)) continue;
      seenDiseases.add(dedupeKey);

      const n = countSymptomsInDatasetRow(row);
      const preview = symptomPreviewFromRow(row);
      cases.push({
        id: String(row.id),
        title: disease || `Case ${row.id}`,
        symptomCount: n,
        difficulty: difficultyFromSymptomCount(n),
        bucket: inferClinicalBucket(disease, preview),
        chiefComplaintPreview: chiefComplaintFromRow(row),
      });
      if (cases.length >= limit) break;
    }

    return NextResponse.json({ cases, total });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load featured cases";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
